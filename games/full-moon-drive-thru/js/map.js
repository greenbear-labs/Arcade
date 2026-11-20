// The Mega Moonburger restaurant: a 60x40 tile grid built from rooms, plus the
// special tiles (doors, vents, tubes, slides, conveyors) and where things spawn.
export const TILE = 40;
export const COLS = 60;
export const ROWS = 40;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

// Tile legend
//  #  wall           G  grill / counter   T  table / booth    C  crate      P  play structure
//  .  dining floor   h  hallway           k  kitchen floor    i  freezer ice  q  party floor
//  y  playland mat   b  ball pit          ,  parking lot      > < ^ v  drive-thru conveyor
//  D  swinging door  V  vent (survivors)  O  tube (anyone)    S  slide start  s  slide landing
export const SOLID = new Set(["#", "G", "T", "C", "P"]);

const grid = [];
for (let y = 0; y < ROWS; y++) grid.push(new Array(COLS).fill("#"));
const fill = (x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
};
const set = (x, y, ch) => { grid[y][x] = ch; };

// Outside: parking lot ring with the drive-thru conveyor loop (clockwise)
fill(1, 1, 58, 38, ",");
for (let x = 2; x <= 56; x++) set(x, 2, ">");
for (let y = 2; y <= 36; y++) set(57, y, "v");
for (let x = 3; x <= 57; x++) set(x, 37, "<");
for (let y = 3; y <= 37; y++) set(2, y, "^");
// Building shell
fill(5, 5, 54, 34, "#");

// Top band: kitchen, freezer, party room
fill(6, 6, 21, 15, "k");
fill(23, 6, 30, 15, "i");
fill(32, 6, 53, 15, "q");
// Hallway
fill(6, 17, 53, 18, "h");
// Bottom band: dining hall and playland
fill(6, 20, 31, 33, ".");
fill(33, 20, 53, 33, "y");

// Doors and openings
const door = (x, y) => set(x, y, "D");
door(10, 16); door(11, 16);            // kitchen -> hallway
set(18, 16, "k"); set(19, 16, "k");    // serving pass
door(22, 9); door(22, 10);             // kitchen -> freezer
door(26, 16); door(27, 16);            // freezer -> hallway
door(36, 16); door(37, 16);            // party -> hallway
set(48, 16, "q"); set(49, 16, "q");    // party archway
fill(12, 19, 15, 19, ".");             // hallway -> dining (wide)
door(25, 19); door(26, 19);            // hallway -> dining
door(40, 19); door(41, 19);            // hallway -> playland
set(50, 19, "y"); set(51, 19, "y");    // playland archway
door(32, 25); door(32, 26);            // dining -> playland
door(5, 17); door(5, 18);              // hallway west exit
door(54, 17); door(54, 18);            // hallway east exit
door(14, 34); door(15, 34);            // front doors
door(12, 5); door(13, 5);              // drive-thru window (kitchen)
door(44, 5); door(45, 5);              // party room patio door
set(46, 34, "y"); set(47, 34, "y");    // playland gate

// Kitchen grills and counters
fill(8, 8, 12, 8, "G"); fill(15, 8, 19, 8, "G");
fill(8, 12, 14, 12, "G"); fill(17, 12, 19, 12, "G");
fill(7, 15, 8, 15, "G");
// Freezer crates
set(24, 7, "C"); set(25, 7, "C"); set(29, 7, "C");
set(24, 12, "C"); set(28, 11, "C"); set(29, 12, "C"); set(26, 9, "C");
// Party tables
fill(35, 8, 40, 9, "T"); fill(45, 8, 50, 9, "T"); fill(38, 12, 47, 13, "T");
// Dining booths
for (const x of [8, 13, 18, 23, 28]) for (const y of [22, 26, 30]) fill(x, y, x + 1, y + 1, "T");
// Playland: ball pit, climbing frame
fill(36, 22, 44, 28, "b");
fill(48, 24, 49, 29, "P");
fill(38, 31, 41, 31, "P");
// Parking lot planters
fill(20, 36, 21, 36, "C"); fill(38, 36, 39, 36, "C"); fill(20, 3, 21, 3, "C");

