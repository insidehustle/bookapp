import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-10 w-10" />
      <span className="text-xs uppercase tracking-[0.2em] text-muted">Loading</span>
    </div>
  );
}
