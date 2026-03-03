import { create } from 'zustand';
import type { TemplateSection, SessionAnswer, AnswerStatus } from '@qualirec/shared';
import type { DemoScenario, DemoContact, CrmFieldMapping } from '../demo/demoData';
import {
  DEMO_SCENARIOS,
  DEMO_CANDIDATE_SUMMARY,
  DEMO_CLIENT_SUMMARY,
  DEMO_CANDIDATE_FIELD_MAPPINGS,
  DEMO_CLIENT_FIELD_MAPPINGS,
} from '../demo/demoData';

// ─── VOIP Simulation States ──────────────────────────────────────────────────

export type VoipState =
  | 'idle'        // No call
  | 'ringing'     // Incoming call ringing
  | 'connecting'  // Call being answered
  | 'connected'   // Active call
  | 'ended';      // Call ended

export type DemoPhase =
  | 'landing'     // Scenario selection
  | 'ringing'     // VOIP incoming call screen
  | 'call'        // Active call session
  | 'ending'      // End call transition
  | 'summary'     // Post-call summary + CRM sync
  | 'complete';   // Demo finished

// ─── Demo Store ──────────────────────────────────────────────────────────────

interface DemoState {
  // Phase management
  phase: DemoPhase;
  scenario: DemoScenario | null;

  // VOIP simulation
  voipState: VoipState;
  callTimer: number;
  isTimerRunning: boolean;
  timerInterval: ReturnType<typeof setInterval> | null;
  callQuality: 'excellent' | 'good' | 'fair';
  voipEvents: VoipEvent[];

  // Call session
  sections: TemplateSection[];
  answers: Record<string, SessionAnswer>;
  currentQuestionIndex: number;
  floatingNotes: string;

  // CRM simulation
  crmSyncStatus: 'idle' | 'syncing' | 'success' | 'failed';
  crmSyncProgress: number;
  fieldMappings: CrmFieldMapping[];

  // Summary
  summary: { narrative: string; highlights: string[]; nextActions: string[] } | null;

  // Actions
  selectScenario: (scenarioId: string) => void;
  answerIncomingCall: () => void;
  updateAnswer: (questionId: string, value: unknown, notes?: string, status?: AnswerStatus) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setCurrentQuestion: (index: number) => void;
  updateFloatingNotes: (notes: string) => void;
  endCall: () => void;
  generateSummary: () => void;
  startCrmSync: () => void;
  resetDemo: () => void;
  startTimer: () => void;
  stopTimer: () => void;
}

export interface VoipEvent {
  timestamp: Date;
  type: 'incoming' | 'answered' | 'participant_join' | 'quality_change' | 'ended';
  message: string;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  // Initial state
  phase: 'landing',
  scenario: null,
  voipState: 'idle',
  callTimer: 0,
  isTimerRunning: false,
  timerInterval: null,
  callQuality: 'excellent',
  voipEvents: [],
  sections: [],
  answers: {},
  currentQuestionIndex: 0,
  floatingNotes: '',
  crmSyncStatus: 'idle',
  crmSyncProgress: 0,
  fieldMappings: [],
  summary: null,

  selectScenario: (scenarioId) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;

