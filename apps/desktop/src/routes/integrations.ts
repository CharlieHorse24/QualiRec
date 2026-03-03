import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export function getStoredCredentials(userId: string, adapterType: string, adapterName: string): Promise<Record<string, unknown> | null> {
  return prisma.integrationConfig.findFirst({
    where: { userId, adapterType, adapterName, isActive: true },
  }).then((config) => {
    if (!config) return null;
    try { return JSON.parse(config.credentials); } catch { return null; }
  });
}

export function createIntegrationRoutes(): Router {
  const router = Router();

  // List VOIP adapters (enriched with stored credential status)
  router.get('/voip', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const storedConfigs = await prisma.integrationConfig.findMany({
      where: { userId, adapterType: 'VOIP' },
    });
    const configMap = new Map(storedConfigs.map((c) => [c.adapterName, c]));

    const adapters = [
      { name: 'manual', displayName: 'Manual Mode', requiresOAuth: false },
      { name: 'dialpad', displayName: 'Dialpad', requiresOAuth: false },
      { name: 'googlemeet', displayName: 'Google Meet', requiresOAuth: false },
      { name: 'zoom', displayName: 'Zoom', requiresOAuth: true },
      { name: 'teams', displayName: 'Microsoft Teams', requiresOAuth: true },
      { name: 'twilio', displayName: 'Twilio', requiresOAuth: false },
    ];

    const enriched = adapters.map((a) => {
      const config = configMap.get(a.name);
      return {
        ...a,
        isConfigured: a.name === 'manual' || !!config,
        isConnected: a.name === 'manual' || (!!config && config.isActive),
        hasStoredCredentials: !!config,
      };
    });

    res.json({ success: true, data: enriched });
  });

  // List CRM adapters (enriched with stored credential status)
  router.get('/crm', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const storedConfigs = await prisma.integrationConfig.findMany({
      where: { userId, adapterType: 'CRM' },
    });
    const configMap = new Map(storedConfigs.map((c) => [c.adapterName, c]));

    const adapters = ['mock', 'hubspot', 'salesforce'];
    const enriched = adapters.map((name) => {
      const config = configMap.get(name);
      return {
        name,
        isConfigured: name === 'mock' || !!config,
        hasStoredCredentials: !!config,
      };
    });

    res.json({ success: true, data: enriched });
  });

  // Get active CRM adapter (returns hubspot if credentials stored, otherwise mock)
  router.get('/crm/active', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const hubspotConfig = await prisma.integrationConfig.findFirst({
      where: { userId, adapterType: 'CRM', adapterName: 'hubspot', isActive: true },
    });

    res.json({
      success: true,
      data: { adapter: hubspotConfig ? 'hubspot' : 'mock' },
    });
  });

  // Save integration credentials
  router.post('/config', authenticate, async (req: Request, res: Response) => {
    const { adapterType, adapterName, credentials } = req.body;
    if (!adapterType || !adapterName || !credentials) {
      throw new AppError(400, 'adapterType, adapterName, and credentials are required');
    }

    const userId = req.user!.userId;

    const config = await prisma.integrationConfig.upsert({
      where: {
        userId_adapterType_adapterName: { userId, adapterType, adapterName },
      },
      create: {
        userId,
        adapterType,
        adapterName,
        credentials: JSON.stringify(credentials),
        isActive: true,
      },
      update: {
        credentials: JSON.stringify(credentials),
        isActive: true,
      },
    });

    res.json({ success: true, data: { id: config.id } });
  });

  // Get integration config
  router.get('/config/:type/:name', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const config = await prisma.integrationConfig.findFirst({
      where: { userId, adapterType: req.params.type, adapterName: req.params.name },
    });

    if (!config) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({
      success: true,
      data: {
        id: config.id,
        adapterType: config.adapterType,
        adapterName: config.adapterName,
        isActive: config.isActive,
        hasCredentials: true,
      },
    });
  });

  // Delete integration config
  router.delete('/config/:type/:name', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const config = await prisma.integrationConfig.findFirst({
      where: { userId, adapterType: req.params.type, adapterName: req.params.name },
    });

    if (config) {
      await prisma.integrationConfig.delete({ where: { id: config.id } });
    }

    res.json({ success: true });
  });

  return router;
}
