import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { listVoipAdapters, getVoipAdapter } from '../adapters/voip';
import { listCrmAdapters } from '../adapters/crm';
import { DialpadVoipAdapter } from '../adapters/voip/dialpad';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// List available VOIP adapters (enriched with DB config status)
router.get('/voip', authenticate, async (_req: Request, res: Response) => {
  const adapters = listVoipAdapters();

  // Check which adapters have stored credentials
  const configs = await prisma.integrationConfig.findMany({
    where: { adapterType: 'VOIP', isActive: true },
  });

  const enriched = adapters.map((adapter) => {
    const config = configs.find((c) => c.adapterName === adapter.name);
    return {
      ...adapter,
      isConfigured: adapter.isConfigured || !!config,
      hasStoredCredentials: !!config,
    };
  });

  res.json({ success: true, data: enriched });
});

// List available CRM adapters (enriched with DB config status)
router.get('/crm', authenticate, async (_req: Request, res: Response) => {
  const adapterNames = listCrmAdapters();

  const configs = await prisma.integrationConfig.findMany({
    where: { adapterType: 'CRM', isActive: true },
  });

  const enriched = adapterNames.map((name) => {
    const config = configs.find((c) => c.adapterName === name);
    return {
      name,
      isConfigured: name === 'mock' || !!config,
      hasStoredCredentials: !!config,
    };
  });

  res.json({ success: true, data: enriched });
});

// Get active CRM adapter name (returns the configured one, or 'mock' as fallback)
router.get('/crm/active', authenticate, async (_req: Request, res: Response) => {
  const activeConfig = await prisma.integrationConfig.findFirst({
    where: { adapterType: 'CRM', isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    success: true,
    data: { adapter: activeConfig?.adapterName || 'mock' },
  });
});

// Save integration credentials
router.post('/config', authenticate, async (req: Request, res: Response) => {
  const { adapterType, adapterName, credentials } = req.body;

  if (!adapterType || !adapterName || !credentials) {
    throw new AppError(400, 'adapterType, adapterName, and credentials are required');
  }

  // Upsert the config
  const config = await prisma.integrationConfig.upsert({
    where: {
      userId_adapterType_adapterName: {
        userId: req.user!.userId,
        adapterType,
        adapterName,
      },
    },
    update: {
      credentials,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId: req.user!.userId,
      adapterType,
      adapterName,
      credentials,
      isActive: true,
    },
  });

  // If this is a Dialpad adapter, inject the API key immediately
  if (adapterName === 'dialpad' && credentials.apiKey) {
    try {
      const adapter = getVoipAdapter('dialpad') as DialpadVoipAdapter;
      adapter.setApiKey(credentials.apiKey);
    } catch { /* adapter not found, ok */ }
  }

  res.json({
    success: true,
    data: { id: config.id, adapterType, adapterName, isActive: config.isActive },
  });
});

// Get integration config (without raw credentials — returns status only)
router.get('/config/:adapterType/:adapterName', authenticate, async (req: Request, res: Response) => {
  const { adapterType, adapterName } = req.params;

  const config = await prisma.integrationConfig.findFirst({
    where: {
      adapterType,
      adapterName,
      isActive: true,
      OR: [
        { userId: req.user!.userId },
        { userId: null },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!config) {
    res.json({ success: true, data: null });
    return;
  }

  // Return credential keys but not values (for UI display)
  const credentialKeys = Object.keys(config.credentials as unknown as Record<string, unknown>);

  res.json({
    success: true,
    data: {
      id: config.id,
      adapterType: config.adapterType,
      adapterName: config.adapterName,
      isActive: config.isActive,
      credentialKeys,
      updatedAt: config.updatedAt,
    },
  });
});

// Delete / disconnect an integration
router.delete('/config/:adapterType/:adapterName', authenticate, async (req: Request, res: Response) => {
  const { adapterType, adapterName } = req.params;

  await prisma.integrationConfig.updateMany({
    where: {
      userId: req.user!.userId,
      adapterType,
      adapterName,
    },
    data: { isActive: false },
  });

  res.json({ success: true });
});

// Get stored credentials for server-side adapter use
export async function getStoredCredentials(
  adapterType: string,
  adapterName: string,
): Promise<Record<string, unknown> | null> {
  const config = await prisma.integrationConfig.findFirst({
    where: { adapterType, adapterName, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  return config ? (config.credentials as unknown as Record<string, unknown>) : null;
}

export default router;
