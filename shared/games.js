// The list of cabinets on the arcade floor. Add a game here and it shows up in the Den.
// A game hosted elsewhere sets `url` (and `meta`, the text shown instead of the best score).
window.ARCADE_GAMES = [
  {
    slug: "honey-dash",
    title: "Honey Dash",
    tagline: "Jump the hives, grab the honey, don't stop running.",
    controls: "One button",
    color: "#f7b52c",
  },
  {
    slug: "whack-a-raccoon",
    title: "Whack-a-Raccoon",
    tagline: "Trash bandits incoming. Punch fast, spare the cubs.",
    controls: "Tap or 1–9",
    color: "#e63b2e",
  },
  {
    slug: "berry-snake",
    title: "Berry Snake",
    tagline: "Eat berries, grow long, don't bite your own tail.",
    controls: "Arrows or swipe",
    color: "#6cc63a",
  },
  {
    slug: "chow-pow",
    title: "Chow Pow",
    tagline: "Spicy Punch vs Haunted Noodle Row. Smash, dodge, take down Madam Pirogi.",
    controls: "Keys or touch",
    color: "#ff5a1f",
    // Built in Unity (WebGL); it doesn't report scores to the Den.
    meta: "STAGE 1",
  },
  {
    slug: "chow-pow-rock",
    title: "Battle of the Bands",
    tagline: "Sour Bomb Sandy battles a band from every faction. Hit the notes, win the crowd.",
    controls: "Keys or tap",
    color: "#ff3fa4",
    // Unity (WebGL) rhythm game; progress and stars save in the player's browser, not in the Den.
    meta: "9 STAGES",
  },
  {
    slug: "chow-pow-pirates",
    title: "Pizza Pirates",
    tagline: "The Burgers are firing their lunch at you. Swipe the cutlass, slash it all.",
    controls: "Swipe or mouse",
    color: "#ffcf4a",
    // Unity (WebGL) slicing game; best plunder saves in the player's browser, not in the Den.
    meta: "FOOD FIGHT",
  },
  {
    slug: "mythica-sanctuary",
    title: "Mythica Sanctuary",
    tagline: "Rescue hurt creatures, heal them and earn their trust.",
    controls: "Tap",
    color: "#e6c795",
    // Hosted on the Mythica site; external games open their own URL and show a note instead of a best score.
    url: "https://mythica.greenbearlabs.com/sanctuary/",
    meta: "SAVES PROGRESS",
  },
];
