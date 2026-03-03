import type { VoipAdapter } from './index';
import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

/**
 * Twilio VOIP Adapter
 *
 * Requires:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 *
 * Uses Twilio Voice webhooks for call events.
 * Setup: Configure your Twilio phone number's webhook URL to point to /api/webhooks/twilio
 *
 * Webhook events:
 * - StatusCallback: call status changes (ringing, in-progress, completed)
 */
export class TwilioVoipAdapter implements VoipAdapter {
  name = 'twilio';
  displayName = 'Twilio';

  private callStartCallbacks: Array<(event: CallStartEvent) => void> = [];
  private callEndCallbacks: Array<(event: CallEndEvent) => void> = [];
  private participantCallbacks: Array<(event: ParticipantEvent) => void> = [];
  private connected = false;

  async connect(_config: AdapterConfig): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)');
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  onCallStart(callback: (event: CallStartEvent) => void): void {
    this.callStartCallbacks.push(callback);
  }

  onCallEnd(callback: (event: CallEndEvent) => void): void {
    this.callEndCallbacks.push(callback);
  }

  onParticipantJoin(callback: (event: ParticipantEvent) => void): void {
    this.participantCallbacks.push(callback);
  }

  async getActiveCallMetadata(): Promise<CallMetadata | null> {
    // Would query Twilio API for active calls
    return null;
  }

  getInfo(): VoipAdapterInfo {
    return {
      name: this.name,
      displayName: this.displayName,
      requiresOAuth: false,
      isConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      isConnected: this.connected,
    };
  }

  /**
   * Handle incoming Twilio voice webhook.
   * Mount at POST /api/webhooks/twilio
   *
   * Twilio sends form-encoded data with fields like:
   * CallSid, CallStatus, From, To, CallerName, CallDuration
   */
  handleWebhook(params: Record<string, string>): string {
    const callSid = params.CallSid || '';
    const callStatus = params.CallStatus || '';
    const from = params.From || '';
    const callerName = params.CallerName || '';

    switch (callStatus) {
      case 'in-progress':
        this.callStartCallbacks.forEach((cb) =>
          cb({
            callId: callSid,
            participantName: callerName || from,
            participantPhone: from,
            adapter: 'twilio',
            timestamp: new Date().toISOString(),
          }),
        );
        break;

      case 'completed':
      case 'no-answer':
      case 'busy':
      case 'failed':
      case 'canceled':
        this.callEndCallbacks.forEach((cb) =>
          cb({
            callId: callSid,
            duration: parseInt(params.CallDuration || '0', 10),
            adapter: 'twilio',
            timestamp: new Date().toISOString(),
          }),
        );
        break;
    }

    // Return TwiML response
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  }
}
