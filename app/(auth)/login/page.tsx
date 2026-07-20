import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl ?? "/projects");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8 text-center shadow-[0_0_60px_-20px_var(--accent)]">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted">
          Continue with Google to access your projects.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/projects" });
          }}
          className="w-full"
        >
          <Button type="submit" className="w-full py-3">
            Sign in with Google
          </Button>
        </form>
      </Card>
    </main>
  );
}
