import { MuralExperience } from "@/components/mural/MuralExperience";
import { sampleMural } from "@/data/sample-mural";

// A Server Component: the intro text below is rendered to plain HTML on the
// server and handed to the interactive MuralExperience as children.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 lg:py-24">
      <MuralExperience mural={sampleMural}>
        <p className="font-mono text-label uppercase text-ink-muted">
          {sampleMural.location}
        </p>
        <h1 className="font-display text-display text-ink-strong text-balance">
          {sampleMural.title}
        </h1>
        <p className="max-w-[48ch] text-lg text-ink-muted">
          Each tile is a real need from a neighbour: a hot meal, a winter coat,
          a week of bus fare. Fund one, and that part of the wall gets its
          colour back.
        </p>
      </MuralExperience>
    </main>
  );
}
