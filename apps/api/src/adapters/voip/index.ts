import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

export interface VoipAdapter {
  name: string;
  displayName: string;
  connect(config: AdapterConfig): Promise<void>;
  disconnect(): Promise<void>;
  onCallStart(callback: (event: CallStartEvent) => void): void;
  onCallEnd(callback: (event: CallEndEvent) => void): void;
  onParticipantJoin(callback: (event: ParticipantEvent) => void): void;
  getActiveCallMetadata(): Promise<CallMetadata | null>;
  getInfo(): VoipAdapterInfo;
}

import { ManualVoipAdapter } from './manual';
import { ZoomVoipAdapter } from './zoom';
import { TeamsVoipAdapter } from './teams';
import { TwilioVoipAdapter } from './twilio';

const adapters: Record<string, VoipAdapter> = {
  manual: new ManualVoipAdapter(),
  zoom: new ZoomVoipAdapter(),
  teams: new TeamsVoipAdapter(),
  twilio: new TwilioVoipAdapter(),
};

export function getVoipAdapter(name: string): VoipAdapter {
  const adapter = adapters[name];
  if (!adapter) {
    throw new Error(`VOIP adapter "${name}" not found. Available: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

export function listVoipAdapters(): VoipAdapterInfo[] {
  return Object.values(adapters).map((a) => a.getInfo());
}