// Links: vents (survivors only), tubes (anyone, two-way), slides (one-way)
export const links = [];
const link = (kind, a, b, oneWay = false) => {
  set(a[0], a[1], kind === "slide" ? "S" : kind === "vent" ? "V" : "O");
  set(b[0], b[1], kind === "slide" ? "s" : kind === "vent" ? "V" : "O");
  links.push({ kind, a, b, oneWay });
};
link("vent", [7, 7], [52, 32]);     // kitchen <-> playland
link("vent", [30, 6], [30, 1]);     // freezer <-> parking lot
link("vent", [53, 6], [7, 33]);     // party room <-> dining hall
link("vent", [31, 21], [1, 22]);    // dining hall <-> west lot
link("vent", [53, 17], [58, 10]);   // hallway <-> east lot
link("tube", [34, 21], [46, 33]);
link("tube", [53, 21], [34, 32]);
link("slide", [50, 20], [40, 25], true);   // slide into the ball pit
link("slide", [6, 6], [6, 1], true);       // garbage chute to the parking lot

export const map = grid.map((row) => row.join(""));

export const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS ? "#" : grid[ty][tx]);
export const tileAtPx = (x, y) => tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
export const isSolid = (tx, ty) => SOLID.has(tileAt(tx, ty));
export const center = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });

// Where a link tile sends you: { to:[tx,ty], kind } or null
const linkIndex = new Map();
for (const l of links) {
  linkIndex.set(`${l.a[0]},${l.a[1]}`, { to: l.b, kind: l.kind });
  if (!l.oneWay) linkIndex.set(`${l.b[0]},${l.b[1]}`, { to: l.a, kind: l.kind });
}
export const linkFrom = (tx, ty) => linkIndex.get(`${tx},${ty}`) || null;

// Swinging doors: adjacent D tiles act as one door
export const doors = [];
export const doorOf = new Map();
{
  const seen = new Set();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== "D" || seen.has(`${x},${y}`)) continue;
    const tiles = [];
    const stack = [[x, y]];
    seen.add(`${x},${y}`);
    while (stack.length) {
      const [cx, cy] = stack.pop();
      tiles.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (tileAt(nx, ny) === "D" && !seen.has(`${nx},${ny}`)) { seen.add(`${nx},${ny}`); stack.push([nx, ny]); }
      }
    }
    const id = doors.length;
    // A door in a horizontal wall is crossed vertically, and vice versa.
    const horizontalWall = tiles.length > 1 ? tiles.every(([, ty]) => ty === tiles[0][1]) : !isSolid(x, y - 1);
    doors.push({ id, tiles, horizontalWall });
    for (const [tx, ty] of tiles) doorOf.set(`${tx},${ty}`, id);
  }
}

export const conveyor = { ">": [1, 0], "<": [-1, 0], "^": [0, -1], "v": [0, 1] };

export const rooms = [
  { name: "KITCHEN", x: 6, y: 6, w: 16, h: 10 },
  { name: "FREEZER", x: 23, y: 6, w: 8, h: 10 },
  { name: "PARTY ROOM", x: 32, y: 6, w: 22, h: 10 },
  { name: "HALLWAY", x: 6, y: 17, w: 48, h: 2 },
  { name: "DINING HALL", x: 6, y: 20, w: 26, h: 14 },
  { name: "PLAYLAND", x: 33, y: 20, w: 21, h: 14 },
  { name: "DRIVE-THRU", x: 1, y: 1, w: 58, h: 3 },
];

export const wolfSpawn = [42, 15];
export const survivorSpawns = [[10, 24], [16, 28], [21, 24], [26, 32], [11, 32], [21, 20]];
export const itemSpots = [
  [14, 10], [20, 14], [27, 14], [33, 6], [52, 11], [42, 10],
  [8, 18], [30, 17], [46, 18], [11, 28], [26, 24], [16, 33],
  [35, 24], [46, 21], [51, 31], [44, 30], [3, 12], [56, 30], [28, 38], [45, 1],
];
