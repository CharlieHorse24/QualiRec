import type { VoipAdapter } from './index';
import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

/**
 * Dialpad VOIP Adapter
 *
 * Requires:
 * - DIALPAD_API_KEY (from Dialpad Admin > Company Settings > API Keys)
 *
 * Uses Dialpad API v2: https://developers.dialpad.com/reference
 * Webhook events: call.ringing, call.connected, call.ended
 *
 * Setup:
 * 1. Get API key from Dialpad admin panel
 * 2. Configure webhook URL in Dialpad to point to /api/webhooks/dialpad
 * 3. Enter the API key in QualiRec Admin Settings
 */
export class DialpadVoipAdapter implements VoipAdapter {
  name = 'dialpad';
  displayName = 'Dialpad';

  private callStartCallbacks: Array<(event: CallStartEvent) => void> = [];
  private callEndCallbacks: Array<(event: CallEndEvent) => void> = [];
  private participantCallbacks: Array<(event: ParticipantEvent) => void> = [];
  private connected = false;
  private apiKey: string | null = null;

  async connect(config: AdapterConfig): Promise<void> {
    const key = (config.apiKey as string) || process.env.DIALPAD_API_KEY;
    if (!key) {
      throw new Error('Dialpad API key not configured');
    }
    this.apiKey = key;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.apiKey = null;
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
    if (!this.apiKey) return null;

    try {
      const response = await fetch('https://dialpad.com/api/v2/calls', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json() as { items?: Array<Record<string, unknown>> };
      const activeCalls = data.items || [];

      if (activeCalls.length === 0) return null;

      const call = activeCalls[0];
      return {
        callId: String(call.id || ''),
        adapter: 'dialpad',
        startTime: String(call.date_started || new Date().toISOString()),
        participants: [],
        isActive: true,
      };
    } catch {
      return null;
    }
  }

  getInfo(): VoipAdapterInfo {
    return {
      name: this.name,
      displayName: this.displayName,
      requiresOAuth: false,
      isConfigured: !!(this.apiKey || process.env.DIALPAD_API_KEY),
      isConnected: this.connected,
    };
  }

  /**
   * Set the API key dynamically (from IntegrationConfig DB)
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Handle incoming Dialpad webhook events.
   * Mount at POST /api/webhooks/dialpad
   *
   * Dialpad sends JSON payloads with event types:
   * - call.ringing: A call is ringing
   * - call.connected: A call was answered
   * - call.ended: A call ended
   * - call.voicemail: Voicemail left
   */
  handleWebhook(payload: Record<string, unknown>): void {
    const eventType = payload.event_type as string || payload.type as string || '';
    const callData = (payload.call as Record<string, unknown>) || payload;

    const callId = String(callData.call_id || callData.id || '');
    const externalNumber = String(callData.external_number || callData.from_number || '');
    const contactName = String(callData.contact_name || callData.caller_name || '');
    const duration = Number(callData.duration || callData.total_duration || 0);

    switch (eventType) {
      case 'call.ringing':
      case 'call.connected':
        this.callStartCallbacks.forEach((cb) =>
          cb({
            callId,
            participantName: contactName || undefined,
            participantPhone: externalNumber || undefined,
            adapter: 'dialpad',
            timestamp: new Date().toISOString(),
          }),
        );
        break;

      case 'call.ended':
        this.callEndCallbacks.forEach((cb) =>
          cb({
            callId,
            duration: Math.round(duration),
            adapter: 'dialpad',
            timestamp: new Date().toISOString(),
          }),
        );
        break;
    }
  }

  /**
   * Look up a contact in Dialpad by phone number.
   * Returns caller info that can pre-populate the session.
   */
  async lookupContact(phone: string): Promise<{ name?: string; email?: string; company?: string } | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`https://dialpad.com/api/v2/contacts?phone_number=${encodeURIComponent(phone)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json() as { items?: Array<Record<string, unknown>> };
      const contacts = data.items || [];

      if (contacts.length === 0) return null;

      const contact = contacts[0];
      return {
        name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || undefined,
        email: (contact.emails as string[])?.[0] || undefined,
        company: contact.company as string || undefined,
      };
    } catch {
      return null;
    }
  }
}
