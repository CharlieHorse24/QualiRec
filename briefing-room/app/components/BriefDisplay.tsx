"use client";

import { useState } from "react";

interface BriefDisplayProps {
  content: string;
  stakeholderName: string;
  timestamp: string;
  onGenerateQualSheet: () => void;
  isGeneratingQual: boolean;
}

export default function BriefDisplay({
  content,
  stakeholderName,
  timestamp,
  onGenerateQualSheet,
  isGeneratingQual,
}: BriefDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    const elements: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Section headers (## HEADER or **HEADER**)
      if (line.match(/^#{1,3}\s+/)) {
        const text = line.replace(/^#{1,3}\s+/, "");
        elements.push(
          <h2
            key={key++}
            className="text-accent uppercase tracking-[0.15em] text-xs font-body font-semibold mt-8 mb-3 pb-2 border-b border-accent/20"
          >
            {text}
          </h2>
        );
      } else if (line.match(/^\*\*[A-Z][A-Z\s]+\*\*$/)) {
        const text = line.replace(/\*\*/g, "");
        elements.push(
          <h2
            key={key++}
            className="text-accent uppercase tracking-[0.15em] text-xs font-body font-semibold mt-8 mb-3 pb-2 border-b border-accent/20"
          >
            {text}
          </h2>
        );
      } else if (line.match(/^[-*]\s+/)) {
        // Bullet points
        const text = line.replace(/^[-*]\s+/, "");
        elements.push(
          <div key={key++} className="flex gap-2 mb-2 ml-1">
            <span className="text-accent shrink-0 font-body">›</span>
            <span
              className="font-body text-text-primary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatInline(text) }}
            />
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={key++} className="h-2" />);
      } else {
        elements.push(
          <p
            key={key++}
            className="font-body text-text-primary leading-relaxed mb-2"
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
          />
        );
      }
    }

    return elements;
  };

  const formatInline = (text: string): string => {
    // Bold text
    text = text.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-accent/90 font-semibold">$1</strong>'
    );
    // Italic text
    text = text.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    return text;
  };

  return (
    <div className="animate-fadeUp">
      {/* Brief header */}
      <div className="mb-8">
        <p className="text-text-muted uppercase tracking-[0.2em] text-[11px] font-body mb-2">
          Pre-Meeting Brief
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-text-primary mb-2">
          {stakeholderName}
        </h1>
        <p className="text-text-muted font-body text-sm italic">{timestamp}</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-accent/40 via-accent/20 to-transparent mb-8" />

      {/* Brief content */}
      <div className="brief-section max-w-none">{renderMarkdown(content)}</div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mt-10 pt-6 border-t border-border no-print">
        <button
          onClick={handleCopy}
          className="px-5 py-2.5 border border-border text-text-secondary font-body text-sm rounded hover:border-accent hover:text-accent transition-colors"
        >
          {copied ? "Copied!" : "Copy brief"}
        </button>
        <button
          onClick={onGenerateQualSheet}
          disabled={isGeneratingQual}
          className="px-5 py-2.5 bg-accent text-bg font-body font-semibold text-sm rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isGeneratingQual
            ? "Generating..."
            : "Generate Qualification Sheet ↓"}
        </button>
      </div>
    </div>
  );
}
