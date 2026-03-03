import { cn } from '@/lib/utils';
import type { TemplateSection, SessionAnswer } from '@qualirec/shared';

interface ProgressBarProps {
  sections: TemplateSection[];
  answers: Record<string, SessionAnswer>;
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
}

export function ProgressBar({ sections, answers, currentIndex, onSelectQuestion }: ProgressBarProps) {
  let globalIndex = 0;

  return (
    <div className="bg-white border-b px-6 py-2 shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {sections.map((section, si) => (
          <div key={section.id} className="flex items-center gap-1">
            {si > 0 && (
              <div className="w-px h-4 bg-gray-200 mx-1" />
            )}
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mr-1 whitespace-nowrap">
              {section.title}
            </span>
            {section.questions.map((question) => {
              const idx = globalIndex++;
              const answer = answers[question.id];
              const isCurrent = idx === currentIndex;
              const isAnswered = answer?.status === 'ANSWERED';
              const isFlagged = answer?.status === 'FLAGGED';
              const isSkipped = answer?.status === 'SKIPPED';

              return (
                <button
                  key={question.id}
                  onClick={() => onSelectQuestion(idx)}
                  className={cn(
                    'w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center transition-all',
                    isCurrent && 'ring-2 ring-teal-500 ring-offset-1',
                    isAnswered && 'bg-green-100 text-green-700',
                    isFlagged && 'bg-amber-100 text-amber-700',
                    isSkipped && 'bg-gray-100 text-gray-500',
                    !isAnswered && !isFlagged && !isSkipped && 'bg-gray-50 text-gray-400',
                  )}
                  title={question.text}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
