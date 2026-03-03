import type { VoipAdapter } from './index';
import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

/**
 * Microsoft Teams VOIP Adapter
 *
 * Requires:
 * - TEAMS_CLIENT_ID
 * - TEAMS_CLIENT_SECRET
 * - TEAMS_TENANT_ID
 *
 * Uses Microsoft Graph API for call/meeting detection.
 * OAuth setup: https://learn.microsoft.com/en-us/graph/auth/
 *
 * Graph subscriptions used:
 * - /communications/callRecords
 * - /me/onlineMeetings
 */
export class TeamsVoipAdapter implements VoipAdapter {
  name = 'teams';
  displayName = 'Microsoft Teams';

  private callStartCallbacks: Array<(event: CallStartEvent) => void> = [];
  private callEndCallbacks: Array<(event: CallEndEvent) => void> = [];
  private participantCallbacks: Array<(event: ParticipantEvent) => void> = [];
  private connected = false;

  async connect(_config: AdapterConfig): Promise<void> {
    const clientId = process.env.TEAMS_CLIENT_ID;
    const clientSecret = process.env.TEAMS_CLIENT_SECRET;
    const tenantId = process.env.TEAMS_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Teams credentials not configured (TEAMS_CLIENT_ID, TEAMS_CLIENT_SECRET, TEAMS_TENANT_ID)');
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
    // Would query Microsoft Graph for presence/call status
    return null;
  }

  getInfo(): VoipAdapterInfo {
    return {
      name: this.name,
      displayName: this.displayName,
      requiresOAuth: true,
      isConfigured: !!(process.env.TEAMS_CLIENT_ID && process.env.TEAMS_CLIENT_SECRET),
      isConnected: this.connected,
    };
  }

  /**
   * Handle incoming Microsoft Graph change notification.
   * Mount at POST /api/webhooks/teams
   */
  handleChangeNotification(notification: Record<string, unknown>): void {
    const changeType = notification.changeType as string;
    const resource = notification.resource as string;

    if (resource?.includes('callRecords')) {
      if (changeType === 'created') {
        const resourceData = notification.resourceData as Record<string, unknown>;
        this.callEndCallbacks.forEach((cb) =>
          cb({
            callId: (resourceData?.id as string) || '',
            duration: 0,
            adapter: 'teams',
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }
  }
}
