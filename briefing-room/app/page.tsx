"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Meeting } from "./lib/types";
import MeetingCard from "./components/MeetingCard";
import LoadingState from "./components/LoadingState";

function HexagonLogo() {
  return (
    <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="36" y2="40">
          <stop offset="0%" stopColor="#D4A86A" />
          <stop offset="100%" stopColor="#C8A97E" />
        </linearGradient>
      </defs>
      <path
        d="M18 2L33 11V29L18 38L3 29V11L18 2Z"
        stroke="url(#gold-grad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M18 10L26 15V25L18 30L10 25V15L18 10Z"
        stroke="url(#gold-grad)"
        strokeWidth="1"
        fill="url(#gold-grad)"
        fillOpacity="0.15"
      />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showMeetings, setShowMeetings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [briefingMeetingId, setBriefingMeetingId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    const id = crypto.randomUUID();
    // Store query in sessionStorage for the brief page
    sessionStorage.setItem(
      `brief-${id}`,
      JSON.stringify({ query: query.trim(), stakeholderName: query.trim() })
    );
    router.push(`/brief/${id}`);
  };

  const handleFetchMeetings = async () => {
    setLoadingMeetings(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch meetings");
      }
      const data = await res.json();
      setMeetings(data.meetings || []);
      setShowMeetings(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch meetings");
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleBriefMeeting = (meeting: Meeting) => {
    setBriefingMeetingId(meeting.meetingId);
    const id = crypto.randomUUID();
    const briefQuery =
      meeting.attendees.length > 0
        ? meeting.attendees.join(", ") + " — " + meeting.title
        : meeting.title;
    sessionStorage.setItem(
      `brief-${id}`,
      JSON.stringify({ query: briefQuery, stakeholderName: meeting.title })
    );
    router.push(`/brief/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="no-print border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HexagonLogo />
            <div>
              <h1 className="font-serif text-xl text-text-primary leading-none">
                Briefing Room
              </h1>
              <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] font-body mt-0.5">
                UK&I Intelligence
              </p>
            </div>
          </div>
          <p className="text-text-muted font-body text-sm italic hidden sm:block">
            {today}
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6">
          {/* Hero */}
          <div className="pt-16 md:pt-24 pb-12 animate-fadeUp">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-tight">
              <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                Know before you
              </span>
              <br />
              <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                walk in.
              </span>
            </h2>
            <p className="text-text-secondary font-body text-lg mt-4 max-w-lg">
              Get an intelligence brief on any stakeholder in seconds.
            </p>
          </div>

          {/* Search Form */}
          <div className="opacity-0 animate-fadeUp" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
            <form onSubmit={handleManualSearch} className="flex gap-3 mb-6">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Sarah Chen, Barclays"
                className="flex-1 bg-surface border border-border rounded-lg px-5 py-3 font-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="px-6 py-3 bg-accent text-bg font-body font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Brief me →
              </button>
            </form>

            {/* Calendar button */}
            <div className="mb-8">
              <button
                onClick={handleFetchMeetings}
                disabled={loadingMeetings}
                className="px-5 py-2.5 border border-border text-text-secondary font-body text-sm rounded-lg hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
              >
                {loadingMeetings
                  ? "Loading meetings..."
                  : "Show today's meetings & brief from calendar"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 border border-red-500/30 bg-red-500/5 rounded-lg">
              <p className="font-body text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading meetings */}
          {loadingMeetings && <LoadingState stakeholderName="calendar" />}

          {/* Meetings list */}
          {showMeetings && !loadingMeetings && (
            <div className="opacity-0 animate-fadeUp" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-accent uppercase tracking-[0.15em] text-xs font-body font-semibold">
                  Today&apos;s Meetings
                </h3>
                <div className="flex-1 h-px bg-border" />
              </div>

              {meetings.length === 0 ? (
                <p className="text-text-muted font-body text-sm py-8 text-center">
                  No meetings found for today.
                </p>
              ) : (
                <div className="space-y-3 pb-16">
                  {meetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.meetingId}
                      meeting={meeting}
                      onBrief={handleBriefMeeting}
                      isLoading={briefingMeetingId === meeting.meetingId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-border py-4">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-text-muted text-xs font-body text-center">
            Briefing Room — UK&I Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
