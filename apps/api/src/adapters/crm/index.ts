import type { ContactSearchQuery, CrmContact, NewContactData, CrmNote, CrmActivity, CrmTask } from '@qualirec/shared';
import { MockCrmAdapter } from './mock';
import { HubSpotCrmAdapter } from './hubspot';
import { SalesforceCrmAdapter } from './salesforce';
import { BullhornCrmAdapter } from './bullhorn';

export interface CrmAdapter {
  name: string;
  searchContacts(query: ContactSearchQuery): Promise<CrmContact[]>;
  getContact(id: string): Promise<CrmContact | null>;
  createContact(data: NewContactData): Promise<CrmContact>;
  updateContact(id: string, data: Partial<CrmContact>): Promise<CrmContact>;
  addNote(contactId: string, note: CrmNote): Promise<void>;
  addActivity(contactId: string, activity: CrmActivity): Promise<void>;
  createTask(contactId: string, task: CrmTask): Promise<void>;
}

const adapters: Record<string, CrmAdapter> = {
  mock: new MockCrmAdapter(),
  hubspot: new HubSpotCrmAdapter(),
  salesforce: new SalesforceCrmAdapter(),
  bullhorn: new BullhornCrmAdapter(),
};

export function getCrmAdapter(name: string): CrmAdapter {
  const adapter = adapters[name];
  if (!adapter) {
    throw new Error(`CRM adapter "${name}" not found. Available: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

export function listCrmAdapters(): string[] {
  return Object.keys(adapters);
}
