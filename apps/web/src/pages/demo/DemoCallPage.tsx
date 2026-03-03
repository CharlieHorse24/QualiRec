import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoStore } from '@/store/demoStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DemoVoipRinging } from '@/components/demo/DemoVoipRinging';
import { DemoVoipBanner } from '@/components/demo/DemoVoipBanner';
import { DemoQuestionPanel } from '@/components/demo/DemoQuestionPanel';
import { DemoCrmSidebar } from '@/components/demo/DemoCrmSidebar';
import { DemoFloatingNotes } from '@/components/demo/DemoFloatingNotes';
import { ProgressBar } from '@/components/call/ProgressBar';
import { formatDuration } from '@/lib/utils';
import {
  Phone,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  PanelRightOpen,
  Wifi,
  RotateCcw,
  Eye,
} from 'lucide-react';

export function DemoCallPage() {
  const navigate = useNavigate();
  const {
    phase,
    scenario,
    voipState,
    sections,
    answers,
    currentQuestionIndex,
    callTimer,
    isTimerRunning,
    nextQuestion,
    prevQuestion,
    setCurrentQuestion,
    endCall,
    resetDemo,
  } = useDemoStore();

  const [showNotes, setShowNotes] = useState(false);
  const [showCrm, setShowCrm] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'guided' | 'scroll'>('guided');

  // Redirect to landing if no scenario selected
  useEffect(() => {
    if (!scenario) {
      navigate('/demo');
    }
  }, [scenario, navigate]);

  // Navigate to summary when phase changes
  useEffect(() => {
    if (phase === 'summary') {
      navigate('/demo/summary');
    }
  }, [phase, navigate]);

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

  if (!scenario) return null;

  // Show ringing screen
  if (voipState === 'ringing' || voipState === 'connecting') {
    return <DemoVoipRinging />;
  }

  const handleEndCall = () => {
    setShowEndDialog(false);
    endCall();
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-brand-600 text-white px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4" />
          <span className="font-medium">Demo Mode</span>
          <span className="text-brand-200">— {scenario.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'guided' ? 'scroll' : 'guided')}
            className="text-xs px-2 py-1 rounded bg-brand-700 hover:bg-brand-800 transition-colors"
          >
            {viewMode === 'guided' ? 'Switch to Scroll View' : 'Switch to Guided View'}
          </button>
          <button
            onClick={() => {
              resetDemo();
              navigate('/demo');
            }}
            className="text-xs px-2 py-1 rounded bg-brand-700 hover:bg-brand-800 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Restart Demo
          </button>
        </div>
      </div>

      {/* VOIP Status Banner */}
      <DemoVoipBanner />

      {/* Call Status Banner */}
      <div className="bg-navy-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isTimerRunning ? (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            )}
            <span className="text-sm font-medium">
              {isTimerRunning ? 'On Call' : 'Call Ended'}
            </span>
          </div>
          <Badge variant="info" className="bg-navy-800 text-brand-400 border border-navy-700">
            <Wifi className="w-3 h-3 mr-1" />
            {scenario.voipDisplayName}
          </Badge>
          <span className="text-sm text-navy-300">
            {scenario.contactType === 'CANDIDATE' ? 'Candidate' : 'Client'}: {scenario.contact.firstName} {scenario.contact.lastName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-lg font-semibold tabular-nums text-brand-400">
            {formatDuration(callTimer)}
          </div>
          <div className="flex items-center gap-2">
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
          {viewMode === 'guided' && currentQuestion ? (
            <div className="max-w-3xl mx-auto p-8">
              {/* Section Header */}
              <div className="mb-6">
                <p className="text-sm text-brand-600 font-medium">{currentSectionTitle}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Question {questionInSectionIndex + 1} of {questionsInSection}
                </p>
              </div>

              <DemoQuestionPanel
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
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
                      <DemoQuestionPanel
                        key={question.id}
                        question={question}
                        answer={answers[question.id]}
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
          <DemoFloatingNotes onClose={() => setShowNotes(false)} />
        )}

        {/* CRM Sidebar */}
        {showCrm && (
          <DemoCrmSidebar onClose={() => setShowCrm(false)} />
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
            <Button variant="danger" onClick={handleEndCall}>
              End Call
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
