import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getStoredCredentials } from './integrations';

const prisma = new PrismaClient();

// Minimal HubSpot API helper
async function hubspotRequest(token: string, path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`https://api.hubapi.com${path}`, {
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

function mapHubSpotContact(raw: { id: string; properties: Record<string, string>; createdAt?: string; updatedAt?: string }) {
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
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

async function getHubSpotToken(userId: string): Promise<string | null> {
  const creds = await getStoredCredentials(userId, 'CRM', 'hubspot');
  return (creds?.accessToken as string) || null;
}

export function createCrmRoutes(): Router {
  const router = Router();

  // Search contacts — uses HubSpot if configured, otherwise local DB
  router.get('/contacts/search', authenticate, async (req: Request, res: Response) => {
    const { email, phone, name, company } = req.query;
    const hubspotToken = await getHubSpotToken(req.user!.userId);

    if (hubspotToken) {
      try {
        const filters: Array<Record<string, unknown>> = [];
        if (email) filters.push({ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: email });
        if (phone) filters.push({ propertyName: 'phone', operator: 'CONTAINS_TOKEN', value: phone });
        if (name) filters.push({ propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: name });
        if (company) filters.push({ propertyName: 'company', operator: 'CONTAINS_TOKEN', value: company });

        const result = await hubspotRequest(hubspotToken, '/crm/v3/objects/contacts/search', {
          method: 'POST',
          body: JSON.stringify({
            filterGroups: filters.length > 0 ? [{ filters }] : [],
            properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle'],
            limit: 20,
          }),
        }) as { results: Array<{ id: string; properties: Record<string, string>; createdAt: string; updatedAt: string }> };

        res.json({ success: true, data: (result.results || []).map(mapHubSpotContact) });
        return;
      } catch (err) {
        console.error('HubSpot search failed, falling back to local:', err);
      }
    }

    // Local DB fallback
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

  // Get contact by ID — uses HubSpot if configured
  router.get('/contacts/:id', authenticate, async (req: Request, res: Response) => {
    const hubspotToken = await getHubSpotToken(req.user!.userId);

    if (hubspotToken) {
      try {
        const result = await hubspotRequest(hubspotToken,
          `/crm/v3/objects/contacts/${req.params.id}?properties=firstname,lastname,email,phone,company,jobtitle`,
        ) as { id: string; properties: Record<string, string>; createdAt: string; updatedAt: string };
        res.json({ success: true, data: mapHubSpotContact(result) });
        return;
      } catch {
        // Fall through to local
      }
    }

    const contact = await prisma.crmContact.findUnique({ where: { id: req.params.id } });
    if (!contact) throw new AppError(404, 'Contact not found');
    res.json({
      success: true,
      data: { ...contact, fields: JSON.parse(contact.fields || '{}'), createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString() },
    });
  });

  // Create contact
  router.post('/contacts', authenticate, async (req: Request, res: Response) => {
    const { firstName, lastName, email, phone, company, title, fields } = req.body;
    const hubspotToken = await getHubSpotToken(req.user!.userId);

    if (hubspotToken) {
      try {
        const result = await hubspotRequest(hubspotToken, '/crm/v3/objects/contacts', {
          method: 'POST',
          body: JSON.stringify({
            properties: {
              firstname: firstName, lastname: lastName,
              email: email || '', phone: phone || '',
              company: company || '', jobtitle: title || '',
            },
          }),
        }) as { id: string; properties: Record<string, string>; createdAt: string; updatedAt: string };
        res.status(201).json({ success: true, data: mapHubSpotContact(result) });
        return;
      } catch (err) {
        console.error('HubSpot create failed, falling back to local:', err);
      }
    }

    const contact = await prisma.crmContact.create({
      data: { firstName, lastName, email, phone, company, title, source: 'qualirec', fields: JSON.stringify(fields || {}) },
    });
    res.status(201).json({ success: true, data: { ...contact, fields: JSON.parse(contact.fields || '{}') } });
  });

  // Sync session to CRM
  router.post('/sync/:sessionId', authenticate, async (req: Request, res: Response) => {
    const { contactAction, contactId } = req.body;
    const session = await prisma.callSession.findUnique({
      where: { id: req.params.sessionId },
      include: { template: true, answers: true, recruiter: { select: { id: true, name: true } } },
    });
    if (!session) throw new AppError(404, 'Session not found');

    const hubspotToken = await getHubSpotToken(req.user!.userId);
    const adapterName = hubspotToken ? 'hubspot' : 'mock';

    const syncLog = await prisma.crmSyncLog.create({
      data: { sessionId: session.id, adapter: adapterName, status: 'IN_PROGRESS', payload: JSON.stringify(req.body) },
    });

    try {
      let crmContactId = contactId;

      if (hubspotToken) {
        // HubSpot sync
        if (contactAction === 'CREATE') {
          const names = (session.contactName || '').split(' ');
          const result = await hubspotRequest(hubspotToken, '/crm/v3/objects/contacts', {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                firstname: names[0] || '', lastname: names.slice(1).join(' ') || '',
                email: session.contactEmail || '', phone: session.contactPhone || '',
              },
            }),
          }) as { id: string };
          crmContactId = result.id;
        }

        // Add note with summary
        if (crmContactId && session.summary) {
          const summary = JSON.parse(session.summary);
          const noteResult = await hubspotRequest(hubspotToken, '/crm/v3/objects/notes', {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                hs_note_body: `<h3>Qualification Call - ${session.template.name}</h3><p>${(summary.narrative || '').replace(/\n/g, '<br>')}</p>`,
                hs_timestamp: new Date().toISOString(),
              },
            }),
          }) as { id: string };

          await hubspotRequest(hubspotToken,
            `/crm/v3/objects/notes/${noteResult.id}/associations/contacts/${crmContactId}/note_to_contact`,
            { method: 'PUT' },
          );
        }

        // Log call activity
        if (crmContactId) {
          await hubspotRequest(hubspotToken, '/crm/v3/objects/calls', {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                hs_call_title: `Qualification Call - ${session.contactType}`,
                hs_call_body: `Template: ${session.template.name}\nDuration: ${session.duration ? Math.round(session.duration / 60) + ' min' : 'N/A'}`,
                hs_call_duration: session.duration ? String(session.duration * 1000) : '0',
                hs_timestamp: session.startedAt.toISOString(),
                hs_call_status: 'COMPLETED',
              },
              associations: [{
                to: { id: crmContactId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 194 }],
              }],
            }),
          });
        }
      } else {
        // Local CRM sync
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
