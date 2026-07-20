import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  FilesIcon,
  PlanningIcon,
  ChaptersIcon,
  ManuscriptIcon,
  ChatIcon,
  VoiceIcon,
  BrainstormIcon,
  SettingsIcon,
} from "@/components/icons";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "create-project", label: "1. Create a project" },
  { id: "story-bible", label: "2. Story Bible" },
  { id: "files", label: "3. Upload files (optional)" },
  { id: "voices", label: "4. Voices" },
  { id: "chapters", label: "5. Writing chapters" },
  { id: "whole-book", label: "6. Write the whole book" },
  { id: "manuscript", label: "7. Manuscript, feedback, export & listen" },
  { id: "brainstorm", label: "8. Brainstorm" },
  { id: "chat", label: "9. Chat" },
  { id: "settings", label: "10. Settings" },
  { id: "mobile", label: "11. On your phone" },
];

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} as="section" className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col gap-2 text-sm text-foreground/85 [&_li]:ml-4 [&_li]:list-disc [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-4 [&_p]:leading-relaxed [&_strong]:text-foreground">
        {children}
      </div>
    </Card>
  );
}

const iconClass = "h-4 w-4";

export default function TutorialPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">How to use this app</h1>
        <p className="text-sm text-muted">
          A walkthrough of the whole workflow, from a blank project to an exported manuscript.
          Jump to any section, or read top to bottom your first time through.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md border border-border px-2 py-1 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <Card id="overview" as="section" className="flex scroll-mt-6 flex-col gap-2">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-sm text-foreground/85">
          The app follows one loop: <strong>plan</strong> your book in the Story Bible,{" "}
          <strong>write</strong> chapters with AI (one at a time or the whole book at once),{" "}
          <strong>revise</strong> anything by highlighting text and giving an instruction, then{" "}
          <strong>export</strong> the finished manuscript as a Word document. Everything below is
          optional except creating a project and writing chapters — use as much or as little of
          the planning tools as you want.
        </p>
      </Card>

      <Section id="create-project" icon={<ChaptersIcon className={iconClass} />} title="1. Create a project">
        <p>Each book you write lives in its own project. To start one:</p>
        <ol>
          <li>Click <strong>New project</strong> from the projects list.</li>
          <li>Give it a title — genre, premise, and target word count are optional but help the AI stay on track.</li>
          <li>
            If you&apos;ve already created a <strong>Voice</strong> (see below), you can attach it
            here too — or add one later from Settings.
          </li>
        </ol>
        <p>
          <Link href="/projects/new" className="text-accent hover:underline">
            Create a project →
          </Link>
        </p>
      </Section>

      <Section id="story-bible" icon={<PlanningIcon className={iconClass} />} title="2. Story Bible">
        <p>
          Inside a project, the left sidebar has four Story Bible sections: <strong>Synopsis</strong>,{" "}
          <strong>Characters</strong>, <strong>Outline</strong>, and <strong>Style</strong>. Each one:
        </p>
        <ol>
          <li>Can be generated with AI from your project&apos;s premise/genre and any uploaded files.</li>
          <li>Is fully editable afterward — click into the text and type, format with the toolbar (bold, italic, headings, lists).</li>
          <li>
            Supports highlight-to-revise: select any text, a small &quot;Ask AI to revise&quot;
            button appears, type an instruction, and only that selection changes.
          </li>
        </ol>
        <p>
          <strong>Style</strong> is a bit different — instead of one click, it&apos;s a short chat
          (the Style Interview) where the AI asks about tone, pacing, and voice, then distills your
          answers into a Style Brief that quietly guides every chapter it writes for this project.
        </p>
      </Section>

      <Section id="files" icon={<FilesIcon className={iconClass} />} title="3. Upload files (optional)">
        <p>
          If you already have a draft — a full manuscript or separate chapter files — upload it on
          the <strong>Files</strong> tab (.txt, .md, .docx, or .pdf). Files:
        </p>
        <ol>
          <li>Ground Story Bible generation and Voice creation, even before you do anything else with them.</li>
          <li>
            Can be turned into actual chapters with <strong>Generate chapters from files</strong> —
            this splits the text by detected chapter headings and replaces any existing chapters,
            so confirm before running it on a project that already has content.
          </li>
        </ol>
      </Section>

      <Section id="voices" icon={<VoiceIcon className={iconClass} />} title="4. Voices">
        <p>
          A Voice is a reusable writing style — tone, vocabulary, pacing, humor, quirks, things to
          avoid — that you create once and can attach to any project. Find it via the{" "}
          <strong>Voices</strong> link in the top header.
        </p>
        <p>Three ways to build one, from the voice&apos;s own page:</p>
        <ol>
          <li><strong>Describe it</strong> and click Generate with AI.</li>
          <li><strong>Add reference samples</strong> — paste text or upload a file written in that voice — then generate/regenerate from those.</li>
          <li><strong>Voice Interview</strong> — a short chat that asks about your style and finalizes into the Brain when you&apos;re done.</li>
        </ol>
        <p>
          You can edit the result by hand afterward, and every save is kept in{" "}
          <strong>Version History</strong> so you can restore an earlier version if a regeneration
          goes somewhere you don&apos;t like. Attach a voice to a project from the New Project form
          or from that project&apos;s Settings page — once attached, it takes priority over
          everything else when the AI drafts, rewrites, or revises chapters.
        </p>
        <p>
          <Link href="/voices" className="text-accent hover:underline">
            Manage your voices →
          </Link>
        </p>
      </Section>

      <Section id="chapters" icon={<ChaptersIcon className={iconClass} />} title="5. Writing chapters">
        <p>Click <strong>+ New</strong> under Chapters in the sidebar, or open an existing one. From there:</p>
        <ol>
          <li>
            <strong>Write</strong> — for an empty chapter, opens a modal where you can add an
            optional instruction and pick reference files to ground it in, then streams the draft in live.
          </li>
          <li>
            <strong>Rewrite</strong> — once a chapter has content, the same button becomes Rewrite;
            an instruction is required this time (e.g. &quot;make the pacing tighter&quot;).
          </li>
          <li>
            <strong>Highlight to revise</strong> — select any passage in the chapter text, ask AI
            to revise just that span, optionally pointing it at specific reference files.
          </li>
          <li><strong>Undo last AI change</strong> — one level of undo if a Write/Rewrite goes wrong.</li>
          <li><strong>Save as voice example</strong> — pick one of your voices and save the current chapter as a reference sample for it.</li>
        </ol>
        <p>Don&apos;t forget to click <strong>Save</strong> after any manual edits — AI actions save automatically, typing doesn&apos;t.</p>
      </Section>

      <Section id="whole-book" icon={<ChaptersIcon className={iconClass} />} title="6. Write the whole book">
        <p>
          On a project&apos;s home page (click the project title), the{" "}
          <strong>Write the whole book</strong> panel drafts chapters one after another —
          creating new ones as needed — until the manuscript reaches your target word count. It
          needs a target word count set (Settings will prompt you if it&apos;s missing). Progress
          shows live; <strong>Stop after this chapter</strong> lets the current one finish cleanly
          before halting. It&apos;s resumable — closing the tab and coming back just continues
          where it left off.
        </p>
      </Section>

      <Section id="manuscript" icon={<ManuscriptIcon className={iconClass} />} title="7. Manuscript, feedback, export & listen">
        <p>The <strong>Manuscript</strong> link (next to Files in the sidebar) shows the whole book on one page:</p>
        <ol>
          <li>Jump-nav across chapters at the top.</li>
          <li><strong>Get feedback</strong> — a read-only critique of strengths and suggestions; it never edits your chapters.</li>
          <li><strong>Export as Word (.docx)</strong> — downloads the full manuscript with real formatting (headings, bold, lists), ready to open in Word or Google Docs.</li>
        </ol>
        <p>
          <strong>Listen to it</strong> — a text-to-speech bar above the chapter list lets you:
        </p>
        <ol>
          <li><strong>Play whole book</strong> — reads every chapter in order, back to back.</li>
          <li><strong>Read chapter</strong> — a link on each chapter card reads just that one.</li>
          <li>
            <strong>Read aloud</strong> — highlight any text on the page and a floating bar appears
            at the bottom to read just that selection.
          </li>
          <li>
            <strong>Pause / Resume / Stop</strong> and a <strong>Speed</strong> control (0.75×–2×)
            while something is playing, with a &quot;Reading: …&quot; indicator showing where you are.
          </li>
        </ol>
        <p>
          This uses your browser&apos;s built-in voice, so it&apos;s free and instant, but the
          voice quality and options depend on your device — an optional premium AI voice is
          planned for later.
        </p>
      </Section>

      <Section id="brainstorm" icon={<BrainstormIcon className={iconClass} />} title="8. Brainstorm">
        <p>
          A standalone idea generator under Tools in the sidebar — type a short prompt
          (&quot;surname for a stoic detective&quot;, &quot;title ideas for a heist novel&quot;) and
          get a list of varied suggestions. Nothing is saved automatically; copy what you want to use.
        </p>
      </Section>

      <Section id="chat" icon={<ChatIcon className={iconClass} />} title="9. Chat">
        <p>
          The persistent chat panel on the right (or behind the chat icon on mobile) is a
          freeform assistant grounded in your project&apos;s Story Bible and manuscript — use it to
          think out loud, ask questions, or discuss craft. It&apos;s separate from the Style
          Interview and doesn&apos;t edit anything itself.
        </p>
      </Section>

      <Section id="settings" icon={<SettingsIcon className={iconClass} />} title="10. Settings">
        <p>
          Every project has a <strong>Settings</strong> page (next to Files/Manuscript) showing
          everything you filled in at creation — title, genre, premise, target word count, and
          the attached Voice — all editable at any time.
        </p>
      </Section>

      <Section id="mobile" icon={<FilesIcon className={iconClass} />} title="11. On your phone">
        <p>
          The app is responsive. On a small screen, the chapter/Story Bible sidebar and chat panel
          become slide-in drawers — tap the ☰ icon (top-left) for chapters and Story Bible, or the
          chat icon (top-right) to open chat. Tap outside a drawer, or its close button, to dismiss it.
        </p>
      </Section>

      <div className="flex justify-center pb-4">
        <Link href="/projects">
          <Button>Back to your projects</Button>
        </Link>
      </div>
    </div>
  );
}
