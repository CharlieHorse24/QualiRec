import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getCrmAdapter } from '../adapters/crm';
import { HubSpotCrmAdapter } from '../adapters/crm/hubspot';
import { getStoredCredentials } from './integrations';
import type { CrmSyncStatus } from '@qualirec/shared';

const router = Router();

/**
 * Resolve which CRM adapter to use and inject stored credentials.
 * If HubSpot is configured in the DB, use it automatically.
 */
async function resolveAdapter(requestedAdapter?: string) {
  let adapterName = requestedAdapter;

  // If not specified or 'mock', check if HubSpot is configured
  if (!adapterName || adapterName === 'mock') {
    const hubspotCreds = await getStoredCredentials('CRM', 'hubspot');
    if (hubspotCreds?.accessToken) {
      adapterName = 'hubspot';
    }
  }

  const adapter = getCrmAdapter(adapterName || 'mock');

  // Inject stored credentials for HubSpot
  if (adapter.name === 'hubspot') {
    const creds = await getStoredCredentials('CRM', 'hubspot');
    if (creds?.accessToken) {
      (adapter as HubSpotCrmAdapter).setAccessToken(creds.accessToken as string);
    }
  }

  return { adapter, adapterName: adapter.name };
}

// Search CRM contacts
router.get('/contacts/search', authenticate, async (req: Request, res: Response) => {
  const { email, phone, name, company, adapter: adapterName } = req.query;
  const { adapter } = await resolveAdapter(adapterName as string);

  const contacts = await adapter.searchContacts({
    email: email as string,
    phone: phone as string,
    name: name as string,
    company: company as string,
  });

  res.json({ success: true, data: contacts });
});

// Get CRM contact
router.get('/contacts/:id', authenticate, async (req: Request, res: Response) => {
  const { adapter: adapterName } = req.query;
  const { adapter } = await resolveAdapter(adapterName as string);

  const contact = await adapter.getContact(req.params.id);
  if (!contact) throw new AppError(404, 'Contact not found');

  res.json({ success: true, data: contact });
});

// Create CRM contact
router.post('/contacts', authenticate, async (req: Request, res: Response) => {
  const { adapter: adapterName } = req.query;
  const { adapter } = await resolveAdapter(adapterName as string);

  const contact = await adapter.createContact(req.body);
  res.status(201).json({ success: true, data: contact });
});

// Update CRM contact
router.put('/contacts/:id', authenticate, async (req: Request, res: Response) => {
  const { adapter: adapterName } = req.query;
  const { adapter } = await resolveAdapter(adapterName as string);

  const contact = await adapter.updateContact(req.params.id, req.body);
  res.json({ success: true, data: contact });
});

// Sync session to CRM
router.post('/sync/:sessionId', authenticate, async (req: Request, res: Response) => {
  const { adapter: requestedAdapter, contactAction, contactId } = req.body;
  const { adapter, adapterName } = await resolveAdapter(requestedAdapter);

  const session = await prisma.callSession.findUnique({
    where: { id: req.params.sessionId },
    include: {
      template: true,
      answers: true,
      recruiter: { select: { id: true, name: true, email: true } },
    },
  });

  if (!session) throw new AppError(404, 'Session not found');

  // Create sync log
  const syncLog = await prisma.crmSyncLog.create({
    data: {
      sessionId: session.id,
      adapter: adapterName,
      status: 'IN_PROGRESS',
      payload: req.body,
    },
  });

  await prisma.callSession.update({
    where: { id: session.id },
    data: { crmSyncStatus: 'IN_PROGRESS' },
  });

  try {
    let crmContactId = contactId;

    // Create or update CRM contact
    if (contactAction === 'CREATE') {
      const nameParts = (session.contactName || '').split(' ');
      const newContact = await adapter.createContact({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: session.contactEmail || undefined,
        phone: session.contactPhone || undefined,
        fields: buildCrmFields(session),
      });
      crmContactId = newContact.id;
    } else if (contactAction === 'UPDATE' && contactId) {
      await adapter.updateContact(contactId, {
        fields: buildCrmFields(session),
      });
    }

    // Add note with summary
    if (crmContactId && session.summary) {
      const summary = session.summary as unknown as Record<string, unknown>;
      await adapter.addNote(crmContactId, {
        title: `Qualification Call - ${session.template.name}`,
        body: [
          summary.narrative || '',
          '',
          '**Key Highlights:**',
          ...((summary.highlights as string[]) || []).map((h: string) => `- ${h}`),
          '',
          '**Next Actions:**',
          ...((summary.nextActions as string[]) || []).map((a: string) => `- ${a}`),
        ].join('\n'),
      });
    }

    // Add activity
    if (crmContactId) {
      await adapter.addActivity(crmContactId, {
        type: 'CALL',
        title: `Qualification Call - ${session.contactType}`,
        description: `Template: ${session.template.name}\nDuration: ${session.duration ? Math.round(session.duration / 60) + ' min' : 'N/A'}\nRecruiter: ${session.recruiter?.name}`,
        duration: session.duration || undefined,
        date: session.startedAt.toISOString(),
      });
    }

    // Update sync log and session
    await prisma.crmSyncLog.update({
      where: { id: syncLog.id },
      data: { status: 'COMPLETED', response: { crmContactId } },
    });

    await prisma.callSession.update({
      where: { id: session.id },
      data: {
        crmSyncStatus: 'COMPLETED',
        status: 'SYNCED',
        crmContactId,
      },
    });

    res.json({ success: true, data: { crmContactId, syncLogId: syncLog.id, adapter: adapterName } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.crmSyncLog.update({
      where: { id: syncLog.id },
      data: { status: 'FAILED', errorMessage },
    });

    await prisma.callSession.update({
      where: { id: session.id },
      data: { crmSyncStatus: 'FAILED', status: 'SYNC_FAILED' },
    });

    throw new AppError(500, `CRM sync failed: ${errorMessage}`);
  }
});

// Get sync logs for session
router.get('/sync/:sessionId/logs', authenticate, async (req: Request, res: Response) => {
  const logs = await prisma.crmSyncLog.findMany({
    where: { sessionId: req.params.sessionId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: logs });
});

function buildCrmFields(session: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const answers = session.answers as Array<{ questionId: string; responseValue: unknown }>;
  const template = session.template as { sections: unknown };
  const sections = template.sections as Array<{ questions: Array<{ id: string; flagForCRM: boolean; crmFieldMapping?: string }> }>;

  if (!sections || !answers) return fields;

  for (const section of sections) {
    for (const question of section.questions) {
      if (question.flagForCRM && question.crmFieldMapping) {
        const answer = answers.find((a) => a.questionId === question.id);
        if (answer) {
          fields[question.crmFieldMapping] = answer.responseValue;
        }
      }
    }
  }

  return fields;
}

export default router;
