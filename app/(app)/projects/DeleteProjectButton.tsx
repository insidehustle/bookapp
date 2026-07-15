"use client";

import { useTransition } from "react";
import { deleteProject } from "@/app/actions/projects";

export function DeleteProjectButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (
      !window.confirm(
        `Delete "${projectTitle}"? This permanently deletes all its chapters, planning docs, uploaded files, and chat history. This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(() => {
      deleteProject(projectId);
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
