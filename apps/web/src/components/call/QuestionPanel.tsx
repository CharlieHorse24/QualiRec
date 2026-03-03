import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { TemplateQuestion, SessionAnswer, AnswerStatus } from '@qualirec/shared';
import { Flag, SkipForward, Check, HelpCircle } from 'lucide-react';

interface QuestionPanelProps {
  question: TemplateQuestion;
  answer?: SessionAnswer;
  sessionId: string;
  isActive: boolean;
  compact?: boolean;
}

export function QuestionPanel({ question, answer, sessionId, isActive, compact }: QuestionPanelProps) {
  const { updateAnswer } = useSessionStore();
  const [textValue, setTextValue] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (answer) {
      setTextValue(answer.responseValue != null ? String(answer.responseValue) : '');
      setNotes(answer.notes || '');
    } else {
      setTextValue('');
      setNotes('');
    }
  }, [answer, question.id]);

  useEffect(() => {
    if (!compact && inputRef.current) {
      inputRef.current.focus();
    }
  }, [question.id, compact]);

  const saveAnswer = (value: unknown, status: AnswerStatus = 'ANSWERED') => {
    updateAnswer(question.id, value, notes, status);
  };

  const handleTextBlur = () => {
    if (textValue.trim()) {
      saveAnswer(textValue);
    }
  };

  const handleSkip = () => {
    updateAnswer(question.id, null, notes, 'SKIPPED');
  };

  const handleFlag = () => {
    updateAnswer(question.id, answer?.responseValue ?? textValue || null, notes, 'FLAGGED');
  };

  const statusColor = answer?.status === 'ANSWERED' ? 'border-green-300' :
    answer?.status === 'FLAGGED' ? 'border-amber-300' :
    answer?.status === 'SKIPPED' ? 'border-gray-300' : 'border-transparent';

  return (
    <div className={cn(
      'rounded-lg border-2 transition-all duration-200',
      compact ? 'p-4' : 'p-6',
      statusColor,
      !compact && 'animate-slide-in-up',
    )}>
      {/* Question Text */}
      <div className="mb-4">
        <div className="flex items-start gap-2">
          <p className={cn('font-medium text-navy-900', compact ? 'text-sm' : 'text-lg')}>
            {question.text}
          </p>
          {question.required && (
            <span className="text-red-500 text-sm">*</span>
          )}
        </div>
        {question.hint && (
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            {question.hint}
          </p>
        )}
      </div>

      {/* Response Input */}
      <div className="mb-3">
        {question.responseType === 'FREE_TEXT' && (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextBlur}
            className="input-field min-h-[80px] resize-y"
            placeholder="Type your answer..."
            disabled={!isActive}
          />
        )}

        {question.responseType === 'NUMERIC' && (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextBlur}
            className="input-field max-w-xs"
            placeholder="Enter a number"
            disabled={!isActive}
          />
        )}

        {question.responseType === 'DATE' && (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={textValue}
            onChange={(e) => {
              setTextValue(e.target.value);
              saveAnswer(e.target.value);
            }}
            className="input-field max-w-xs"
            disabled={!isActive}
          />
        )}

        {question.responseType === 'YES_NO' && (
          <div className="flex gap-3">
            {['Yes', 'No'].map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setTextValue(opt);
                  saveAnswer(opt);
                }}
                disabled={!isActive}
                className={cn(
                  'px-6 py-2 rounded-md border-2 text-sm font-medium transition-all',
                  textValue === opt
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.responseType === 'SINGLE_SELECT' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setTextValue(opt);
                  saveAnswer(opt);
                }}
                disabled={!isActive}
                className={cn(
                  'px-4 py-2 rounded-full border text-sm font-medium transition-all',
                  textValue === opt
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.responseType === 'MULTI_SELECT' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => {
              const selected = textValue ? textValue.split(',').includes(opt) : false;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const current = textValue ? textValue.split(',').filter(Boolean) : [];
                    const next = selected
                      ? current.filter((v) => v !== opt)
                      : [...current, opt];
                    const newValue = next.join(',');
                    setTextValue(newValue);
                    saveAnswer(next);
                  }}
                  disabled={!isActive}
                  className={cn(
                    'px-4 py-2 rounded-full border text-sm font-medium transition-all',
                    selected
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600',
                  )}
                >
                  {selected && <Check className="w-3 h-3 inline mr-1" />}
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes & Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <StickyNote className="w-3 h-3" />
          {showNotes ? 'Hide notes' : 'Add note'}
        </button>

        {isActive && (
          <>
            <button
              onClick={handleSkip}
              className={cn(
                'text-xs flex items-center gap-1 ml-auto',
                answer?.status === 'SKIPPED' ? 'text-gray-700 font-medium' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <SkipForward className="w-3 h-3" />
              Skip
            </button>
            <button
              onClick={handleFlag}
              className={cn(
                'text-xs flex items-center gap-1',
                answer?.status === 'FLAGGED' ? 'text-amber-600 font-medium' : 'text-gray-400 hover:text-amber-600',
              )}
            >
              <Flag className="w-3 h-3" />
              Flag
            </button>
          </>
        )}

        {answer?.status === 'ANSWERED' && (
          <span className="text-xs text-green-600 flex items-center gap-1 ml-auto">
            <Check className="w-3 h-3" />
            Answered
          </span>
        )}
      </div>

      {/* Notes Area */}
      {showNotes && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (answer?.responseValue != null || textValue) {
              saveAnswer(answer?.responseValue ?? textValue, answer?.status || 'ANSWERED');
            }
          }}
          className="input-field mt-3 min-h-[60px] resize-y text-sm"
          placeholder="Add notes about this question..."
          disabled={!isActive}
        />
      )}
    </div>
  );
}
