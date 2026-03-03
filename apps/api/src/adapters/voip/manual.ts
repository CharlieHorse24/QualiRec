import type { VoipAdapter } from './index';
import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

/**
 * Manual Mode VOIP Adapter
 *
 * No integration required. Recruiter manually starts/ends sessions.
 * Always available as a fallback.
 */
export class ManualVoipAdapter implements VoipAdapter {
  name = 'manual';
  displayName = 'Manual Mode';

  private callStartCallbacks: Array<(event: CallStartEvent) => void> = [];
  private callEndCallbacks: Array<(event: CallEndEvent) => void> = [];
  private participantCallbacks: Array<(event: ParticipantEvent) => void> = [];

  async connect(_config: AdapterConfig): Promise<void> {
    // No connection needed for manual mode
  }

  async disconnect(): Promise<void> {
    // No disconnection needed
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
    // Manual mode has no automatic call detection
    return null;
  }

  getInfo(): VoipAdapterInfo {
    return {
      name: this.name,
      displayName: this.displayName,
      requiresOAuth: false,
      isConfigured: true,
      isConnected: true,
    };
  }

  // Allow manual triggering of events
  triggerCallStart(event: CallStartEvent): void {
    this.callStartCallbacks.forEach((cb) => cb(event));
  }

  triggerCallEnd(event: CallEndEvent): void {
    this.callEndCallbacks.forEach((cb) => cb(event));
  }
}
