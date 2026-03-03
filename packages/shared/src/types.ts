// ===== User & Auth =====
export type UserRole = 'ADMIN' | 'RECRUITER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferences: UserPreferences;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  callViewMode: 'guided' | 'scroll';
  defaultCandidateTemplateId?: string;
  defaultClientTemplateId?: string;
  preferredVoipAdapter?: string;
  theme?: 'light' | 'dark';
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ===== Templates =====
export type TemplateType = 'CANDIDATE' | 'CLIENT' | 'CUSTOM';

export type ResponseType = 'FREE_TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'NUMERIC' | 'DATE' | 'YES_NO';

export interface TemplateQuestion {
  id: string;
  text: string;
  hint?: string;
  responseType: ResponseType;
  options?: string[];
  required: boolean;
  flagForCRM: boolean;
  crmFieldMapping?: string;
  order: number;
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  questions: TemplateQuestion[];
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  sections: TemplateSection[];
  version: number;
  isDefault: boolean;
  isArchived: boolean;
  isDraft: boolean;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  type: TemplateType;
  description: string;
  sections: Omit<TemplateSection, 'id'>[];
  isDefault?: boolean;
  isDraft?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  sections?: TemplateSection[];
  isDefault?: boolean;
  isDraft?: boolean;
  isArchived?: boolean;
}

// ===== Call Sessions =====
export type ContactType = 'CANDIDATE' | 'CLIENT';

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_SYNC' | 'SYNCED' | 'SYNC_FAILED';

export type CrmSyncStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type AnswerStatus = 'ANSWERED' | 'SKIPPED' | 'FLAGGED';

export interface SessionAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  responseValue: string | string[] | number | boolean | null;
  notes?: string;
  status: AnswerStatus;
  answeredAt?: string;
}

export interface CallSessionSummary {
  narrative: string;
  highlights: string[];
  nextActions: string[];
  generatedAt: string;
  editedAt?: string;
  wasEdited: boolean;
}

export interface CallSession {
  id: string;
  recruiterId: string;
  recruiter?: User;
  templateId: string;
  templateVersion: number;
  template?: Template;
  contactType: ContactType;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  crmContactId?: string;
  voipAdapter: string;
  voipCallId?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  status: SessionStatus;
  answers: SessionAnswer[];
  floatingNotes?: string;
  summary?: CallSessionSummary;
  crmSyncStatus: CrmSyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  templateId: string;
  contactType: ContactType;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  crmContactId?: string;
  voipAdapter: string;
  voipCallId?: string;
}

export interface UpdateAnswerRequest {
  questionId: string;
  responseValue: string | string[] | number | boolean | null;
  notes?: string;
  status: AnswerStatus;
}

export interface EndSessionRequest {
  floatingNotes?: string;
}

// ===== VOIP Adapters =====
export interface AdapterConfig {
  [key: string]: unknown;
}

export interface CallStartEvent {
  callId: string;
  participantName?: string;
  participantPhone?: string;
  participantEmail?: string;
  adapter: string;
  timestamp: string;
}

export interface CallEndEvent {
  callId: string;
  duration: number;
  adapter: string;
  timestamp: string;
}

export interface ParticipantEvent {
  callId: string;
  participantName: string;
  participantEmail?: string;
  action: 'joined' | 'left';
  timestamp: string;
}

export interface CallMetadata {
  callId: string;
  adapter: string;
  startTime: string;
  participants: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
  isActive: boolean;
}

export interface VoipAdapterInfo {
  name: string;
  displayName: string;
  requiresOAuth: boolean;
  isConfigured: boolean;
  isConnected: boolean;
}

// ===== CRM =====
export interface CrmContact {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source: string;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSearchQuery {
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
}

export interface NewContactData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  fields: Record<string, unknown>;
}

export interface CrmNote {
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface CrmActivity {
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'OTHER';
  title: string;
  description: string;
  duration?: number;
  date: string;
  metadata?: Record<string, unknown>;
}

export interface CrmTask {
  title: string;
  description: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeId?: string;
}

export interface CrmSyncPreview {
  contactAction: 'CREATE' | 'UPDATE' | 'SKIP';
  matchedContact?: CrmContact;
  similarContacts?: CrmContact[];
  fieldsToWrite: Record<string, unknown>;
  noteToAdd?: CrmNote;
  activityToAdd?: CrmActivity;
  taskToCreate?: CrmTask;
}

export interface CrmSyncLog {
  id: string;
  sessionId: string;
  adapter: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  payload: Record<string, unknown>;
  response?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Integration Config =====
export type AdapterType = 'VOIP' | 'CRM';

export interface IntegrationConfig {
  id: string;
  userId?: string;
  adapterType: AdapterType;
  adapterName: string;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ===== Dashboard =====
export interface DashboardStats {
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  avgCallDuration: number;
  crmSyncRate: number;
  flaggedItems: number;
}

export interface SessionListItem {
  id: string;
  contactName: string;
  contactType: ContactType;
  templateName: string;
  voipAdapter: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  status: SessionStatus;
  crmSyncStatus: CrmSyncStatus;
}

// ===== Audit Log =====
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  diff?: Record<string, unknown>;
  createdAt: string;
}

// ===== API Responses =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== Socket Events =====
export interface SocketEvents {
  // Client -> Server
  'session:join': (sessionId: string) => void;
  'session:leave': (sessionId: string) => void;
  'session:answer': (data: UpdateAnswerRequest & { sessionId: string }) => void;
  'session:notes': (data: { sessionId: string; notes: string }) => void;

  // Server -> Client
  'session:updated': (session: Partial<CallSession>) => void;
  'session:ended': (sessionId: string) => void;
  'voip:callStart': (event: CallStartEvent) => void;
  'voip:callEnd': (event: CallEndEvent) => void;
  'voip:participant': (event: ParticipantEvent) => void;
  'crm:syncStatus': (data: { sessionId: string; status: CrmSyncStatus }) => void;
}
