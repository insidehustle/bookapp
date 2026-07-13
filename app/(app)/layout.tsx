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
      <header className="flex items-center justify-between border-b border-border bg-surface/60 px-6 py-3 backdrop-blur-sm">
        <Link href="/projects" className="flex items-center gap-2 font-semibold">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_2px_var(--accent)]" />
          <span className="bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
            Book Writing Assistant
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-xs text-muted">{session?.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-muted transition-colors hover:text-accent">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
