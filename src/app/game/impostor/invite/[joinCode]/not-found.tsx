import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function InviteNotFoundPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <Card className="w-full max-w-xl space-y-5 border-white/80 bg-white/85 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/75">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-700 dark:text-red-300">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700 dark:text-red-300">
              Room Not Found
            </p>
            <h1 className="font-display text-4xl font-black text-slate-950 dark:text-slate-50">
              This game room no longer exists.
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Create your own room and invite your friends.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button asChild size="lg" className="mobile-top-chrome">
              <Link href="/game/impostor/join">
                <ArrowLeft className="mr-2 h-4 w-4" /> Return Home
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
