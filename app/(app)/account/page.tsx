import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { decrypt } from "@/lib/crypto";
import { saveGeminiApiKey } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClearApiKeyButton } from "./ClearApiKeyButton";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { geminiApiKey: true } });

  let maskedKey: string | null = null;
  if (user?.geminiApiKey) {
    try {
      const decrypted = decrypt(user.geminiApiKey);
      maskedKey = `••••${decrypted.slice(-4)}`;
    } catch {
      maskedKey = "•••• (saved)";
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="text-sm text-muted">
        AI features run on your own Gemini API key - there&apos;s no shared key, so add yours here
        before writing, rewriting, or generating anything. Get one from{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          Google AI Studio
        </a>
        .
      </p>

      <Card className="flex flex-col gap-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Current key</span>
          <span className="font-mono text-sm">
            {maskedKey ? maskedKey : "No key saved yet"}
          </span>
        </div>

        <form action={saveGeminiApiKey} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            {maskedKey ? "Replace key" : "Gemini API key"}
            <input
              type="password"
              name="apiKey"
              required
              autoComplete="off"
              placeholder="AIza..."
              className="rounded-lg px-3 py-2 font-mono text-sm"
            />
          </label>
          <Button type="submit" className="w-fit">
            {maskedKey ? "Update key" : "Save key"}
          </Button>
        </form>

        {maskedKey && <ClearApiKeyButton />}
      </Card>
    </div>
  );
}
