"use client";

import { useTransition } from "react";
import { clearGeminiApiKey } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";

export function ClearApiKeyButton() {
  const [isPending, startTransition] = useTransition();

  function handleClear() {
    if (
      !window.confirm(
        "Remove your saved Gemini API key? AI features will stop working until you add a new one.",
      )
    ) {
      return;
    }
    startTransition(() => {
      clearGeminiApiKey();
    });
  }

  return (
    <Button type="button" variant="danger" onClick={handleClear} disabled={isPending} className="w-fit">
      {isPending ? "Removing…" : "Remove key"}
    </Button>
  );
}
