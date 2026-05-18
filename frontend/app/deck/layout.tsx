import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heimdall — Hackathon Deck",
  description: "Runtime governance for AI agent delegation chains.",
};

export default function DeckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
