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
