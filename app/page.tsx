import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/projects");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-accent-2">
        AI-Native Writing Studio
      </span>
      <h1 className="bg-gradient-to-br from-foreground via-foreground to-accent bg-clip-text text-4xl font-semibold text-transparent sm:text-5xl">
        Book Writing Assistant
      </h1>
      <p className="max-w-md text-sm text-muted">
        Plan, draft, and rewrite your book with Claude — planning docs,
        chapter drafting, manuscript-wide edits, and a project-scoped AI
        assistant, all in one place.
      </p>
      <Link href="/login">
        <Button className="px-6 py-3 text-base">Sign in to get started</Button>
      </Link>
    </main>
  );
}
