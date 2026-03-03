import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export function createCrmRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();

  router.get('/contacts/search', authenticate, async (req: Request, res: Response) => {
    const { email, phone, name, company } = req.query;
    const conditions: Array<Record<string, unknown>> = [];
    if (email) conditions.push({ email: { contains: email as string } });
    if (phone) conditions.push({ phone: { contains: phone as string } });
    if (name) conditions.push({ firstName: { contains: name as string } });
    if (company) conditions.push({ company: { contains: company as string } });

    const where = conditions.length > 0 ? { OR: conditions } : {};
    const contacts = await prisma.crmContact.findMany({ where, take: 20, orderBy: { updatedAt: 'desc' } });

    res.json({
      success: true,
      data: contacts.map((c) => ({
        ...c, fields: JSON.parse(c.fields || '{}'),
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      })),
    });
  });

  router.get('/contacts/:id', authenticate, async (req: Request, res: Response) => {
    const contact = await prisma.crmContact.findUnique({ where: { id: req.params.id } });
    if (!contact) throw new AppError(404, 'Contact not found');
    res.json({
      success: true,
      data: { ...contact, fields: JSON.parse(contact.fields || '{}'), createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString() },
    });
  });

  router.post('/contacts', authenticate, async (req: Request, res: Response) => {
    const { firstName, lastName, email, phone, company, title, fields } = req.body;
    const contact = await prisma.crmContact.create({
      data: { firstName, lastName, email, phone, company, title, source: 'qualirec', fields: JSON.stringify(fields || {}) },
    });
    res.status(201).json({
      success: true, data: { ...contact, fields: JSON.parse(contact.fields || '{}') },
    });
  });

  router.post('/sync/:sessionId', authenticate, async (req: Request, res: Response) => {
    const { contactAction, contactId } = req.body;
    const session = await prisma.callSession.findUnique({
      where: { id: req.params.sessionId },
      include: { template: true, answers: true, recruiter: { select: { id: true, name: true } } },
    });
    if (!session) throw new AppError(404, 'Session not found');

    const syncLog = await prisma.crmSyncLog.create({
      data: { sessionId: session.id, adapter: 'mock', status: 'IN_PROGRESS', payload: JSON.stringify(req.body) },
    });

    try {
      let crmContactId = contactId;
      if (contactAction === 'CREATE') {
        const names = (session.contactName || '').split(' ');
        const newContact = await prisma.crmContact.create({
          data: {
            firstName: names[0] || '', lastName: names.slice(1).join(' ') || '',
            email: session.contactEmail, phone: session.contactPhone, source: 'qualirec', fields: '{}',
          },
        });
        crmContactId = newContact.id;
      }

      if (crmContactId && session.summary) {
        const summary = JSON.parse(session.summary);
        await prisma.crmContactNote.create({
          data: {
            contactId: crmContactId,
            title: `Qualification Call - ${session.template.name}`,
            body: summary.narrative || '',
          },
        });
      }

      if (crmContactId) {
        await prisma.crmContactActivity.create({
          data: {
            contactId: crmContactId, type: 'CALL',
            title: `Qualification Call - ${session.contactType}`,
            description: `Template: ${session.template.name}\nDuration: ${session.duration ? Math.round(session.duration / 60) + ' min' : 'N/A'}`,
            duration: session.duration, date: session.startedAt,
          },
        });
      }

      await prisma.crmSyncLog.update({ where: { id: syncLog.id }, data: { status: 'COMPLETED', response: JSON.stringify({ crmContactId }) } });
      await prisma.callSession.update({ where: { id: session.id }, data: { crmSyncStatus: 'COMPLETED', status: 'SYNCED', crmContactId } });

      res.json({ success: true, data: { crmContactId, syncLogId: syncLog.id } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await prisma.crmSyncLog.update({ where: { id: syncLog.id }, data: { status: 'FAILED', errorMessage: msg } });
      await prisma.callSession.update({ where: { id: session.id }, data: { crmSyncStatus: 'FAILED', status: 'SYNC_FAILED' } });
      throw new AppError(500, `CRM sync failed: ${msg}`);
    }
  });

  router.get('/sync/:sessionId/logs', authenticate, async (req: Request, res: Response) => {
    const logs = await prisma.crmSyncLog.findMany({ where: { sessionId: req.params.sessionId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: logs });
  });

  return router;
}
