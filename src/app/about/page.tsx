import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="px-4 py-10 pb-36 sm:px-6 md:pb-12">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/75">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
          About
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">🎉 About This Game</h1>

        <div className="mt-5 rounded-2xl border border-white/80 bg-white/85 p-5 leading-relaxed text-slate-700 dark:border-slate-700/80 dark:bg-slate-950/45 dark:text-slate-200">
          <p>
            This game was created by <strong>Frank Gomez</strong>, inspired by
            countless hangouts with his churchmates at{" "}
            <strong>IT Park, Cebu</strong>. As everyone got a little older, they
            realized that running around and playing physical games wasn&apos;t
            always the first choice anymore, everyone somehow ended up glued to
            their phones! 😂
          </p>

          <p className="mt-4">
            Instead of fighting it, Frank decided to turn those phones into the
            game itself. Whether you&apos;re trying to catch the impostor,
            surviving a hilarious Truth or Dare, or having meaningful
            conversations during Spiritual Life sessions, this collection of
            party games is all about bringing people together, creating
            unforgettable memories, and proving that a little screen time can
            still lead to a lot of laughter, friendship, and faith.
          </p>

          <div className="mt-5 rounded-xl border border-cyan-200/80 bg-cyan-50/80 p-4 text-cyan-900 dark:border-cyan-800/70 dark:bg-cyan-950/25 dark:text-cyan-100">
            <p className="text-sm font-black uppercase tracking-[0.16em]">
              New in GatherUp
            </p>
            <p className="mt-2 font-semibold">
              GatherUp is also built for fellowship after church, helping
              friends stay connected through fun, faith-filled moments, and
              meaningful conversations.
            </p>
          </div>

          <p className="mt-4 font-semibold text-cyan-800 dark:text-cyan-200">
            So gather your friends, charge your phones, and let the games begin!
            🎮✨
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back Home
        </Link>
      </section>
    </main>
  );
}
