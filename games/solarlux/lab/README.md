# SolarLux Battle Lab

Four prototype battle modes for playtesting, kept apart from the Unity game so the main Swipe Command battle is untouched. Plain HTML, CSS and JavaScript, no build step. Open `/games/solarlux/lab/` (unlisted, like the game).

- **Spotlight Rush** (`rush.html`, `rush.js`): real-time auto battle in the style of Princess Connect, Blue Archive and NIKKE. The crew attack on their own; tap a charged portrait (or press 1-4) to fire her skill with a cut-in. Three skills within 4 seconds of each other trigger a Showstopper (double damage for 6 seconds). Enemies telegraph a big attack a few seconds ahead. AUTO and 2x buttons included.
- **Deck Match** (`match.html`, `match.js`): match-3 battle in the style of Puzzle & Dragons and Empires & Puzzles. Each crew member's face is a tile; matching her tiles makes her attack and charges her skill. Hearts heal. A 4+ match leaves a star tile that clears its row and column. Enemies show a turn countdown; ⚠ marks the big attack.

- **Encore** (`encore.html`, `encore.js`): rhythm battle in the style of rhythm gacha games (Project Sekai, Love Live). Four lanes, one per crew member; notes fall to the ring at 112 BPM over a synthesized beat. A hit makes that crew member attack (Perfect and combo hit harder). A full meter turns her next note gold; hit it to fire her skill. Before a big enemy attack, red guard notes land in every lane, and each one hit blocks a quarter of the damage. Keys D F J K.
- **Bridge Tactics** (`tactics.html`, `tactics.js`): turn-based grid battle in the style of Into the Breach. Every enemy shows the exact tiles it will hit next turn, with the damage. Each department attacks differently (Security melee, Bridge Command line shots, Engineering splash blasts, Entertainment knockback, Guest Services heal). Enemies hit whatever stands on their tiles, including each other, so knockback can turn them on their friends. Three guests are stuck on deck and enemies go for them too. Full skill meters fire skills. Stars: the win, nobody down, no guest hurt.

`shared.js` holds the crew (stats and skills), enemies, stages and helpers both modes use. The tuning numbers sit at the top of each mode's script.

Art in `art/` is downscaled WebP from `~/SolarLux/art/game` (crew sprites and portraits, enemies, battle backgrounds). Some enemy cut-outs use an oval fade because their art has a busy background.

The game's service worker (`../sw.js`) covers the lab, so it works offline and from the installed app once loaded. Scripts carry a `?v=` query: bump it when changing them so phones pick up the new copy on the next launch.
