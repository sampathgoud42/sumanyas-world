# Sumanya's World 🚀

A kids' site for curious 4th graders: a 3D solar system, space and history quizzes, knock-knock jokes, and 300+ giggles (silly jokes, funny riddles and mind-benders).

**Live site:** https://sumanyas-world.netlify.app/

## Hosting

- Hosted on Netlify, project `sumanyas-world`
- Netlify account: ssampathwrites@gmail.com
- Plain static site with no build step: the repo root is the publish directory

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page layout and sections |
| `app.js` | 3D solar system, quizzes, giggle cards, games |
| `data.js` | All content: planet facts, quiz questions, giggles, knock-knock jokes, history |
| `styles.css` | Styles |
| `assets/` | Images and vendored libraries |

## Adding giggles

Add entries to the `giggles` array in `data.js` as `{ cat: "silly" | "funny" | "mind", q: "...", a: "..." }`.
Always append to the end: the site remembers which cards a kid has revealed by their position in the list, so reordering would mark the wrong cards as revealed.
The "All" filter count updates on its own.
To spotlight a new batch in the "✨ Newly Added" filter, set `giggleNewFrom` in `data.js` to the number of giggles that existed before the batch (the count on the "All" chip before you added it).

## Stickers

The Sticker Shop draws each sticker on a canvas (art, caption pill, white die-cut rim) and downloads it as a 512×512 PNG.
Entries live in the `stickers` array in `data.js` as `{ e: "<twemoji code>", t: "Caption", cat: "space" | "animals" | "food" | "school" | "fun" | "play" }`.
Art is vendored from [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0, credited on the page) into `assets/stickers/<code>.svg`; to add one, drop the matching SVG from `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/<code>.svg` into that folder.
Append new stickers to the end: download progress is remembered by position.
