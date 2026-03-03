"use client";

import { Meeting } from "../lib/types";

interface MeetingCardProps {
  meeting: Meeting;
  onBrief: (meeting: Meeting) => void;
  isLoading?: boolean;
}

export default function MeetingCard({
  meeting,
  onBrief,
  isLoading,
}: MeetingCardProps) {
  return (
    <div className="border border-border bg-surface rounded-lg p-5 animate-fadeUp hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-text-primary truncate">
            {meeting.title}
          </h3>
          <p className="text-accent text-sm font-body mt-1">{meeting.time}</p>
          {meeting.attendees.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {meeting.attendees.map((attendee, i) => (
                <span
                  key={i}
                  className="inline-block text-xs font-body text-text-secondary bg-surface border border-border rounded-full px-3 py-1"
                >
                  {attendee}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onBrief(meeting)}
          disabled={isLoading}
          className="shrink-0 px-4 py-2 bg-accent text-bg font-body font-semibold text-sm rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "..." : "Brief →"}
        </button>
      </div>
    </div>
  );
}
