"use client";

import { useState } from "react";
import Link from "next/link";
import type { Voice } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteVoiceButton } from "./DeleteVoiceButton";
import { DuplicateVoiceButton } from "./DuplicateVoiceButton";

type VoiceWithCount = Voice & { _count: { samples: number } };

export function VoiceLibraryList({ voices }: { voices: VoiceWithCount[] }) {
  const [query, setQuery] = useState("");

  const filtered = voices.filter((voice) => {
    const haystack = `${voice.name} ${voice.description ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-3">
      {voices.length > 1 && (
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search voices..."
          className="rounded-lg px-3 py-2 text-sm"
        />
      )}
      {filtered.length === 0 ? (
        <Card className="text-sm text-muted">No voices match &quot;{query}&quot;.</Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((voice) => (
            <li key={voice.id}>
              <Card className="flex items-center justify-between gap-3 transition-colors hover:border-accent">
                <Link href={`/voices/${voice.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{voice.name}</div>
                  <div className="truncate text-xs text-muted">
                    {voice.description || "No description set"}
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <Badge>{voice._count.samples} samples</Badge>
                  <DuplicateVoiceButton voiceId={voice.id} />
                  <DeleteVoiceButton voiceId={voice.id} voiceName={voice.name} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
