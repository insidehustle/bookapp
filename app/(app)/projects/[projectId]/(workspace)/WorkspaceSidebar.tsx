"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { Chapter } from "@prisma/client";
import { createChapter, deleteChapter, deleteChapterSilent } from "@/app/actions/chapters";
import { TrashIcon } from "@/components/icons";
import { useWorkspaceDrawer } from "./WorkspaceDrawerContext";

const STORY_BIBLE_ITEMS = [
  { type: "REFERENCE_PLOT", label: "Synopsis" },
  { type: "CHARACTER_PROFILES", label: "Characters" },
  { type: "STORY_STRUCTURE", label: "Outline" },
  { type: "STYLE_BRIEF", label: "Style" },
] as const;

export function WorkspaceSidebar({
  projectId,
  chapters,
}: {
  projectId: string;
  chapters: Chapter[];
}) {
  const pathname = usePathname();
  const { closeSidebar } = useWorkspaceDrawer();
  const [, startTransition] = useTransition();
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  function handleDeleteChapter(chapter: Chapter, isActive: boolean) {
    if (
      !window.confirm(
        `Delete "Chapter ${chapter.order}: ${chapter.title}"? This permanently deletes its content and can't be undone.`,
      )
    ) {
      return;
    }
    setDeletingChapterId(chapter.id);
    startTransition(() => {
      if (isActive) {
        deleteChapter(projectId, chapter.id);
      } else {
        deleteChapterSilent(projectId, chapter.id).finally(() => setDeletingChapterId(null));
      }
    });
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto px-4 py-6 lg:w-64 lg:border-r lg:border-border">
      <div className="flex gap-4 text-xs">
        <Link
          href={`/projects/${projectId}/files`}
          onClick={closeSidebar}
          className="py-1 text-muted transition-colors hover:text-accent"
        >
          Files
        </Link>
        <Link
          href={`/projects/${projectId}/manuscript`}
          onClick={closeSidebar}
          className="py-1 text-muted transition-colors hover:text-accent"
        >
          Manuscript
        </Link>
        <Link
          href={`/projects/${projectId}/settings`}
          onClick={closeSidebar}
          className="py-1 text-muted transition-colors hover:text-accent"
        >
          Settings
        </Link>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-muted">Chapters</h2>
          <form action={createChapter.bind(null, projectId)}>
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              + New
            </button>
          </form>
        </div>
        <nav className="flex flex-col gap-0.5">
          {chapters.length === 0 && (
            <p className="text-xs text-muted">No chapters yet.</p>
          )}
          {chapters.map((chapter) => {
            const href = `/projects/${projectId}/chapters/${chapter.id}`;
            const isActive = pathname === href;
            const isDeleting = deletingChapterId === chapter.id;
            return (
              <div key={chapter.id} className="flex items-center gap-1">
                <Link
                  href={href}
                  onClick={closeSidebar}
                  className={`min-w-0 flex-1 truncate rounded-md px-2 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(124,92,255,0.3)]"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {chapter.order}. {chapter.title}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeleteChapter(chapter, isActive)}
                  disabled={isDeleting}
                  aria-label={`Delete Chapter ${chapter.order}: ${chapter.title}`}
                  className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      <div>
        <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">Story Bible</h2>
        <nav className="flex flex-col gap-0.5">
          {STORY_BIBLE_ITEMS.map((item) => {
            const href = `/projects/${projectId}/story-bible/${item.type}`;
            const isActive = pathname === href;
            return (
              <Link
                key={item.type}
                href={href}
                onClick={closeSidebar}
                className={`rounded-md px-2 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(124,92,255,0.3)]"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
        <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">Tools</h2>
        <nav className="flex flex-col gap-0.5">
          {(() => {
            const href = `/projects/${projectId}/brainstorm`;
            const isActive = pathname === href;
            return (
              <Link
                href={href}
                onClick={closeSidebar}
                className={`rounded-md px-2 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(124,92,255,0.3)]"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                Brainstorm
              </Link>
            );
          })()}
        </nav>
      </div>
    </aside>
  );
}
