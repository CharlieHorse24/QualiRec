import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getVoipAdapter } from '../adapters/voip';
import { ZoomVoipAdapter } from '../adapters/voip/zoom';
import { TwilioVoipAdapter } from '../adapters/voip/twilio';
import { TeamsVoipAdapter } from '../adapters/voip/teams';

const router = Router();

// Zoom webhook
router.post('/zoom', (req: Request, res: Response) => {
  const { event, payload } = req.body;

  // Zoom webhook validation
  if (event === 'endpoint.url_validation') {
    const hashForValidate = crypto
      .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET || '')
      .update(req.body.payload.plainToken)
      .digest('hex');

    res.json({
      plainToken: req.body.payload.plainToken,
      encryptedToken: hashForValidate,
    });
    return;
  }

  const adapter = getVoipAdapter('zoom') as ZoomVoipAdapter;
  adapter.handleWebhook(event, payload);

  res.json({ status: 'ok' });
});

// Twilio webhook (form-encoded)
router.post('/twilio', (req: Request, res: Response) => {
  const adapter = getVoipAdapter('twilio') as TwilioVoipAdapter;
  const twiml = adapter.handleWebhook(req.body);

  res.type('text/xml').send(twiml);
});

// Teams change notification
router.post('/teams', (req: Request, res: Response) => {
  // Microsoft Graph validation
  if (req.query.validationToken) {
    res.type('text/plain').send(req.query.validationToken);
    return;
  }

  const notifications = req.body.value as Array<Record<string, unknown>>;
  const adapter = getVoipAdapter('teams') as TeamsVoipAdapter;

  for (const notification of notifications || []) {
    adapter.handleChangeNotification(notification);
  }

  res.status(202).json({ status: 'ok' });
});

export default router;
