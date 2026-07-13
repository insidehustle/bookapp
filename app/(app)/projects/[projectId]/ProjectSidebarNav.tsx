"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChaptersIcon,
  ChatIcon,
  FilesIcon,
  ManuscriptIcon,
  PlanningIcon,
} from "@/components/icons";

export function ProjectSidebarNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/projects/${projectId}/files`, label: "Files", icon: FilesIcon },
    { href: `/projects/${projectId}/planning`, label: "Planning", icon: PlanningIcon },
    { href: `/projects/${projectId}/chapters`, label: "Chapters", icon: ChaptersIcon },
    { href: `/projects/${projectId}/manuscript`, label: "Manuscript", icon: ManuscriptIcon },
    { href: `/projects/${projectId}/chat`, label: "Chat", icon: ChatIcon },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(124,92,255,0.3)]"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive ? "text-accent" : "group-hover:text-accent"
              }`}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
