import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur-sm sm:px-6">
        <Link href="/projects" className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_10px_2px_var(--accent)]" />
          <span className="truncate bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
            Book Writing Assistant
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
          <Link href="/tutorial" className="text-muted transition-colors hover:text-accent">
            Tutorial
          </Link>
          <Link href="/voices" className="text-muted transition-colors hover:text-accent">
            Voices
          </Link>
          <span className="hidden truncate font-mono text-xs text-muted sm:inline">
            {session?.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="py-1 text-muted transition-colors hover:text-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
