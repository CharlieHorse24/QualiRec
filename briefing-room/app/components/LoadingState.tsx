"use client";

import { useState, useEffect } from "react";

const STATUS_MESSAGES = [
  "Scanning Gmail...",
  "Checking HubSpot CRM...",
  "Searching the web...",
  "Compiling brief...",
];

interface LoadingStateProps {
  stakeholderName?: string;
}

export default function LoadingState({ stakeholderName }: LoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fadeUp">
      {/* Gold spinner */}
      <div className="relative w-16 h-16 mb-8">
        <div
          className="absolute inset-0 rounded-full border-2 border-border"
          style={{ borderTopColor: "var(--accent)" }}
        >
          <div
            className="w-full h-full rounded-full animate-spin"
            style={{
              border: "2px solid transparent",
              borderTopColor: "#C8A97E",
              animationDuration: "1s",
            }}
          />
        </div>
        <div className="absolute inset-2 rounded-full border border-border opacity-30" />
      </div>

      {/* Status message */}
      <p
        className="text-accent font-body text-lg tracking-wide transition-opacity duration-300"
        key={messageIndex}
      >
        {STATUS_MESSAGES[messageIndex]}
      </p>

      {/* Stakeholder name */}
      {stakeholderName && (
        <p className="text-text-muted font-body text-sm mt-3 italic">
          Researching {stakeholderName}
        </p>
      )}
    </div>
  );
}
