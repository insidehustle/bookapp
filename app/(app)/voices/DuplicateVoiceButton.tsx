"use client";

import { useTransition } from "react";
import { duplicateVoice } from "@/app/actions/voices";

export function DuplicateVoiceButton({ voiceId }: { voiceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDuplicate(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(() => {
      duplicateVoice(voiceId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isPending}
      className="text-xs text-muted transition-colors hover:text-accent disabled:opacity-50"
    >
      {isPending ? "Duplicating…" : "Duplicate"}
    </button>
  );
}
