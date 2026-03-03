import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import {
  Mic,
  MicOff,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

interface TranscriptChunk {
  text: string;
  timestamp: string;
  speaker?: string;
  isFinal: boolean;
}

interface LiveTranscriptionProps {
  sessionId: string;
  onTranscriptUpdate?: (fullText: string) => void;
  onAnalysisComplete?: (result: {
    extractedAnswers: Array<{ questionId: string; responseValue: unknown; notes?: string; confidence: string }>;
    contactInfo: { name?: string; email?: string; phone?: string; company?: string };
  }) => void;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function LiveTranscription({ sessionId, onTranscriptUpdate, onAnalysisComplete }: LiveTranscriptionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chunksRef = useRef<TranscriptChunk[]>([]);
  const isListeningRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chunks, interimText]);

  const saveChunksToServer = useCallback(async (newChunks: TranscriptChunk[]) => {
    const finalChunks = newChunks.filter((c) => c.isFinal);
    if (finalChunks.length === 0) return;

    try {
      await api.saveTranscriptChunks(sessionId, finalChunks);
    } catch (err) {
      console.error('Failed to save transcript:', err);
    }
  }, [sessionId]);

  // Debounced save to server
  const scheduleSave = useCallback((newChunks: TranscriptChunk[]) => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveChunksToServer(newChunks);
    }, 3000);
    setSaveTimer(timer);
  }, [saveTimer, saveChunksToServer]);

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      const newFinalChunks: TranscriptChunk[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          const chunk: TranscriptChunk = {
            text: transcript.trim(),
            timestamp: new Date().toISOString(),
            isFinal: true,
          };
          newFinalChunks.push(chunk);
        } else {
          interim += transcript;
        }
      }

      if (newFinalChunks.length > 0) {
        setChunks((prev) => {
          const updated = [...prev, ...newFinalChunks];
          // Build full text for callback
          const fullText = updated.map((c) => c.text).join(' ');
          onTranscriptUpdate?.(fullText);
          scheduleSave(newFinalChunks);
          return updated;
        });
      }

      setInterimText(interim);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsSupported(false);
      }
      // Don't stop on 'no-speech' — just keep going
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  }

  function stopListening() {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Final save
    const finalChunks = chunksRef.current.filter((c) => c.isFinal);
    if (finalChunks.length > 0) {
      saveChunksToServer(finalChunks);
    }
  }

  async function handleAnalyzeTranscript() {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Ensure all chunks are saved first
      const finalChunks = chunks.filter((c) => c.isFinal);
      if (finalChunks.length > 0) {
        await api.saveTranscriptChunks(sessionId, finalChunks);
      }

      const res = await api.analyzeTranscript(sessionId);
      if (res.success && res.data) {
        const count = res.data.extractedAnswers.length;
        setAnalysisResult(`Extracted ${count} answer${count !== 1 ? 's' : ''} from transcript`);
        onAnalysisComplete?.(res.data);
      }
    } catch (err) {
      console.error('Transcript analysis failed:', err);
      setAnalysisResult('Analysis failed — check if ANTHROPIC_API_KEY is set');
    }

    setIsAnalyzing(false);
  }

  const fullTranscriptText = chunks.map((c) => c.text).join(' ');
  const wordCount = fullTranscriptText.split(/\s+/).filter(Boolean).length;

  if (!isSupported) {
    return (
      <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-2 text-yellow-700 text-sm">
          <MicOff className="w-4 h-4" />
          <span>
            Speech recognition not available. Use Chrome for live transcription, or enter answers manually.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-200"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-navy-900">Live Transcript</span>
          </div>
          {isListening && (
            <Badge variant="danger" className="animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-1" />
              Recording
            </Badge>
          )}
          {wordCount > 0 && (
            <span className="text-xs text-gray-400">{wordCount} words</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {chunks.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAnalyzeTranscript}
              loading={isAnalyzing}
              disabled={isAnalyzing}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Extract Answers
            </Button>
          )}
          <Button
            size="sm"
            variant={isListening ? 'danger' : 'primary'}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? (
              <>
                <MicOff className="w-3 h-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 mr-1" />
                Start Transcribing
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Transcript Body */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto p-4">
          {chunks.length === 0 && !interimText ? (
            <div className="text-center py-6">
              <Mic className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {isListening
                  ? 'Listening... Start speaking to see the transcript'
                  : 'Click "Start Transcribing" to begin recording the call'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Works with any audio source — Dialpad, Google Meet, phone speaker, etc.
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed">
              {chunks.map((chunk, i) => (
                <span key={i}>
                  {chunk.text}{' '}
                </span>
              ))}
              {interimText && (
                <span className="text-gray-400 italic">{interimText}</span>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <div className="px-4 py-2 bg-brand-50 border-t text-sm text-brand-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {analysisResult}
        </div>
      )}
    </div>
  );
}
