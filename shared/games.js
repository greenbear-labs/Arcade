// The list of cabinets on the arcade floor. Add a game here and it shows up in the Den.
// `added` is the day the game joined the Den (YYYY-MM-DD). The floor shows the newest first;
// games added the same day keep the newest (lowest in this list) first.
// A game hosted elsewhere sets `url` (and `meta`, the text shown instead of the best score).
window.ARCADE_GAMES = [
  {
    slug: "honey-dash",
    added: "2026-10-17",
    title: "Honey Dash",
    tagline: "Jump the hives, grab the honey, don't stop running.",
    controls: "One button",
    color: "#f7b52c",
  },
  {
    slug: "whack-a-raccoon",
    added: "2026-10-17",
    title: "Whack-a-Raccoon",
    tagline: "Trash bandits incoming. Punch fast, spare the cubs.",
    controls: "Tap or 1–9",
    color: "#e63b2e",
  },
  {
    slug: "berry-snake",
    added: "2026-10-17",
    title: "Berry Snake",
    tagline: "Eat berries, grow long, don't bite your own tail.",
    controls: "Arrows or swipe",
    color: "#6cc63a",
  },
  {
    slug: "chow-pow",
    added: "2026-10-23",
    title: "Chow Pow - Street Brawl",
    tagline: "Spicy Punch vs Haunted Noodle Row. Smash, dodge, take down Madam Pirogi.",
    controls: "Keys or touch",
    color: "#ff5a1f",
    // Built in Unity (WebGL); it doesn't report scores to the Den.
    meta: "STAGE 1",
  },
  {
    slug: "chow-pow-rock",
    added: "2026-10-23",
    title: "Chow Pow - Battle of the Bands",
    tagline: "Sour Bomb Sandy battles a band from every faction. Hit the notes, win the crowd.",
    controls: "Keys or tap",
    color: "#ff3fa4",
    // Unity (WebGL) rhythm game; progress and stars save in the player's browser, not in the Den.
    meta: "9 STAGES",
  },
  {
    slug: "chow-pow-pirates",
    added: "2026-10-24",
    title: "Chow Pow - Pizza Pirates",
    tagline: "The Burgers are firing their lunch at you. Swipe the cutlass, slash it all.",
    controls: "Swipe or mouse",
    color: "#ffcf4a",
    // Unity (WebGL) slicing game; best plunder saves in the player's browser, not in the Den.
    meta: "FOOD FIGHT",
  },
  {
    slug: "chow-pow-cereal",
    added: "2026-10-25",
    title: "Chow Pow - Breakfast Conquest",
    tagline: "Soggy Mastermind vs the Citrus Cyborgs. Drag your cereal armies across the map and take every city.",
    controls: "Drag or mouse",
    color: "#f2b632",
    // Unity (WebGL) strategy game; stars and best times save in the player's browser, not in the Den.
    meta: "6 MAPS",
  },
  {
    slug: "chow-pow-castle",
    added: "2026-10-25",
    title: "Chow Pow - Brain Freeze Fortress",
    tagline: "Madame Mint Chip vs the Barbaric Burgers. Pull back, let fly, and hold the ice cream castle's gate.",
    controls: "Drag or mouse",
    color: "#8fe3c8",
    // Unity (WebGL) castle-defense game; stars and best scores save in the player's browser, not in the Den.
    meta: "10 WAVES",
  },
  {
    slug: "mythica-sanctuary",
    added: "2026-10-21",
    title: "Mythica Sanctuary",
    tagline: "Rescue hurt creatures, heal them and earn their trust.",
    controls: "Tap",
    color: "#e6c795",
    // Hosted on the Mythica site; external games open their own URL and show a note instead of a best score.
    url: "https://mythica.greenbearlabs.com/sanctuary/",
    meta: "SAVES PROGRESS",
  },
  {
    slug: "singing-mythica",
    added: "2026-10-27",
    title: "Singing Mythica",
    tagline: "Hatch Mythica's creatures on a singing island. Each one sings its part; breed them to find every magic.",
    controls: "Tap or mouse",
    color: "#7fd1e6",
    // Unity (WebGL) creature-music game; the island saves in the player's browser, not in the Den.
    meta: "120 TO FIND",
  },
  {
    slug: "mythica-farmer",
    added: "2026-10-28",
    title: "Mythica Farmer",
    tagline: "Grow crops through the seasons, raise chickens, make friends, and dig for gems in the mine.",
    controls: "Keys or touch",
    color: "#7cc95a",
    // Unity (WebGL) farming game; the farm saves in the player's browser each night, not in the Den.
    meta: "SPRING 1",
  },
  {
    slug: "dwarves-vs-orcs",
    added: "2026-11-11",
    title: "Dwarves vs Orcs",
    tagline: "Play as dwarves, men or orcs. Gather, build and march to war against the enemy stronghold.",
    controls: "Mouse or touch",
    color: "#d8a63a",
    // Unity (WebGL) real-time strategy game; it doesn't report scores to the Den.
    meta: "BEST ON PC",
  },
  {
    slug: "leukocyte",
    added: "2026-11-16",
    title: "Leukocyte",
    tagline: "You're a white blood cell. Hold the artery, take the lungs back from the germs.",
    controls: "Mouse or touch",
    color: "#e8486a",
    // Unity (WebGL) first-person shooter; it doesn't report scores to the Den.
    meta: "2 MODES",
  },
  {
    slug: "froggy-farm",
    added: "2026-11-19",
    title: "Froggy Farm",
    tagline: "For little ones: feed the frog bugs, wave the magic wand, build silly ice creams, carve glowing pumpkins, wash muddy trucks. No reading, no losing.",
    controls: "Tap and drag",
    color: "#5cc84a",
    // Toddler toy (plain HTML/SVG, sound made in code). It installs as a tablet app and plays offline; no scores.
    meta: "AGES 2+",
  },
  {
    slug: "upgrade-island",
    added: "2026-11-19",
    title: "Upgrade Island",
    tagline: "The plane went down. Help Kai find berries and coconuts, make tools, and build a camp on the island.",
    controls: "Tablet touch",
    color: "#3fb2c9",
    // three.js survival game made for tablets. It installs as a tablet app and plays offline; the island saves in the player's browser.
    meta: "AGES 6+",
  },
  {
    slug: "fossil-fury",
    added: "2026-11-19",
    title: "Fossil Fury",
    tagline: "A stone age roguelike. Throw rocks, dodge dinos, dig through three cave floors and topple the beast.",
    controls: "Keys, mouse or touch",
    color: "#e0703a",
    // Single-file HTML5 canvas roguelike; the deepest floor reached saves in the player's browser, not in the Den.
    meta: "3 FLOORS",
  },
  {
    slug: "full-moon-drive-thru",
    added: "2026-11-20",
    title: "Full Moon Drive-Thru",
    tagline: "A werewolf is loose in the Mega Moonburger. Slam doors on it, grease its path, finish tasks, survive till closing. Play online with friends.",
    controls: "Keys or touch",
    color: "#ffcf3a",
    // Peer-to-peer multiplayer (2-6 players, room codes) or practice with bots; it doesn't report scores to the Den.
    meta: "2-6 PLAYERS",
  },
  {
    slug: "lane-racer",
    added: "2026-11-24",
    title: "Lane Racer",
    tagline: "For little drivers: pick a car and a place, tap left or right to switch lanes, grab coins and win trophies. No losing.",
    controls: "Tap or swipe",
    color: "#4cc3ff",
    // Toddler lane racer (plain HTML/canvas, sound made in code). It installs as a tablet app and plays offline; no scores.
    meta: "AGES 2+",
  },
];
