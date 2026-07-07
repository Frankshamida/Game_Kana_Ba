import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { JoinClient } from "./join-client";

function JoinPageFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-slate-700 dark:text-slate-200">
        <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/75">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading join screen...
        </div>
      </div>
    </main>
  );
}

export default function ImpostorJoinPage() {
  return (
    <Suspense fallback={<JoinPageFallback />}>
      <JoinClient />
    </Suspense>
  );
}
