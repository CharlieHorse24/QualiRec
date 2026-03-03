export const SESSION_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'PENDING_SYNC', 'SYNCED', 'SYNC_FAILED'] as const;

export const RESPONSE_TYPES = ['FREE_TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'NUMERIC', 'DATE', 'YES_NO'] as const;

export const TEMPLATE_TYPES = ['CANDIDATE', 'CLIENT', 'CUSTOM'] as const;

export const USER_ROLES = ['ADMIN', 'RECRUITER'] as const;

export const VOIP_ADAPTERS = ['manual', 'zoom', 'teams', 'twilio'] as const;

export const CRM_ADAPTERS = ['mock', 'hubspot', 'salesforce', 'bullhorn'] as const;

export const ANSWER_STATUSES = ['ANSWERED', 'SKIPPED', 'FLAGGED'] as const;

export const CRM_SYNC_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'] as const;

export const MAX_SUMMARY_TIMEOUT_MS = 30000;

export const DEFAULT_PAGE_SIZE = 20;

export const CALL_TIMER_INTERVAL_MS = 1000;
