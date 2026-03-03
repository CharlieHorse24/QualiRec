import type { CrmAdapter } from './index';
import type { ContactSearchQuery, CrmContact, NewContactData, CrmNote, CrmActivity, CrmTask } from '@qualirec/shared';

/**
 * Salesforce CRM Adapter
 *
 * Requires:
 * - SALESFORCE_CLIENT_ID
 * - SALESFORCE_CLIENT_SECRET
 * - SALESFORCE_INSTANCE_URL
 * - OAuth flow for access token
 *
 * Uses Salesforce REST API: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta
 */
export class SalesforceCrmAdapter implements CrmAdapter {
  name = 'salesforce';

  private getAccessToken(): string {
    return process.env.SALESFORCE_ACCESS_TOKEN || '';
  }

  private get instanceUrl(): string {
    return process.env.SALESFORCE_INSTANCE_URL || '';
  }

  private async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const token = this.getAccessToken();
    if (!token || !this.instanceUrl) {
      throw new Error('Salesforce not configured. Please complete OAuth setup.');
    }

    const response = await fetch(`${this.instanceUrl}/services/data/v59.0${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Salesforce API error (${response.status}): ${text}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async searchContacts(query: ContactSearchQuery): Promise<CrmContact[]> {
    const conditions: string[] = [];

    if (query.email) conditions.push(`Email LIKE '%${this.sanitize(query.email)}%'`);
    if (query.phone) conditions.push(`Phone LIKE '%${this.sanitize(query.phone)}%'`);
    if (query.name) {
      conditions.push(`(FirstName LIKE '%${this.sanitize(query.name)}%' OR LastName LIKE '%${this.sanitize(query.name)}%')`);
    }
    if (query.company) conditions.push(`Account.Name LIKE '%${this.sanitize(query.company)}%'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
    const soql = `SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Name, CreatedDate, LastModifiedDate FROM Contact ${whereClause} LIMIT 20`;

    const result = await this.request(`/query?q=${encodeURIComponent(soql)}`) as {
      records: Array<Record<string, unknown>>;
    };

    return (result.records || []).map((r) => this.mapSalesforceContact(r));
  }

  async getContact(id: string): Promise<CrmContact | null> {
    try {
      const result = await this.request(`/sobjects/Contact/${id}`) as Record<string, unknown>;
      return this.mapSalesforceContact(result);
    } catch {
      return null;
    }
  }

  async createContact(data: NewContactData): Promise<CrmContact> {
    const result = await this.request('/sobjects/Contact', {
      method: 'POST',
      body: JSON.stringify({
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email || null,
        Phone: data.phone || null,
        Title: data.title || null,
        ...this.mapFieldsToSalesforce(data.fields),
      }),
    }) as { id: string };

    return (await this.getContact(result.id))!;
  }

  async updateContact(id: string, data: Partial<CrmContact>): Promise<CrmContact> {
    const body: Record<string, unknown> = {};
    if (data.firstName) body.FirstName = data.firstName;
    if (data.lastName) body.LastName = data.lastName;
    if (data.email) body.Email = data.email;
    if (data.phone) body.Phone = data.phone;
    if (data.title) body.Title = data.title;
    if (data.fields) Object.assign(body, this.mapFieldsToSalesforce(data.fields));

    await this.request(`/sobjects/Contact/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    return (await this.getContact(id))!;
  }

  async addNote(contactId: string, note: CrmNote): Promise<void> {
    await this.request('/sobjects/ContentNote', {
      method: 'POST',
      body: JSON.stringify({
        Title: note.title,
        Content: Buffer.from(note.body).toString('base64'),
      }),
    });
  }

  async addActivity(contactId: string, activity: CrmActivity): Promise<void> {
    await this.request('/sobjects/Task', {
      method: 'POST',
      body: JSON.stringify({
        WhoId: contactId,
        Subject: activity.title,
        Description: activity.description,
        ActivityDate: activity.date.split('T')[0],
        Status: 'Completed',
        Type: 'Call',
        CallDurationInSeconds: activity.duration || 0,
      }),
    });
  }

  async createTask(contactId: string, task: CrmTask): Promise<void> {
    await this.request('/sobjects/Task', {
      method: 'POST',
      body: JSON.stringify({
        WhoId: contactId,
        Subject: task.title,
        Description: task.description,
        ActivityDate: task.dueDate?.split('T')[0] || null,
        Priority: task.priority || 'Normal',
        Status: 'Not Started',
        OwnerId: task.assigneeId || null,
      }),
    });
  }

  private mapSalesforceContact(raw: Record<string, unknown>): CrmContact {
    const account = raw.Account as Record<string, unknown> | null;
    return {
      id: raw.Id as string,
      externalId: raw.Id as string,
      firstName: (raw.FirstName as string) || '',
      lastName: (raw.LastName as string) || '',
      email: (raw.Email as string) || undefined,
      phone: (raw.Phone as string) || undefined,
      company: account ? (account.Name as string) : undefined,
      title: (raw.Title as string) || undefined,
      source: 'salesforce',
      fields: raw,
      createdAt: (raw.CreatedDate as string) || new Date().toISOString(),
      updatedAt: (raw.LastModifiedDate as string) || new Date().toISOString(),
    };
  }

  private mapFieldsToSalesforce(fields: Record<string, unknown>): Record<string, unknown> {
    // Map QualiRec field keys to Salesforce field API names
    const mapping: Record<string, string> = {
      'contact.current_salary': 'Current_Salary__c',
      'contact.target_salary': 'Target_Salary__c',
      'contact.notice_period': 'Notice_Period__c',
      'contact.location': 'MailingCity',
      'contact.skills': 'Skills__c',
    };

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      const sfField = mapping[key] || key;
      result[sfField] = value;
    }
    return result;
  }

  private sanitize(value: string): string {
    return value.replace(/'/g, "\\'");
  }
}
