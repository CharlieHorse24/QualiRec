import type { CrmAdapter } from './index';
import type { ContactSearchQuery, CrmContact, NewContactData, CrmNote, CrmActivity, CrmTask } from '@qualirec/shared';

/**
 * Bullhorn CRM Adapter
 *
 * Requires:
 * - BULLHORN_CLIENT_ID
 * - BULLHORN_CLIENT_SECRET
 * - OAuth flow for access token + REST URL
 *
 * Uses Bullhorn REST API: https://bullhorn.github.io/rest-api-docs/
 */
export class BullhornCrmAdapter implements CrmAdapter {
  name = 'bullhorn';

  private getAccessToken(): string {
    return process.env.BULLHORN_ACCESS_TOKEN || '';
  }

  private get restUrl(): string {
    return process.env.BULLHORN_REST_URL || '';
  }

  private async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const token = this.getAccessToken();
    if (!token || !this.restUrl) {
      throw new Error('Bullhorn not configured. Please complete OAuth setup.');
    }

    const response = await fetch(`${this.restUrl}${path}${path.includes('?') ? '&' : '?'}BhRestToken=${token}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bullhorn API error (${response.status}): ${text}`);
    }

    return response.json();
  }

  async searchContacts(query: ContactSearchQuery): Promise<CrmContact[]> {
    const queryParts: string[] = [];

    if (query.email) queryParts.push(`email:"${query.email}"`);
    if (query.phone) queryParts.push(`phone:"${query.phone}"`);
    if (query.name) queryParts.push(`name:"${query.name}"`);
    if (query.company) queryParts.push(`companyName:"${query.company}"`);

    const searchQuery = queryParts.length > 0 ? queryParts.join(' OR ') : '*';

    const result = await this.request(
      `/search/Candidate?query=${encodeURIComponent(searchQuery)}&fields=id,firstName,lastName,email,phone,companyName,occupation,dateAdded,dateLastModified&count=20`,
    ) as { data: Array<Record<string, unknown>> };

    return (result.data || []).map((r) => this.mapBullhornContact(r));
  }

  async getContact(id: string): Promise<CrmContact | null> {
    try {
      const result = await this.request(
        `/entity/Candidate/${id}?fields=id,firstName,lastName,email,phone,companyName,occupation,dateAdded,dateLastModified`,
      ) as { data: Record<string, unknown> };
      return this.mapBullhornContact(result.data);
    } catch {
      return null;
    }
  }

  async createContact(data: NewContactData): Promise<CrmContact> {
    const result = await this.request('/entity/Candidate', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || '',
        phone: data.phone || '',
        companyName: data.company || '',
        occupation: data.title || '',
        ...this.mapFieldsToBullhorn(data.fields),
      }),
    }) as { changedEntityId: number };

    return (await this.getContact(String(result.changedEntityId)))!;
  }

  async updateContact(id: string, data: Partial<CrmContact>): Promise<CrmContact> {
    const body: Record<string, unknown> = {};
    if (data.firstName) body.firstName = data.firstName;
    if (data.lastName) body.lastName = data.lastName;
    if (data.email) body.email = data.email;
    if (data.phone) body.phone = data.phone;
    if (data.company) body.companyName = data.company;
    if (data.title) body.occupation = data.title;
    if (data.fields) Object.assign(body, this.mapFieldsToBullhorn(data.fields));

    await this.request(`/entity/Candidate/${id}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return (await this.getContact(id))!;
  }

  async addNote(contactId: string, note: CrmNote): Promise<void> {
    await this.request('/entity/Note', {
      method: 'PUT',
      body: JSON.stringify({
        personReference: { id: parseInt(contactId) },
        title: note.title,
        comments: note.body,
        action: 'Qualification Call',
      }),
    });
  }

  async addActivity(contactId: string, activity: CrmActivity): Promise<void> {
    await this.request('/entity/Note', {
      method: 'PUT',
      body: JSON.stringify({
        personReference: { id: parseInt(contactId) },
        title: activity.title,
        comments: activity.description,
        action: activity.type === 'CALL' ? 'Phone Call' : activity.type,
        dateAdded: new Date(activity.date).getTime(),
      }),
    });
  }

  async createTask(contactId: string, task: CrmTask): Promise<void> {
    await this.request('/entity/Task', {
      method: 'PUT',
      body: JSON.stringify({
        subject: task.title,
        description: task.description,
        type: 'Follow Up',
        dateBegin: task.dueDate ? new Date(task.dueDate).getTime() : undefined,
        isCompleted: false,
      }),
    });
  }

  private mapBullhornContact(raw: Record<string, unknown>): CrmContact {
    return {
      id: String(raw.id),
      externalId: String(raw.id),
      firstName: (raw.firstName as string) || '',
      lastName: (raw.lastName as string) || '',
      email: (raw.email as string) || undefined,
      phone: (raw.phone as string) || undefined,
      company: (raw.companyName as string) || undefined,
      title: (raw.occupation as string) || undefined,
      source: 'bullhorn',
      fields: raw,
      createdAt: raw.dateAdded ? new Date(raw.dateAdded as number).toISOString() : new Date().toISOString(),
      updatedAt: raw.dateLastModified ? new Date(raw.dateLastModified as number).toISOString() : new Date().toISOString(),
    };
  }

  private mapFieldsToBullhorn(fields: Record<string, unknown>): Record<string, unknown> {
    const mapping: Record<string, string> = {
      'contact.current_salary': 'salary',
      'contact.target_salary': 'desiredSalary',
      'contact.notice_period': 'customText1',
      'contact.skills': 'skillSet',
    };

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      const bhField = mapping[key] || key;
      result[bhField] = value;
    }
    return result;
  }
}
