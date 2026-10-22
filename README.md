# Green Bear Arcade

The game hub for [arcade.greenbearlabs.com](https://arcade.greenbearlabs.com), where Green Bear Labs posts the games it makes.

The hub is **the Bear's Den**: a dark arcade floor where every game is a cabinet with a live attract-mode screen. Click a cabinet, a coin drops, and the game loads.

## What's here

```
index.html, hub.css, hub.js   the Bear's Den hub
shared/theme.css              palette and fonts pulled from the logo
shared/game.css               layout every game page shares
shared/arcade.js              helpers: canvas setup, best scores, sound, overlays, the bear sprite
shared/games.js               the list of cabinets on the floor
games/<slug>/                 one folder per game (index.html + game.js)
assets/                       logo, favicon and share image
```

Starter games:

- **Honey Dash**: one-button runner. Jump the hives, grab honey, stay under the bees.
- **Whack-a-Raccoon**: punch raccoons out of trash cans, chase the gold one, spare the cubs.
- **Berry Snake**: classic snake with berries and a timed golden honey bonus.

Also on the floor:

- **Mythica Sanctuary**: a cozy creature-rescue game hosted on the Mythica site ([mythica.greenbearlabs.com/sanctuary](https://mythica.greenbearlabs.com/sanctuary/)). Its cabinet links out using the `url` field in `shared/games.js`.

Everything is plain HTML, CSS and JavaScript with no build step and no dependencies. Best scores live in the player's browser.

## Run it locally

Any static file server works, for example:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Add a new game

1. Copy one of the folders in `games/` to `games/your-game/`.
2. Write the game in its `game.js`, using the helpers in `shared/arcade.js` (`Arcade.setupCanvas`, `Arcade.overlay`, `Arcade.saveBest`, `Arcade.sfx`, `Arcade.drawBear`).
3. Add an entry to `shared/games.js`.
4. Add an attract-mode loop for its cabinet screen in `hub.js` (the `attract` object, keyed by slug).

## Deploy

It's a static site, so any static host works (Vercel, Netlify, Cloudflare Pages or GitHub Pages). Serve the repository root, and point `arcade.greenbearlabs.com` at it with a CNAME record.
