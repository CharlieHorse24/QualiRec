import { create } from 'zustand';
import type {
  CallSession,
  SessionAnswer,
  TemplateSection,
  CallSessionSummary,
  AnswerStatus,
} from '@qualirec/shared';
import { api } from '../lib/api';

interface SessionState {
  activeSession: CallSession | null;
  sections: TemplateSection[];
  answers: Record<string, SessionAnswer>;
  currentQuestionIndex: number;
  floatingNotes: string;
  callTimer: number;
  isTimerRunning: boolean;
  timerInterval: ReturnType<typeof setInterval> | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  startSession: (data: {
    templateId: string;
    contactType: 'CANDIDATE' | 'CLIENT';
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    crmContactId?: string;
    voipAdapter?: string;
  }) => Promise<string | null>;
  loadSession: (id: string) => Promise<void>;
  updateAnswer: (questionId: string, value: unknown, notes?: string, status?: AnswerStatus) => Promise<void>;
  setCurrentQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  updateFloatingNotes: (notes: string) => void;
  saveFloatingNotes: () => Promise<void>;
  endSession: () => Promise<void>;
  startTimer: () => void;
  stopTimer: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  sections: [],
  answers: {},
  currentQuestionIndex: 0,
  floatingNotes: '',
  callTimer: 0,
  isTimerRunning: false,
  timerInterval: null,
  isLoading: false,
  isSaving: false,
  error: null,

  startSession: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.createSession({
        ...data,
        voipAdapter: data.voipAdapter || 'manual',
      });
      if (response.success && response.data) {
        const session = response.data;
        const sections = (session.template?.sections || []) as unknown as TemplateSection[];
        const answerMap: Record<string, SessionAnswer> = {};
        (session.answers || []).forEach((a) => {
          answerMap[a.questionId] = a;
        });

        set({
          activeSession: session,
          sections,
          answers: answerMap,
          currentQuestionIndex: 0,
          floatingNotes: session.floatingNotes || '',
          callTimer: 0,
          isLoading: false,
        });

        get().startTimer();
        return session.id;
      }
      return null;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      return null;
    }
  },

  loadSession: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getSession(id);
      if (response.success && response.data) {
        const session = response.data;
        const sections = ((session as Record<string, unknown>).templateSnapshot || session.template?.sections || []) as unknown as TemplateSection[];
        const answerMap: Record<string, SessionAnswer> = {};
        (session.answers || []).forEach((a) => {
          answerMap[a.questionId] = a;
        });

        const elapsed = session.startedAt && session.status === 'IN_PROGRESS'
          ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
          : session.duration || 0;

        set({
          activeSession: session,
          sections,
          answers: answerMap,
          currentQuestionIndex: 0,
          floatingNotes: session.floatingNotes || '',
          callTimer: elapsed,
          isLoading: false,
        });

        if (session.status === 'IN_PROGRESS') {
          get().startTimer();
        }
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  updateAnswer: async (questionId, value, notes, status) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const answer: SessionAnswer = {
      id: '',
      sessionId: activeSession.id,
      questionId,
      responseValue: value as SessionAnswer['responseValue'],
      notes,
      status: status || 'ANSWERED',
      answeredAt: new Date().toISOString(),
    };

    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    }));

    // Save to backend (non-blocking)
    try {
      await api.updateAnswer(activeSession.id, {
        questionId,
        responseValue: value as SessionAnswer['responseValue'],
        notes,
        status: status || 'ANSWERED',
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
      // Keep local state - will sync later (offline support)
    }
  },

  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),

  nextQuestion: () => {
    const { currentQuestionIndex, sections } = get();
    const allQuestions = sections.flatMap((s) => s.questions);
    if (currentQuestionIndex < allQuestions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  updateFloatingNotes: (notes) => set({ floatingNotes: notes }),

  saveFloatingNotes: async () => {
    const { activeSession, floatingNotes } = get();
    if (!activeSession) return;
    try {
      await api.updateFloatingNotes(activeSession.id, floatingNotes);
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  },

  endSession: async () => {
    const { activeSession, floatingNotes } = get();
    if (!activeSession) return;

    get().stopTimer();
    set({ isSaving: true });

    try {
      const response = await api.endSession(activeSession.id, { floatingNotes });
      if (response.success && response.data) {
        set({ activeSession: response.data, isSaving: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false });
    }
  },

  startTimer: () => {
    const existing = get().timerInterval;
    if (existing) clearInterval(existing);

    const interval = setInterval(() => {
      set((state) => ({ callTimer: state.callTimer + 1 }));
    }, 1000);

    set({ timerInterval: interval, isTimerRunning: true });
  },

  stopTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) clearInterval(timerInterval);
    set({ timerInterval: null, isTimerRunning: false });
  },

  clearSession: () => {
    get().stopTimer();
    set({
      activeSession: null,
      sections: [],
      answers: {},
      currentQuestionIndex: 0,
      floatingNotes: '',
      callTimer: 0,
      error: null,
    });
  },
}));
