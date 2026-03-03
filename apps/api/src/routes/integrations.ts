import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { listVoipAdapters } from '../adapters/voip';
import { listCrmAdapters } from '../adapters/crm';

const router = Router();

// List available VOIP adapters
router.get('/voip', authenticate, (_req: Request, res: Response) => {
  const adapters = listVoipAdapters();
  res.json({ success: true, data: adapters });
});

// List available CRM adapters
router.get('/crm', authenticate, (_req: Request, res: Response) => {
  const adapters = listCrmAdapters();
  res.json({ success: true, data: adapters });
});

export default router;
