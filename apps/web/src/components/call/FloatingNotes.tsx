import { useSessionStore } from '@/store/sessionStore';
import { X, StickyNote } from 'lucide-react';

interface FloatingNotesProps {
  onClose: () => void;
}

export function FloatingNotes({ onClose }: FloatingNotesProps) {
  const { floatingNotes, updateFloatingNotes, saveFloatingNotes } = useSessionStore();

  return (
    <div className="w-80 border-l bg-amber-50/50 flex flex-col animate-slide-in-right shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-navy-900">Floating Notes</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="flex-1 p-4">
        <textarea
          value={floatingNotes}
          onChange={(e) => updateFloatingNotes(e.target.value)}
          onBlur={() => saveFloatingNotes()}
          className="w-full h-full resize-none border-none bg-transparent text-sm text-navy-800 placeholder-gray-400 focus:outline-none"
          placeholder="Type unstructured notes here... These aren't tied to any specific question."
        />
      </div>
    </div>
  );
}
