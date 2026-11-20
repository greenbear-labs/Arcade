// Peer-to-peer networking over WebRTC data channels. PeerJS's free public
// signaling server only introduces the players; after that, game traffic goes
// straight between browsers. The host runs the game; everyone else sends input.
/* global Peer */

const PREFIX = "fullmoon-dt-";
const WORDS = ["BEAR", "WOLF", "FANG", "MOON", "FRY", "TACO", "BUN", "HOWL", "PAW", "SODA", "MEGA", "NUGT"];

export const makeCode = () =>
  WORDS[Math.floor(Math.random() * WORDS.length)] + String(Math.floor(Math.random() * 90) + 10);

export const cleanCode = (raw) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

// ?peer=localhost:9000 points at a self-hosted PeerJS server (used for testing).
function peerOptions() {
  const opts = {
    debug: 1,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    },
  };
  const custom = new URLSearchParams(location.search).get("peer");
  if (custom) {
    const [host, port] = custom.split(":");
    Object.assign(opts, { host, port: Number(port) || 9000, path: "/", secure: location.protocol === "https:" && host !== "localhost" });
  }
  return opts;
}

const friendly = (err) => {
  const t = err && err.type;
  if (t === "peer-unavailable") return "No game found with that code. Check the code and that the host is still in the lobby.";
  if (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed") return "Couldn't reach the matchmaking server. Check your internet connection and try again.";
  if (t === "browser-incompatible") return "This browser doesn't support online play. Try Chrome, Edge, Firefox or Safari.";
  if (t === "webrtc") return "Couldn't connect directly to the host. Some networks block this; try both players on the same Wi-Fi.";
  return (err && err.message) || "Connection problem.";
};

export class HostNet {
  constructor({ onOpen, onJoin, onMessage, onLeave, onError }) {
    this.conns = new Map();
    this.handlers = { onOpen, onJoin, onMessage, onLeave, onError };
    this.tries = 0;
    this.open();
  }

  open() {
    this.code = makeCode();
    const peer = new Peer(PREFIX + this.code.toLowerCase(), peerOptions());
    this.peer = peer;
    peer.on("open", () => this.handlers.onOpen(this.code));
    peer.on("error", (err) => {
      if (err.type === "unavailable-id" && this.tries++ < 5) { peer.destroy(); this.open(); return; }
      this.handlers.onError(friendly(err), err);
    });
    peer.on("disconnected", () => {
      // Lost the signaling server. Existing players stay connected; try to come back for new joiners.
      if (!peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on("connection", (conn) => {
      conn.on("open", () => {
        this.conns.set(conn.peer, conn);
        this.handlers.onJoin(conn.peer);
      });
      conn.on("data", (msg) => this.handlers.onMessage(conn.peer, msg));
      const gone = () => {
        if (!this.conns.has(conn.peer)) return;
        this.conns.delete(conn.peer);
        this.handlers.onLeave(conn.peer);
      };
      conn.on("close", gone);
      conn.on("error", gone);
    });
  }

  send(id, msg) {
    const c = this.conns.get(id);
    if (c && c.open) c.send(msg);
  }

  broadcast(msg) {
    for (const c of this.conns.values()) if (c.open) c.send(msg);
  }

  kick(id) {
    const c = this.conns.get(id);
    if (c) { this.conns.delete(id); c.close(); }
  }

  close() {
    for (const c of this.conns.values()) c.close();
    this.conns.clear();
    if (this.peer) this.peer.destroy();
  }
}

export class ClientNet {
  constructor(code, { onOpen, onMessage, onClose, onError }) {
    this.handlers = { onOpen, onMessage, onClose, onError };
    this.closed = false;
    const peer = new Peer(peerOptions());
    this.peer = peer;
    let timer = null;
    peer.on("open", () => {
      const conn = peer.connect(PREFIX + code.toLowerCase(), { reliable: true, serialization: "json" });
      this.conn = conn;
      timer = setTimeout(() => {
        if (!conn.open) this.fail("Couldn't connect to the host. Some networks block direct connections; try both players on the same Wi-Fi.");
      }, 15000);
      conn.on("open", () => { clearTimeout(timer); onOpen(); });
      conn.on("data", (msg) => onMessage(msg));
      conn.on("close", () => { if (!this.closed) { this.closed = true; onClose(); } });
      conn.on("error", (err) => this.fail(friendly(err)));
    });
    peer.on("error", (err) => { clearTimeout(timer); this.fail(friendly(err)); });
  }

  fail(text) {
    if (this.closed) return;
    this.closed = true;
    this.handlers.onError(text);
    this.close();
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  close() {
    this.closed = true;
    if (this.peer) this.peer.destroy();
  }
}
