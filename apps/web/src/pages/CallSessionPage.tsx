import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { QuestionPanel } from '@/components/call/QuestionPanel';
import { ProgressBar } from '@/components/call/ProgressBar';
import { FloatingNotes } from '@/components/call/FloatingNotes';
import { CrmSidebar } from '@/components/call/CrmSidebar';
import { LiveTranscription } from '@/components/call/LiveTranscription';
import { formatDuration } from '@/lib/utils';
import type { UserPreferences } from '@qualirec/shared';
import {
  Phone,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  PanelRightOpen,
  Wifi,
  Mic,
} from 'lucide-react';

export function CallSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    activeSession,
    sections,
    answers,
    currentQuestionIndex,
    callTimer,
    isTimerRunning,
    isLoading,
    loadSession,
    endSession,
    nextQuestion,
    prevQuestion,
    setCurrentQuestion,
    clearSession,
  } = useSessionStore();

  const [showNotes, setShowNotes] = useState(false);
  const [showCrm, setShowCrm] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const viewMode = ((user?.preferences as UserPreferences)?.callViewMode as string) || 'guided';

  useEffect(() => {
    if (id) {
      loadSession(id);
    }
    return () => clearSession();
  }, [id]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevQuestion();
      } else if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        setShowNotes((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextQuestion, prevQuestion]);

  const { updateAnswer } = useSessionStore();

  // When transcript analysis extracts answers, apply them to the session
  const handleAnalysisComplete = useCallback((result: {
    extractedAnswers: Array<{ questionId: string; responseValue: unknown; notes?: string; confidence: string }>;
    contactInfo: { name?: string; email?: string; phone?: string; company?: string };
  }) => {
    // Reload the session to pick up auto-applied answers from the backend
    if (id) loadSession(id);
  }, [id, loadSession]);

  const handleEndCall = async () => {
    setIsEnding(true);
    await endSession();
    setShowEndDialog(false);
    setIsEnding(false);
    navigate(`/sessions/${id}`);
  };

  const allQuestions = sections.flatMap((s) => s.questions);
  const answeredCount = Object.values(answers).filter((a) => a.status === 'ANSWERED').length;
  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];

  // Find which section the current question belongs to
  let currentSectionTitle = '';
  let questionInSectionIndex = 0;
  let questionsInSection = 0;
  let accumulatedIndex = 0;
  for (const section of sections) {
    if (currentQuestionIndex < accumulatedIndex + section.questions.length) {
      currentSectionTitle = section.title;
      questionInSectionIndex = currentQuestionIndex - accumulatedIndex;
      questionsInSection = section.questions.length;
      break;
    }
    accumulatedIndex += section.questions.length;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Session not found</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8">
      {/* Call Status Banner */}
      <div className="bg-navy-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isTimerRunning ? (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft" />
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            )}
            <span className="text-sm font-medium">
              {isTimerRunning ? 'On Call' : 'Call Ended'}
            </span>
          </div>
          <Badge variant="info" className="bg-navy-800 text-brand-400 border border-navy-700">
            <Wifi className="w-3 h-3 mr-1" />
            {activeSession.voipAdapter === 'manual' ? 'Manual Mode' : activeSession.voipAdapter}
          </Badge>
          {activeSession.contactName && (
            <span className="text-sm text-navy-300">
              {activeSession.contactType === 'CANDIDATE' ? 'Candidate' : 'Client'}: {activeSession.contactName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-lg font-semibold tabular-nums text-brand-400">
            {formatDuration(callTimer)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className={`p-2 rounded-md hover:bg-navy-800 transition-colors ${showTranscript ? 'bg-navy-800' : ''}`}
              title="Toggle Transcript"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="p-2 rounded-md hover:bg-navy-800 transition-colors"
              title="Toggle Notes (Ctrl+N)"
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCrm((v) => !v)}
              className="p-2 rounded-md hover:bg-navy-800 transition-colors"
              title="Toggle CRM Sidebar"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          </div>
          {isTimerRunning && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowEndDialog(true)}
            >
              <PhoneOff className="w-4 h-4 mr-1" />
              End Call
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        sections={sections}
        answers={answers}
        currentIndex={currentQuestionIndex}
        onSelectQuestion={setCurrentQuestion}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 overflow-y-auto">
          {/* Live Transcription */}
          {showTranscript && isTimerRunning && (
            <div className="max-w-3xl mx-auto px-8 pt-4">
              <LiveTranscription
                sessionId={activeSession.id}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </div>
          )}

          {viewMode === 'guided' && currentQuestion ? (
            <div className="max-w-3xl mx-auto p-8">
              {/* Section Header */}
              <div className="mb-6">
                <p className="text-sm text-brand-600 font-medium">{currentSectionTitle}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Question {questionInSectionIndex + 1} of {questionsInSection}
                </p>
              </div>

              <QuestionPanel
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                sessionId={activeSession.id}
                isActive={isTimerRunning}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="ghost"
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-400">
                  {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                <Button
                  variant="ghost"
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            /* Scroll Mode */
            <div className="max-w-3xl mx-auto p-8 space-y-8">
              {sections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-semibold text-navy-900 mb-4 pb-2 border-b">
                    {section.title}
                  </h3>
                  <div className="space-y-6">
                    {section.questions.map((question) => (
                      <QuestionPanel
                        key={question.id}
                        question={question}
                        answer={answers[question.id]}
                        sessionId={activeSession.id}
                        isActive={isTimerRunning}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Notes Panel */}
        {showNotes && (
          <FloatingNotes
            onClose={() => setShowNotes(false)}
          />
        )}

        {/* CRM Sidebar */}
        {showCrm && (
          <CrmSidebar
            session={activeSession}
            onClose={() => setShowCrm(false)}
          />
        )}
      </div>

      {/* End Call Dialog */}
      <Modal
        isOpen={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        title="End Call Session"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to end this call session?
          </p>
          <div className="bg-gray-50 rounded-md p-3 text-sm">
            <p><strong>Questions answered:</strong> {answeredCount} / {totalQuestions}</p>
            <p><strong>Duration:</strong> {formatDuration(callTimer)}</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowEndDialog(false)}>
              Continue Call
            </Button>
            <Button variant="danger" onClick={handleEndCall} loading={isEnding}>
              End Call
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
