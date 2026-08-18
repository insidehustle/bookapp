import { BookLoader } from "@/components/ui/BookLoader";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <BookLoader />
      <span className="text-xs uppercase tracking-[0.2em] text-muted">Loading</span>
    </div>
  );
}
