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

- **Chow Pow - Street Brawl**: Spicy Punch fights down Haunted Noodle Row and takes on Madam Pirogi. It's a Unity WebGL build in `games/chow-pow/Build`; rebuild it in the Unity project with **Chow Pow > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here.

- **Chow Pow - Battle of the Bands**: a rhythm game where Sour Bomb Sandy and the Hard-core Candies take on a rival band from every Chow Pow faction across nine stages, sideways or upright. It's a Unity WebGL build in `games/chow-pow-rock/Build`; rebuild it in the CandyRockGame Unity project with **Chow Pow > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. All its music is original, written for the game. It also installs as a phone app (Add to Home Screen): `manifest.webmanifest`, `icons/` and `sw.js` in its folder make it launch full screen and play offline after the first load. The service worker checks each build file with the server on launch and only downloads one again when it changed, so swapping in a new build needs no version bump.

- **Chow Pow - Pizza Pirates**: a food-slicing game where Captain Crust swipes his cutlass through everything the Barbaric Burgers fire at his deck. It's a Unity WebGL build in `games/chow-pow-pirates/Build`; rebuild it in the PizzaPirateGame Unity project with **Chow Pow > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. Its art, music and sound are all original, made for the game.

- **Singing Mythica**: hatch the creatures of Mythica on an island where each one sings its own part, and breed them to find all six magic types for every creature. It's a Unity WebGL build in `games/singing-mythica/Build`, made from the [SingingMythica](https://github.com/greenbear-labs/SingingMythica) Unity project; rebuild it there with **Mythica > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. Like Battle of the Bands, it installs as a phone app (Add to Home Screen) and plays offline after it has loaded once, using `manifest.webmanifest`, `icons/` and `sw.js` in its folder.

- **Claude Farmer**: a cozy pixel farm. Dig and water a field, grow turnips and strawberries, fish the pond, bonk slimes and sell everything to Mabel. It's a Unity WebGL build in `games/claude-farmer/Build`, made from the ClaudeFarmer Unity project; rebuild it there with **Tools > Farm Demo > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. All its art is original, drawn for the game. On a phone it shows a joystick and buttons, and like Battle of the Bands it installs as a phone app and plays offline after it has loaded once (`manifest.webmanifest`, `icons/` and `sw.js` in its folder).

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
