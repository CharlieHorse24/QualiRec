import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

export function createIntegrationRoutes(): Router {
  const router = Router();

  router.get('/voip', authenticate, (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: [
        { name: 'manual', displayName: 'Manual Mode', requiresOAuth: false, isConfigured: true, isConnected: true },
        { name: 'zoom', displayName: 'Zoom', requiresOAuth: true, isConfigured: false, isConnected: false },
        { name: 'teams', displayName: 'Microsoft Teams', requiresOAuth: true, isConfigured: false, isConnected: false },
        { name: 'twilio', displayName: 'Twilio', requiresOAuth: false, isConfigured: false, isConnected: false },
      ],
    });
  });

  router.get('/crm', authenticate, (_req: Request, res: Response) => {
    res.json({ success: true, data: ['mock', 'hubspot', 'salesforce', 'bullhorn'] });
  });

  return router;
}
