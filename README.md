# 🦁 The Most Extra Birthday Website Ever Made

So you're telling me a **regular birthday card** wasn't enough?

Good. Because this is a fully animated, fireworks-shooting, candle-blowing, memory-collecting, star-drifting, cursor-sparkling, background-music-playing **web experience** — dedicated to one very deserving Leo who absolutely expects nothing less.

---

## ✨ What This Thing Does

You show up, type your name, describe the birthday diva in one word (choose wisely — it goes on the wall forever 🦁), and then:

- **A glorious thank-you note** greets you. Read it. Feel loved.
- **Leave a memory** — a message, a photo, a vibe. Public or secret, your choice.
- **Blow out the candles** — literally. Use your microphone or just tap the button if you're too dignified for that. Either way, you both get to make a wish. 🎂
- **Browse the Memory Wall** — all the love from everyone who showed up.
- **Scroll to the end** — fireworks go off, the finale song plays, and you cry a little. That's normal.

The background smoothly goes from warm sunny day ☀️ to starry night 🌙 as you scroll. Because of course it does.

---

## 🔐 The Admin Cave 

Password-protected. The birthday person gets to:

- See **every** memory — public AND the spicy private ones 🔒
- Show or hide anything they want on the wall
- Delete memories (and their photos) forever
- Download everything as a ZIP (CSV files + all photos). Very handy. Very dramatic.

---

## 🛠️ For the Tech-Savvy Friend Who Set This Up

1. Clone the repo
2. create `.env.local` and fill in your Supabase credentials + the birthday person's name and age
3. Drop `background-music.mp3` and `finale-song.mp3` into `/public/`
4. Optionally add a `blow-sound.mp3` for the candle moment
5. Make sure your Supabase `photos` bucket is **private**, and that `memories` + `one_word_tags` tables exist

---

## 🚀 Run the project

```bash
npm run "diva's birthday"
```

Yes, that's a real command. Yes, it starts the dev server. Yes, it's perfect.

---

*Built with Next.js, Tailwind CSS, Supabase, tsparticles, canvas-confetti, and an unreasonable amount of love. 💛*
