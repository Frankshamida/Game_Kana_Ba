# Who's the Impostor? - Party Games

Modern party game website built with Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn-style reusable components, Supabase, and Groq AI.

## Stack

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase
- Groq API

## Setup

1. Copy `.env.local.example` to `.env.local`.
2. Fill in Groq and Supabase environment variables.
3. Run `npm install`.
4. Run `npm run dev`.

## Supabase Schema

Run SQL from `supabase/schema.sql` in Supabase SQL editor.

## Key Features

- Mobile-first party game UX
- 3-20 players with validation (unique and non-empty names)
- Secure AI generation through server API route
- Exactly one impostor assigned randomly
- Sequential reveal cards with 3D flip animation
- Countdown discussion timer with presets
- Time's up state + reveal result panel
- Supabase persistence for games and players
- Error handling with retries in AI route

## Routes

- `/` - Landing page
- `/game/impostor` - Setup page
- `/game/impostor/play` - Reveal and gameplay
- `/api/ai/impostor` - Secure AI generation
- `/api/game/start` - Starts game, assigns roles, stores history
