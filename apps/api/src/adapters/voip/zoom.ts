import type { VoipAdapter } from './index';
import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

/**
 * Zoom VOIP Adapter
 *
 * Requires:
 * - ZOOM_CLIENT_ID
 * - ZOOM_CLIENT_SECRET
 * - ZOOM_WEBHOOK_SECRET
 *
 * Uses Zoom Webhooks for real-time events and Zoom API for meeting metadata.
 * OAuth setup: https://marketplace.zoom.us/docs/guides/build/oauth-app
 *
 * Webhook events used:
 * - meeting.started
 * - meeting.ended
 * - meeting.participant_joined
 * - meeting.participant_left
 */
export class ZoomVoipAdapter implements VoipAdapter {
  name = 'zoom';
  displayName = 'Zoom';

  private callStartCallbacks: Array<(event: CallStartEvent) => void> = [];
  private callEndCallbacks: Array<(event: CallEndEvent) => void> = [];
  private participantCallbacks: Array<(event: ParticipantEvent) => void> = [];
  private connected = false;

  async connect(_config: AdapterConfig): Promise<void> {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Zoom credentials not configured (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)');
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
    // Would query Zoom API for user's active meetings
    return null;
  }

  getInfo(): VoipAdapterInfo {
    return {
      name: this.name,
      displayName: this.displayName,
      requiresOAuth: true,
      isConfigured: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
      isConnected: this.connected,
    };
  }

  /**
   * Handle incoming Zoom webhook events.
   * Mount this at POST /api/webhooks/zoom
   */
  handleWebhook(event: string, payload: Record<string, unknown>): void {
    const object = payload.object as Record<string, unknown>;

    switch (event) {
      case 'meeting.started':
        this.callStartCallbacks.forEach((cb) =>
          cb({
            callId: String(object.id || ''),
            participantName: (object.host_email as string) || undefined,
            adapter: 'zoom',
            timestamp: new Date().toISOString(),
          }),
        );
        break;

      case 'meeting.ended': {
        const startTime = new Date(object.start_time as string);
        const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
        this.callEndCallbacks.forEach((cb) =>
          cb({
            callId: String(object.id || ''),
            duration,
            adapter: 'zoom',
            timestamp: new Date().toISOString(),
          }),
        );
        break;
      }

      case 'meeting.participant_joined':
      case 'meeting.participant_left': {
        const participant = payload.participant as Record<string, unknown>;
        this.participantCallbacks.forEach((cb) =>
          cb({
            callId: String(object.id || ''),
            participantName: (participant.user_name as string) || 'Unknown',
            participantEmail: (participant.email as string) || undefined,
            action: event === 'meeting.participant_joined' ? 'joined' : 'left',
            timestamp: new Date().toISOString(),
          }),
        );
        break;
      }
    }
  }
}
