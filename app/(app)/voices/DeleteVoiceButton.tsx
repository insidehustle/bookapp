"use client";

import { useTransition } from "react";
import { deleteVoice } from "@/app/actions/voices";

export function DeleteVoiceButton({
  voiceId,
  voiceName,
}: {
  voiceId: string;
  voiceName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (
      !window.confirm(
        `Delete "${voiceName}"? This permanently deletes its Brain, reference samples, and version history. Any projects using it will fall back to no voice. This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(() => {
      deleteVoice(voiceId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-danger transition-colors hover:underline disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
