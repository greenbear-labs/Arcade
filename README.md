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

- **Mythica Farmer**: a cozy pixel farm. Dig and water a field, grow crops through four seasons, raise chickens for eggs, fish the pond, bonk slimes and sell everything to Mabel. It's a Unity WebGL build in `games/mythica-farmer/Build`, made from the ClaudeFarmer Unity project; rebuild it there with **Tools > Farm Demo > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. All its art is original, drawn for the game. On a phone it shows a joystick and buttons, and like Battle of the Bands it installs as a phone app and plays offline after it has loaded once (`manifest.webmanifest`, `icons/` and `sw.js` in its folder).

- **Dwarves vs Orcs**: a real-time strategy game in the classic isometric style. Mine, build on the grid, train dwarf axemen, bowmen and boar riders, and burn down the orc warcamp before the raids wear you down. It's a Unity WebGL build in `games/dwarves-vs-orcs/Build`; rebuild it in the MiddleEarthRTS Unity project with **Dwarves vs Orcs > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. It's made for mouse and keyboard; on a phone or tablet it has touch controls and the page suggests playing on a computer. Its art is original, made for the game.

- **Leukocyte**: a first-person shooter where you play a white blood cell in the Host's Immune Corps. Artery Defense is a solo wave mode that ends with the Spore Mother boss. Tissue War is a squad battle over six outposts on a wide lung battlefield, with AI troopers, reinforcement tickets and three classes. It's a Unity WebGL build in `games/leukocyte/Build`, made from the [Leukocyte](https://github.com/greenbear-labs/Leukocyte) Unity project; rebuild it there with **Leukocyte > Build WebGL (for the Arcade)** and copy the four files from `Builds/WebGL/Build` over the ones here. On a phone it shows a move stick, drag-to-look and action buttons, and like Battle of the Bands it installs as a phone app and plays offline after it has loaded once (`manifest.webmanifest`, `icons/` and `sw.js` in its folder).

- **Froggy Farm**: a tap-and-drag toy for toddlers, with no reading and no way to lose. A hub of little games, each with its own mascot. The frog: tickle his belly for bug stickers, drag bugs onto him to feed him, and wave the magic wand to turn things colors and then rainbow. The penguin chef: build an ice cream from cones, scoops and toppings and feed it to the customers. The ghost: pick a pumpkin from the patch, carve its face, watch it glow, and fill the spooky house's porch for a party. The elephant: wash a muddy truck, bus, tractor or race car, paint it (and mix colors), add stickers and send it driving. It's plain HTML/SVG/JavaScript in `games/froggy-farm`, copied from the [point-and-click](https://github.com/greenbear-labs/point-and-click) repo; copy that repo's files over these to update it. All its art is drawn in code and all its sound is made with Web Audio. It installs as a tablet app (Add to Home Screen), plays offline after one load, and a grown-up panel opens when you hold the top-left corner for 3 seconds.

- **Upgrade Island**: a survival game made for tablets. Kai wakes up on a beach after a plane crash; walk over sticks and rocks to collect them, whack palms for coconuts, pick berries, make an ax, shovel, box and bed from picture cards, and keep his food and water up. It's plain HTML/JavaScript on three.js in `games/upgrade-island` (three.js 0.169.0 is kept in its `lib/` folder so it works offline; Kai is `models/Kai_v2.glb`). Walking uses a joystick that appears under the left thumb, and one big button does whatever fits what's nearby. Like Froggy Farm it installs as a tablet app (Add to Home Screen), plays offline after one load and saves the island in the browser.

- **Fossil Fury**: an original stone age roguelike. A caveman kid throws rocks through randomly built cave rooms, picks up goofy items, dodges dinos and takes on a boss at the end of each of three floors (Fern Hollow, Tar Pits, Magma Deeps). It's a single self-contained `index.html` in `games/fossil-fury`, copied from the [caveman-and-dino-roguelike](https://github.com/greenbear-labs/caveman-and-dino-roguelike) repo; all its art is pixel maps drawn in code and all its music and sound are made with Web Audio. To update it, copy that repo's `index.html` over this one and keep the few lines marked `Arcade:` (the favicon and canonical tags in `<head>` and the "The Den" link, which hides itself during a run). It plays with keys, mouse, touch or a gamepad, and the deepest floor reached saves in the browser.
- **Full Moon Drive-Thru**: the arcade's first multiplayer game. A werewolf is loose in the Mega Moonburger (an original, made-up restaurant); one player is the werewolf and the rest survive until closing time, swapping roles every round. 2 to 6 players join with a room code over peer-to-peer WebRTC (PeerJS's free public signaling server; PeerJS is vendored in `vendor/`), or practise with bots. It lives in `games/full-moon-drive-thru`, copied from the [Fast-Food-Werewolf](https://github.com/greenbear-labs/Fast-Food-Werewolf) repo. To update it, copy that repo's `index.html`, `style.css`, `js/` and `vendor/` over these and keep the lines marked `Arcade:` in `index.html` (favicon/canonical tags and the `data-back` link to the Den). There's no TURN relay, so some strict networks can't connect.

- **Lane Racer**: a cheerful lane racer for toddlers, with no reading and no way to lose. Pick one of five race cars and a place (Speedway, Muddy Trail, Snowy Peaks or Sunny Beach), then tap the left or right side (or swipe) to change lanes. Each race lasts about a minute, with a bar showing the car heading for the checkered flag; crossing the finish line wins a trophy. Power-ups make the car rainbow, fast, bubbled or magnetic, and bumping into things just gives a gentle wobble. It's plain HTML/canvas/JavaScript in `games/lane-racer`, copied from the [lane-racer](https://github.com/greenbear-labs/lane-racer) repo; copy that repo's files (everything but its README) over these to update it, and bump `VERSION` in its `sw.js` whenever anything changes, since installed copies play from the saved files. Like Froggy Farm it installs as a tablet app (Add to Home Screen) and plays offline after one load.

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
3. Add an entry to `shared/games.js` with `added` set to today's date (YYYY-MM-DD). The Den lists games newest first, so it shows up at the top.
4. Add an attract-mode loop for its cabinet screen in `hub.js` (the `attract` object, keyed by slug).

## Deploy

It's a static site, so any static host works (Vercel, Netlify, Cloudflare Pages or GitHub Pages). Serve the repository root, and point `arcade.greenbearlabs.com` at it with a CNAME record.