    set({
      scenario,
      phase: 'ringing',
      voipState: 'ringing',
      sections: scenario.template.sections,
      answers: {},
      currentQuestionIndex: 0,
      floatingNotes: '',
      callTimer: 0,
      crmSyncStatus: 'idle',
      crmSyncProgress: 0,
      summary: null,
      fieldMappings:
        scenario.contactType === 'CANDIDATE'
          ? DEMO_CANDIDATE_FIELD_MAPPINGS
          : DEMO_CLIENT_FIELD_MAPPINGS,
      voipEvents: [
        {
          timestamp: new Date(),
          type: 'incoming',
          message: `Incoming call from ${scenario.contact.firstName} ${scenario.contact.lastName} via ${scenario.voipDisplayName}`,
        },
      ],
    });
  },

  answerIncomingCall: () => {
    const { scenario } = get();
    if (!scenario) return;

    set({
      voipState: 'connecting',
      voipEvents: [
        ...get().voipEvents,
        { timestamp: new Date(), type: 'answered', message: 'Call answered' },
      ],
    });

    // Simulate connection delay
    setTimeout(() => {
      set({
        voipState: 'connected',
        phase: 'call',
        voipEvents: [
          ...get().voipEvents,
          {
            timestamp: new Date(),
            type: 'participant_join',
            message: `${scenario.contact.firstName} ${scenario.contact.lastName} connected`,
          },
        ],
      });
      get().startTimer();

      // Simulate call quality fluctuation after 45 seconds
      setTimeout(() => {
        if (get().voipState === 'connected') {
          set({
            callQuality: 'good',
            voipEvents: [
              ...get().voipEvents,
              { timestamp: new Date(), type: 'quality_change', message: 'Call quality changed: Good' },
            ],
          });

          // Return to excellent after 10 more seconds
          setTimeout(() => {
            if (get().voipState === 'connected') {
              set({
                callQuality: 'excellent',
                voipEvents: [
                  ...get().voipEvents,
                  { timestamp: new Date(), type: 'quality_change', message: 'Call quality changed: Excellent' },
                ],
              });
            }
          }, 10000);
        }
      }, 45000);
    }, 1500);
  },

  updateAnswer: (questionId, value, notes, status) => {
    const answer: SessionAnswer = {
      id: `demo-${questionId}`,
      sessionId: 'demo-session',
      questionId,
      responseValue: value as SessionAnswer['responseValue'],
      notes,
      status: status || 'ANSWERED',
      answeredAt: new Date().toISOString(),
    };

    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    }));
  },

  nextQuestion: () => {
    const { currentQuestionIndex, sections } = get();
    const totalQuestions = sections.flatMap((s) => s.questions).length;
    if (currentQuestionIndex < totalQuestions - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),

  updateFloatingNotes: (notes) => set({ floatingNotes: notes }),

  endCall: () => {
    const { scenario } = get();
    get().stopTimer();
    set({
      voipState: 'ended',
      phase: 'ending',
      voipEvents: [
        ...get().voipEvents,
        { timestamp: new Date(), type: 'ended', message: 'Call ended' },
      ],
    });

    // Transition to summary after a short delay
    setTimeout(() => {
      set({ phase: 'summary' });
    }, 1200);
  },

  generateSummary: () => {
    const { scenario } = get();
    if (!scenario) return;

    const summaryData =
      scenario.contactType === 'CANDIDATE'
        ? DEMO_CANDIDATE_SUMMARY
        : DEMO_CLIENT_SUMMARY;

    // Simulate AI generation with a typing effect delay
    set({ summary: null });

    setTimeout(() => {
      set({ summary: summaryData });
    }, 2500);
  },

  startCrmSync: () => {
    set({ crmSyncStatus: 'syncing', crmSyncProgress: 0 });

    // Simulate sync progress
    const steps = [10, 25, 45, 60, 78, 90, 100];
    steps.forEach((progress, i) => {
      setTimeout(() => {
        set({ crmSyncProgress: progress });
        if (progress === 100) {
          setTimeout(() => {
            set({ crmSyncStatus: 'success' });
          }, 500);
        }
      }, (i + 1) * 600);
    });
  },

  resetDemo: () => {
    get().stopTimer();
    set({
      phase: 'landing',
      scenario: null,
      voipState: 'idle',
      callTimer: 0,
      isTimerRunning: false,
      callQuality: 'excellent',
      voipEvents: [],
      sections: [],
      answers: {},
      currentQuestionIndex: 0,
      floatingNotes: '',
      crmSyncStatus: 'idle',
      crmSyncProgress: 0,
      fieldMappings: [],
      summary: null,
    });
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
}));
