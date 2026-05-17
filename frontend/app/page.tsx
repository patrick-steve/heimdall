import { Architecture } from "@/components/landing/Architecture";
import { Attestations } from "@/components/landing/Attestations";
import { Close } from "@/components/landing/Close";
import { Hero } from "@/components/landing/Hero";
import { Install } from "@/components/landing/Install";
import { Limitations } from "@/components/landing/Limitations";
import { LobsterTrap } from "@/components/landing/LobsterTrap";
import { Nav } from "@/components/landing/Nav";
import { PlainEnglish } from "@/components/landing/PlainEnglish";
import { Problem } from "@/components/landing/Problem";
import { Roadmap } from "@/components/landing/Roadmap";
import { Verticals } from "@/components/landing/Verticals";

export default function Landing() {
  return (
    <main className="bg-ink text-zinc-200">
      <Nav />
      <Hero />
      <PlainEnglish />
      <Attestations />
      <Problem />
      <Architecture />
      <Verticals />
      <LobsterTrap />
      <Install />
      <Limitations />
      <Roadmap />
      <Close />
    </main>
  );
}
