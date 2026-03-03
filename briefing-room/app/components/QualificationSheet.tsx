"use client";

import { QualificationData } from "../lib/types";

interface QualificationSheetProps {
  data: QualificationData;
  stakeholderName: string;
  date: string;
}

const FIELDS: { key: keyof QualificationData; label: string }[] = [
  { key: "company_overview", label: "Company Overview" },
  { key: "economic_buyer", label: "Economic Buyer" },
  { key: "decision_maker", label: "Decision Maker" },
  { key: "metrics", label: "Metrics" },
  { key: "economic_justification", label: "Economic Justification" },
  { key: "decision_criteria", label: "Decision Criteria" },
  { key: "decision_process", label: "Decision Process" },
  { key: "identify_pain", label: "Identify Pain" },
  { key: "champion", label: "Champion" },
  { key: "competition", label: "Competition" },
  { key: "timeline", label: "Timeline" },
];

function getScoreColor(score: number): string {
  if (score < 40) return "#E85454";
  if (score <= 70) return "#E8A834";
  return "#54B86E";
}

export default function QualificationSheet({
  data,
  stakeholderName,
  date,
}: QualificationSheetProps) {
  const scoreColor = getScoreColor(data.overall_score);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-break animate-fadeUp" id="qualification-sheet">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-text-muted uppercase tracking-[0.2em] text-[11px] font-body mb-2">
            Qualification Sheet
          </p>
          <h2 className="font-serif text-2xl md:text-3xl text-text-primary">
            {stakeholderName}
          </h2>
          <p className="text-text-muted font-body text-sm italic mt-1">
            {date}
          </p>
        </div>
        <div className="flex items-center gap-4 no-print">
          {/* Score badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg border"
            style={{ borderColor: scoreColor + "40", background: scoreColor + "10" }}
          >
            <span
              className="font-serif text-2xl font-bold"
              style={{ color: scoreColor }}
            >
              {data.overall_score}
            </span>
            <span className="text-text-muted text-xs font-body">/100</span>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 border border-border text-text-secondary font-body text-sm rounded hover:border-accent hover:text-accent transition-colors"
          >
            Export to PDF
          </button>
        </div>
      </div>

      {/* Score rationale */}
      <p className="font-body text-text-secondary text-sm italic mb-6">
        {data.score_rationale}
      </p>

      {/* Score bar */}
      <div className="mb-10">
        <div className="score-bar-track h-2 rounded-full bg-surface border border-border overflow-hidden">
          <div
            className="score-bar-fill h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${data.overall_score}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-accent/40 via-accent/20 to-transparent mb-8" />

      {/* MEDDIC Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {FIELDS.map(({ key, label }) => (
          <div
            key={key}
            className="qual-card bg-surface border border-border rounded-lg p-5 border-l-2"
            style={{ borderLeftColor: "var(--accent)" }}
          >
            <p className="qual-card-label text-accent uppercase tracking-[0.15em] text-[11px] font-body font-semibold mb-3">
              {label}
            </p>
            <p className="font-body text-text-primary text-sm leading-relaxed">
              {data[key] as string}
            </p>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <div
        className="qual-card bg-surface border border-border rounded-lg p-5 border-l-2"
        style={{ borderLeftColor: "var(--accent)" }}
      >
        <p className="qual-card-label text-accent uppercase tracking-[0.15em] text-[11px] font-body font-semibold mb-3">
          Recommended Next Steps
        </p>
        <ol className="space-y-2">
          {data.next_steps.map((step, i) => (
            <li key={i} className="flex gap-3 font-body text-sm">
              <span className="text-accent font-semibold shrink-0">
                {i + 1}.
              </span>
              <span className="text-text-primary leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Print score badge (visible only in print) */}
      <div className="hidden print:block mt-8 text-center">
        <p className="text-sm text-gray-500">
          Overall Qualification Score: {data.overall_score}/100
        </p>
      </div>
    </div>
  );
}
