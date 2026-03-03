import type { VoipAdapter } from './index';
import type { AdapterConfig, CallStartEvent, CallEndEvent, ParticipantEvent, CallMetadata, VoipAdapterInfo } from '@qualirec/shared';

/**
 * Google Meet VOIP Adapter
 *
 * Supports two modes:
 * 1. Manual link mode: Paste a Google Meet link when starting a session
 * 2. Calendar mode: Auto-detect upcoming Google Meet calls via Google Calendar API
 *
 * For Calendar mode, requires:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN (obtained via OAuth2 consent flow)
 *
 * Google Calendar API: https://developers.google.com/calendar/api/v3/reference
 * Google Meet REST API: https://developers.google.com/meet/api/reference/rest
 */
export class GoogleMeetVoipAdapter implements VoipAdapter {
  name = 'googlemeet';
  displayName = 'Google Meet';

  private callStartCallbacks: Array<(event: CallStartEvent) => void> = [];
  private callEndCallbacks: Array<(event: CallEndEvent) => void> = [];
  private participantCallbacks: Array<(event: ParticipantEvent) => void> = [];
  private connected = false;
  private accessToken: string | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  async connect(config: AdapterConfig): Promise<void> {
    const clientId = (config.clientId as string) || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = (config.clientSecret as string) || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = (config.refreshToken as string) || process.env.GOOGLE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      // Full OAuth mode — refresh access token
      await this.refreshAccessToken(clientId, clientSecret, refreshToken);
      this.connected = true;

      // Poll calendar for upcoming meetings every 60 seconds
      this.pollingInterval = setInterval(() => {
        this.checkUpcomingMeetings().catch(() => {});
      }, 60_000);
    } else {
      // Manual link mode — still connected but no calendar polling
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.connected = false;
    this.accessToken = null;
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
    if (!this.accessToken) return null;

    // Check calendar for currently-happening meetings with Google Meet links
    const meetings = await this.getOngoingMeetings();
    if (meetings.length === 0) return null;

    const meeting = meetings[0];
    return {
      callId: meeting.meetCode,
      adapter: 'googlemeet',
      startTime: meeting.startTime,
      participants: meeting.attendees.map((a) => ({
        name: a.name,
        email: a.email,
      })),
      isActive: true,
    };
  }

  getInfo(): VoipAdapterInfo {
    const hasCalendarCreds = !!(
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
    );
    return {
      name: this.name,
      displayName: this.displayName,
      requiresOAuth: true,
      isConfigured: hasCalendarCreds || this.connected,
      isConnected: this.connected,
    };
  }

  /**
   * Set credentials dynamically (from IntegrationConfig DB)
   */
  setCredentials(accessToken: string): void {
    this.accessToken = accessToken;
  }

  /**
   * Manual start: Recruiter pastes a Google Meet link or starts manually.
   * Parse the meet code and fire a call start event.
   */
  startFromLink(meetUrl: string): CallStartEvent {
    const meetCode = this.parseMeetCode(meetUrl);
    const event: CallStartEvent = {
      callId: meetCode || `meet-${Date.now()}`,
      adapter: 'googlemeet',
      timestamp: new Date().toISOString(),
    };

    this.callStartCallbacks.forEach((cb) => cb(event));
    return event;
  }

  /**
   * Manual end: Recruiter clicks "End Call" in the app.
   */
  endManually(callId: string, duration: number): void {
    this.callEndCallbacks.forEach((cb) =>
      cb({
        callId,
        duration,
        adapter: 'googlemeet',
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Handle webhook from Google Meet (Workspace Events API)
   * or calendar push notifications.
   */
  handleWebhook(payload: Record<string, unknown>): void {
    const resourceState = payload['X-Goog-Resource-State'] as string || payload.resourceState as string || '';

    if (resourceState === 'exists' || resourceState === 'sync') {
      // Calendar event updated — check if a meeting just started or ended
      this.checkUpcomingMeetings().catch(() => {});
    }
  }

  // --- Private helpers ---

  private parseMeetCode(url: string): string {
    // Handles: https://meet.google.com/abc-defg-hij
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return match ? match[1] : url;
  }

  private async refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json() as { access_token: string };
      this.accessToken = data.access_token;
    } catch (err) {
      console.error('Google OAuth token refresh failed:', err);
    }
  }

  private async checkUpcomingMeetings(): Promise<void> {
    if (!this.accessToken) return;

    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 5 * 60_000); // 5 minutes from now

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&timeMax=${soon.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
        },
      );

      if (!response.ok) return;

      const data = await response.json() as {
        items: Array<{
          id: string;
          summary?: string;
          hangoutLink?: string;
          conferenceData?: { entryPoints?: Array<{ uri?: string }> };
          start?: { dateTime?: string };
          attendees?: Array<{ displayName?: string; email?: string }>;
        }>;
      };

      for (const event of data.items || []) {
        const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri;
        if (meetLink?.includes('meet.google.com')) {
          const meetCode = this.parseMeetCode(meetLink);
          // Notify that a meeting is about to start
          this.callStartCallbacks.forEach((cb) =>
            cb({
              callId: meetCode,
              participantName: event.summary || 'Google Meet',
              adapter: 'googlemeet',
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }
    } catch {
      // Silently fail — calendar polling is best-effort
    }
  }

  private async getOngoingMeetings(): Promise<Array<{
    meetCode: string;
    startTime: string;
    attendees: Array<{ name: string; email: string }>;
  }>> {
    if (!this.accessToken) return [];

    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60_000);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${hourAgo.toISOString()}&timeMax=${now.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
        },
      );

      if (!response.ok) return [];

      const data = await response.json() as {
        items: Array<{
          hangoutLink?: string;
          conferenceData?: { entryPoints?: Array<{ uri?: string }> };
          start?: { dateTime?: string };
          end?: { dateTime?: string };
          attendees?: Array<{ displayName?: string; email?: string }>;
        }>;
      };

      return (data.items || [])
        .filter((event) => {
          const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri;
          const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : null;
          return meetLink?.includes('meet.google.com') && (!endTime || endTime > now);
        })
        .map((event) => ({
          meetCode: this.parseMeetCode(event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || ''),
          startTime: event.start?.dateTime || now.toISOString(),
          attendees: (event.attendees || []).map((a) => ({
            name: a.displayName || '',
            email: a.email || '',
          })),
        }));
    } catch {
      return [];
    }
  }
}
