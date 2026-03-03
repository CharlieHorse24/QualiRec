export interface Meeting {
  title: string;
  time: string;
  attendees: string[];
  meetingId: string;
}

export interface BriefData {
  id: string;
  query: string;
  content: string;
  stakeholderName: string;
  timestamp: string;
}

export interface QualificationData {
  overall_score: number;
  score_rationale: string;
  company_overview: string;
  economic_buyer: string;
  decision_maker: string;
  metrics: string;
  economic_justification: string;
  decision_criteria: string;
  decision_process: string;
  identify_pain: string;
  champion: string;
  competition: string;
  timeline: string;
  next_steps: string[];
}

export interface ApiError {
  error: string;
  details?: string;
}
