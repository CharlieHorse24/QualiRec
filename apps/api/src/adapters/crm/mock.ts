import type { CrmAdapter } from './index';
import type { ContactSearchQuery, CrmContact, NewContactData, CrmNote, CrmActivity, CrmTask } from '@qualirec/shared';
import { prisma } from '../../lib/prisma';

export class MockCrmAdapter implements CrmAdapter {
  name = 'mock';

  async searchContacts(query: ContactSearchQuery): Promise<CrmContact[]> {
    const where: Record<string, unknown> = {};
    const conditions: Array<Record<string, unknown>> = [];

    if (query.email) {
      conditions.push({ email: { contains: query.email, mode: 'insensitive' } });
    }
    if (query.phone) {
      conditions.push({ phone: { contains: query.phone } });
    }
    if (query.name) {
      conditions.push({
        OR: [
          { firstName: { contains: query.name, mode: 'insensitive' } },
          { lastName: { contains: query.name, mode: 'insensitive' } },
        ],
      });
    }
    if (query.company) {
      conditions.push({ company: { contains: query.company, mode: 'insensitive' } });
    }

    if (conditions.length > 0) {
      where.OR = conditions;
    }

    const contacts = await prisma.crmContact.findMany({
      where,
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    return contacts.map(this.mapContact);
  }

  async getContact(id: string): Promise<CrmContact | null> {
    const contact = await prisma.crmContact.findUnique({ where: { id } });
    return contact ? this.mapContact(contact) : null;
  }

  async createContact(data: NewContactData): Promise<CrmContact> {
    const contact = await prisma.crmContact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        title: data.title,
        source: 'qualirec',
        fields: (data.fields || {}) as object,
      },
    });

    return this.mapContact(contact);
  }

  async updateContact(id: string, data: Partial<CrmContact>): Promise<CrmContact> {
    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.fields !== undefined) updateData.fields = data.fields as object;

    const contact = await prisma.crmContact.update({
      where: { id },
      data: updateData,
    });

    return this.mapContact(contact);
  }

  async addNote(contactId: string, note: CrmNote): Promise<void> {
    await prisma.crmContactNote.create({
      data: {
        contactId,
        title: note.title,
        body: note.body,
        metadata: (note.metadata || {}) as object,
      },
    });
  }

  async addActivity(contactId: string, activity: CrmActivity): Promise<void> {
    await prisma.crmContactActivity.create({
      data: {
        contactId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        duration: activity.duration,
        date: new Date(activity.date),
        metadata: (activity.metadata || {}) as object,
      },
    });
  }

  async createTask(contactId: string, task: CrmTask): Promise<void> {
    await prisma.crmContactTask.create({
      data: {
        contactId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        priority: task.priority || 'MEDIUM',
        assigneeId: task.assigneeId,
      },
    });
  }

  private mapContact(contact: Record<string, unknown>): CrmContact {
    return {
      id: contact.id as string,
      externalId: (contact.externalId as string) || (contact.id as string),
      firstName: contact.firstName as string,
      lastName: contact.lastName as string,
      email: (contact.email as string) || undefined,
      phone: (contact.phone as string) || undefined,
      company: (contact.company as string) || undefined,
      title: (contact.title as string) || undefined,
      source: contact.source as string,
      fields: (contact.fields as Record<string, unknown>) || {},
      createdAt: (contact.createdAt as Date).toISOString(),
      updatedAt: (contact.updatedAt as Date).toISOString(),
    };
  }
}
