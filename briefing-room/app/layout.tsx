import type { Metadata } from "next";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "Briefing Room — UK&I Intelligence",
  description:
    "Pre-meeting stakeholder briefs and MEDDIC qualification sheets for UK&I Country Manager.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
