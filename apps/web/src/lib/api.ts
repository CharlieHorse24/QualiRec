import type {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  User,
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CallSession,
  CreateSessionRequest,
  UpdateAnswerRequest,
  EndSessionRequest,
  DashboardStats,
  CrmContact,
  ContactSearchQuery,
  CallSessionSummary,
  CrmSyncLog,
  VoipAdapterInfo,
} from '@qualirec/shared';

const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.token = null;
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.request('/auth/me');
  }

  async updatePreferences(preferences: Record<string, unknown>): Promise<ApiResponse<User>> {
    return this.request('/auth/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  }

  // Templates
  async getTemplates(params?: { type?: string; includeArchived?: boolean }): Promise<ApiResponse<Template[]>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.includeArchived) qs.set('includeArchived', 'true');
    return this.request(`/templates?${qs}`);
  }

  async getTemplate(id: string): Promise<ApiResponse<Template>> {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(data: CreateTemplateRequest): Promise<ApiResponse<Template>> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<ApiResponse<Template>> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cloneTemplate(id: string): Promise<ApiResponse<Template>> {
    return this.request(`/templates/${id}/clone`, { method: 'POST' });
  }

  async archiveTemplate(id: string): Promise<ApiResponse<Template>> {
    return this.request(`/templates/${id}/archive`, { method: 'POST' });
  }

  // Sessions
  async getSessions(params?: {
    status?: string;
    contactType?: string;
    page?: number;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<CallSession>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.contactType) qs.set('contactType', params.contactType);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.search) qs.set('search', params.search);
    return this.request(`/sessions?${qs}`);
  }

  async getSession(id: string): Promise<ApiResponse<CallSession>> {
    return this.request(`/sessions/${id}`);
  }

  async createSession(data: CreateSessionRequest): Promise<ApiResponse<CallSession>> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnswer(sessionId: string, data: UpdateAnswerRequest): Promise<ApiResponse<unknown>> {
    return this.request(`/sessions/${sessionId}/answers`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateFloatingNotes(sessionId: string, notes: string): Promise<ApiResponse<unknown>> {
    return this.request(`/sessions/${sessionId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ floatingNotes: notes }),
    });
  }

  async endSession(sessionId: string, data?: EndSessionRequest): Promise<ApiResponse<CallSession>> {
    return this.request(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async saveSummary(sessionId: string, summary: CallSessionSummary): Promise<ApiResponse<unknown>> {
    return this.request(`/sessions/${sessionId}/summary`, {
      method: 'PUT',
      body: JSON.stringify({ summary }),
    });
  }

  async updateSessionContact(sessionId: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request(`/sessions/${sessionId}/contact`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/sessions/stats/dashboard');
  }

  // Summary
  async generateSummary(sessionId: string): Promise<ApiResponse<CallSessionSummary>> {
    return this.request(`/summary/${sessionId}/generate`, { method: 'POST' });
  }

  // CRM
  async searchCrmContacts(query: ContactSearchQuery): Promise<ApiResponse<CrmContact[]>> {
    const qs = new URLSearchParams();
    if (query.email) qs.set('email', query.email);
    if (query.phone) qs.set('phone', query.phone);
    if (query.name) qs.set('name', query.name);
    if (query.company) qs.set('company', query.company);
    return this.request(`/crm/contacts/search?${qs}`);
  }

  async getCrmContact(id: string): Promise<ApiResponse<CrmContact>> {
    return this.request(`/crm/contacts/${id}`);
  }

  async syncToCrm(sessionId: string, data: {
    adapter?: string;
    contactAction: 'CREATE' | 'UPDATE' | 'SKIP';
    contactId?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.request(`/crm/sync/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCrmSyncLogs(sessionId: string): Promise<ApiResponse<CrmSyncLog[]>> {
    return this.request(`/crm/sync/${sessionId}/logs`);
  }

  // Integrations
  async getVoipAdapters(): Promise<ApiResponse<VoipAdapterInfo[]>> {
    return this.request('/integrations/voip');
  }

  async getCrmAdapters(): Promise<ApiResponse<string[]>> {
    return this.request('/integrations/crm');
  }

  // Admin
  async getUsers(): Promise<ApiResponse<unknown[]>> {
    return this.request('/admin/users');
  }

  async createUser(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminSessions(params?: { page?: number }): Promise<ApiResponse<PaginatedResponse<CallSession>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    return this.request(`/admin/sessions?${qs}`);
  }
}

export const api = new ApiClient();
