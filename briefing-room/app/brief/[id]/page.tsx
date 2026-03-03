"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QualificationData } from "../../lib/types";
import BriefDisplay from "../../components/BriefDisplay";
import QualificationSheet from "../../components/QualificationSheet";
import LoadingState from "../../components/LoadingState";

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [stakeholderName, setStakeholderName] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qualData, setQualData] = useState<QualificationData | null>(null);
  const [qualLoading, setQualLoading] = useState(false);
  const [qualError, setQualError] = useState<string | null>(null);

  const generateBrief = useCallback(async () => {
    // Get brief params from sessionStorage
    const stored = sessionStorage.getItem(`brief-${id}`);
    if (!stored) {
      setError("Brief parameters not found. Please start a new search.");
      setLoading(false);
      return;
    }

    const { query, stakeholderName: name } = JSON.parse(stored);
    setStakeholderName(name);
    setTimestamp(
      new Date().toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate brief");
      }

      const data = await res.json();
      setBriefContent(data.content);

      // Store brief content for qualification sheet
      sessionStorage.setItem(
        `brief-content-${id}`,
        JSON.stringify({
          content: data.content,
          stakeholderName: name,
        })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate brief"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    generateBrief();
  }, [generateBrief]);

  const handleGenerateQualSheet = async () => {
    if (!briefContent) return;

    setQualLoading(true);
    setQualError(null);

    try {
      const res = await fetch("/api/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefContent, stakeholderName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate qualification sheet");
      }

      const data = await res.json();
      setQualData(data.qualification);

      // Scroll to qualification sheet
      setTimeout(() => {
        document
          .getElementById("qualification-sheet")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setQualError(
        err instanceof Error
          ? err.message
          : "Failed to generate qualification sheet"
      );
    } finally {
      setQualLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="no-print border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="32" viewBox="0 0 36 40" fill="none">
              <defs>
                <linearGradient
                  id="gold-grad-sm"
                  x1="0"
                  y1="0"
                  x2="36"
                  y2="40"
                >
                  <stop offset="0%" stopColor="#D4A86A" />
                  <stop offset="100%" stopColor="#C8A97E" />
                </linearGradient>
              </defs>
              <path
                d="M18 2L33 11V29L18 38L3 29V11L18 2Z"
                stroke="url(#gold-grad-sm)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M18 10L26 15V25L18 30L10 25V15L18 10Z"
                stroke="url(#gold-grad-sm)"
                strokeWidth="1"
                fill="url(#gold-grad-sm)"
                fillOpacity="0.15"
              />
            </svg>
            <div>
              <h1 className="font-serif text-lg text-text-primary leading-none">
                Briefing Room
              </h1>
              <p className="text-text-muted text-[9px] uppercase tracking-[0.25em] font-body mt-0.5">
                UK&I Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-text-muted font-body text-sm italic hidden sm:block">
              {today}
            </p>
            <button
              onClick={() => router.push("/")}
              className="text-text-muted hover:text-accent font-body text-sm transition-colors"
            >
              ← New brief
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        {loading && <LoadingState stakeholderName={stakeholderName} />}

        {error && (
          <div className="py-16 text-center animate-fadeUp">
            <div className="p-6 border border-red-500/30 bg-red-500/5 rounded-lg inline-block">
              <p className="font-body text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 border border-border text-text-secondary font-body text-sm rounded hover:border-accent hover:text-accent transition-colors"
              >
                ← Start over
              </button>
            </div>
          </div>
        )}

        {briefContent && (
          <>
            <BriefDisplay
              content={briefContent}
              stakeholderName={stakeholderName}
              timestamp={timestamp}
              onGenerateQualSheet={handleGenerateQualSheet}
              isGeneratingQual={qualLoading}
            />

            {/* Qualification loading */}
            {qualLoading && (
              <div className="mt-12 pt-8 border-t border-border">
                <LoadingState stakeholderName={stakeholderName} />
              </div>
            )}

            {/* Qualification error */}
            {qualError && (
              <div className="mt-8 p-4 border border-red-500/30 bg-red-500/5 rounded-lg">
                <p className="font-body text-red-400 text-sm">{qualError}</p>
              </div>
            )}

            {/* Qualification sheet */}
            {qualData && (
              <div className="mt-12 pt-8 border-t border-border">
                <QualificationSheet
                  data={qualData}
                  stakeholderName={stakeholderName}
                  date={timestamp}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-border py-4">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-text-muted text-xs font-body text-center">
            Briefing Room — UK&I Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
