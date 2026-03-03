import type { CrmAdapter } from './index';
import type { ContactSearchQuery, CrmContact, NewContactData, CrmNote, CrmActivity, CrmTask } from '@qualirec/shared';

/**
 * HubSpot CRM Adapter
 *
 * Requires:
 * - HUBSPOT_CLIENT_ID
 * - HUBSPOT_CLIENT_SECRET
 * - OAuth flow for access token
 *
 * Uses HubSpot API v3: https://developers.hubspot.com/docs/api/crm/contacts
 */
export class HubSpotCrmAdapter implements CrmAdapter {
  name = 'hubspot';

  // Token injected from IntegrationConfig DB at runtime
  private _storedToken: string | null = null;

  /**
   * Set the access token from stored IntegrationConfig credentials.
   * Called before any HubSpot operation when credentials are loaded from DB.
   */
  setAccessToken(token: string): void {
    this._storedToken = token;
  }

  private getAccessToken(): string {
    return this._storedToken || process.env.HUBSPOT_ACCESS_TOKEN || '';
  }

  private get baseUrl() {
    return 'https://api.hubapi.com';
  }

  private async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const token = this.getAccessToken();
    if (!token) throw new Error('HubSpot not configured. Please complete OAuth setup.');

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HubSpot API error (${response.status}): ${text}`);
    }

    return response.json();
  }

  async searchContacts(query: ContactSearchQuery): Promise<CrmContact[]> {
    const filters: Array<Record<string, unknown>> = [];

    if (query.email) {
      filters.push({ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: query.email });
    }
    if (query.phone) {
      filters.push({ propertyName: 'phone', operator: 'CONTAINS_TOKEN', value: query.phone });
    }
    if (query.name) {
      filters.push({ propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: query.name });
    }
    if (query.company) {
      filters.push({ propertyName: 'company', operator: 'CONTAINS_TOKEN', value: query.company });
    }

    const result = await this.request('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: filters.length > 0 ? [{ filters }] : [],
        properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle'],
        limit: 20,
      }),
    }) as { results: Array<{ id: string; properties: Record<string, string>; createdAt: string; updatedAt: string }> };

    return (result.results || []).map((r) => this.mapHubSpotContact(r));
  }

  async getContact(id: string): Promise<CrmContact | null> {
    try {
      const result = await this.request(`/crm/v3/objects/contacts/${id}?properties=firstname,lastname,email,phone,company,jobtitle`) as {
        id: string;
        properties: Record<string, string>;
        createdAt: string;
        updatedAt: string;
      };
      return this.mapHubSpotContact(result);
    } catch {
      return null;
    }
  }

  async createContact(data: NewContactData): Promise<CrmContact> {
    const result = await this.request('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          firstname: data.firstName,
          lastname: data.lastName,
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          jobtitle: data.title || '',
          ...this.flattenFields(data.fields),
        },
      }),
    }) as { id: string; properties: Record<string, string>; createdAt: string; updatedAt: string };

    return this.mapHubSpotContact(result);
  }

  async updateContact(id: string, data: Partial<CrmContact>): Promise<CrmContact> {
    const properties: Record<string, string> = {};
    if (data.firstName) properties.firstname = data.firstName;
    if (data.lastName) properties.lastname = data.lastName;
    if (data.email) properties.email = data.email;
    if (data.phone) properties.phone = data.phone;
    if (data.company) properties.company = data.company;
    if (data.title) properties.jobtitle = data.title;
    if (data.fields) Object.assign(properties, this.flattenFields(data.fields));

    const result = await this.request(`/crm/v3/objects/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    }) as { id: string; properties: Record<string, string>; createdAt: string; updatedAt: string };

    return this.mapHubSpotContact(result);
  }

  async addNote(contactId: string, note: CrmNote): Promise<void> {
    const noteResult = await this.request('/crm/v3/objects/notes', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          hs_note_body: `<h3>${note.title}</h3><p>${note.body.replace(/\n/g, '<br>')}</p>`,
          hs_timestamp: new Date().toISOString(),
        },
      }),
    }) as { id: string };

    // Associate note with contact
    await this.request(`/crm/v3/objects/notes/${noteResult.id}/associations/contacts/${contactId}/note_to_contact`, {
      method: 'PUT',
    });
  }

  async addActivity(contactId: string, activity: CrmActivity): Promise<void> {
    await this.request('/crm/v3/objects/calls', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          hs_call_title: activity.title,
          hs_call_body: activity.description,
          hs_call_duration: activity.duration ? String(activity.duration * 1000) : '0',
          hs_timestamp: activity.date,
          hs_call_status: 'COMPLETED',
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 194 }],
          },
        ],
      }),
    });
  }

  async createTask(contactId: string, task: CrmTask): Promise<void> {
    await this.request('/crm/v3/objects/tasks', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          hs_task_subject: task.title,
          hs_task_body: task.description,
          hs_task_priority: task.priority || 'MEDIUM',
          hs_timestamp: new Date().toISOString(),
          ...(task.dueDate && { hs_task_reminders: new Date(task.dueDate).getTime() }),
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }],
          },
        ],
      }),
    });
  }

  private mapHubSpotContact(raw: { id: string; properties: Record<string, string>; createdAt: string; updatedAt: string }): CrmContact {
    return {
      id: raw.id,
      externalId: raw.id,
      firstName: raw.properties.firstname || '',
      lastName: raw.properties.lastname || '',
      email: raw.properties.email || undefined,
      phone: raw.properties.phone || undefined,
      company: raw.properties.company || undefined,
      title: raw.properties.jobtitle || undefined,
      source: 'hubspot',
      fields: raw.properties,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private flattenFields(fields: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      result[key] = String(value);
    }
    return result;
  }
}
