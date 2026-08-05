"use client";

import { useTransition } from "react";
import { deleteChapter } from "@/app/actions/chapters";
import { Button } from "@/components/ui/Button";

export function DeleteChapterButton({
  projectId,
  chapterId,
  chapterTitle,
}: {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Delete "${chapterTitle}"? This permanently deletes its content and can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(() => {
      deleteChapter(projectId, chapterId);
    });
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 text-xs"
    >
      {isPending ? "Deleting…" : "Delete chapter"}
    </Button>
  );
}
