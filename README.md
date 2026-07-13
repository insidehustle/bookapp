# Book Writing & Rewriting Assistant

A Next.js (App Router) web app that uses the Claude API to help plan, draft, and rewrite books — plotting docs, character profiles, chapter-by-chapter drafting, manuscript-wide editing/polishing, and importing an existing draft manuscript.

## Getting Started

1. Copy `.env.example` to `.env` and fill in a Postgres connection (e.g. [Neon](https://neon.tech)), Google OAuth credentials, and an `ANTHROPIC_API_KEY`.

2. Install dependencies:

```bash
npm install
```

3. Apply the database schema:

```bash
npm run db:migrate
```

4. Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build and serve
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript, no emit
- `npm run db:migrate` — apply Prisma migrations
- `npm run db:studio` — browse the database with Prisma Studio

## Project Structure

- `app/` — routes (App Router): auth, project workspace (planning docs, chapters, manuscript), API route handlers
- `lib/claude/` — Claude API integration (model selection, structured planning-doc generation, streaming chapter drafts/rewrites/polish, prompt caching)
- `lib/manuscript/` — uploaded-manuscript parsing (DOCX/PDF/TXT/MD) and heuristic chapter splitting
- `lib/auth.ts` — Auth.js (NextAuth v5) configuration
- `lib/prisma.ts` — Prisma client singleton
- `prisma/schema.prisma` — data model (users, projects, planning docs, chapters, manuscript edit runs)

## Scope

In scope for v1: planning-doc generation, chapter drafting/rewriting, manuscript-wide editing/polishing, and uploading an existing draft manuscript.
Out of scope for v1 (candidate phase 2): book-cover image generation, Kindle/KPF export, and KDP metadata (title/description/keywords) generation.
