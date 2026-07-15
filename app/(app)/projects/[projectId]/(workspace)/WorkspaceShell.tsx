"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MenuIcon, ChatIcon, CloseIcon } from "@/components/icons";
import { WorkspaceDrawerProvider } from "./WorkspaceDrawerContext";

export function WorkspaceShell({
  projectTitle,
  projectStatus,
  sidebar,
  chat,
  children,
}: {
  projectTitle: string;
  projectStatus: string;
  sidebar: React.ReactNode;
  chat: React.ReactNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <WorkspaceDrawerProvider
      value={{
        closeSidebar: () => setSidebarOpen(false),
        closeChat: () => setChatOpen(false),
      }}
    >
      <div className="flex h-[calc(100vh-57px)] flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chapters and story bible"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">{projectTitle}</span>
            <Badge>{projectStatus}</Badge>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-label="Open chat"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
          >
            <ChatIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            onClick={() => setSidebarOpen(false)}
            className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
              sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <div
            className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] -translate-x-full transform flex-col overflow-y-auto border-r border-border bg-background transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:bg-transparent ${
              sidebarOpen ? "translate-x-0" : ""
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <span className="text-xs uppercase tracking-wider text-muted">Menu</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center text-muted hover:text-accent"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="mb-4 hidden items-center justify-between lg:flex">
              <Link
                href="/projects"
                className="text-xs text-muted transition-colors hover:text-accent"
              >
                ← All projects
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{projectTitle}</span>
                <Badge>{projectStatus}</Badge>
              </div>
            </div>
            <Link
              href="/projects"
              className="mb-4 inline-block text-xs text-muted transition-colors hover:text-accent lg:hidden"
            >
              ← All projects
            </Link>
            {children}
          </main>

          <div
            onClick={() => setChatOpen(false)}
            className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
              chatOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <div
            className={`fixed inset-y-0 right-0 z-50 flex w-80 max-w-[90vw] translate-x-full transform flex-col border-l border-border bg-background p-4 transition-transform duration-200 lg:static lg:z-auto lg:w-80 lg:max-w-none lg:translate-x-0 ${
              chatOpen ? "translate-x-0" : ""
            }`}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between lg:hidden">
              <span className="text-xs uppercase tracking-wider text-muted">Chat</span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="flex h-9 w-9 items-center justify-center text-muted hover:text-accent"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {chat}
          </div>
        </div>
      </div>
    </WorkspaceDrawerProvider>
  );
}
