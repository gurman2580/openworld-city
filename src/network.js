const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8787/room/demo";

export class NetworkClient {
  constructor(onSnapshot, onStatus) {
    this.onSnapshot = onSnapshot;
    this.onStatus = onStatus;
    this.socket = null;
    this.id = null;
    this.players = new Map();
    this.lastSend = 0;
    this.pending = null;
  }

  connect(name) {
    try {
      const url = new URL(WS_URL);
      url.searchParams.set("name", name.slice(0, 18));
      this.socket = new WebSocket(url);
      this.socket.addEventListener("open", () => this.onStatus("online"));
      this.socket.addEventListener("message", (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === "welcome") this.id = message.id;
        if (message.type === "snapshot") {
          this.players = new Map(message.players.filter(p => p.id !== this.id).map(p => [p.id, p]));
          this.onSnapshot([...this.players.values()]);
        }
      });
      this.socket.addEventListener("close", () => this.onStatus("offline"));
      this.socket.addEventListener("error", () => this.onStatus("offline"));
    } catch {
      this.onStatus("offline");
    }
  }

  sendPosition(position, rotation, vehicle, name) {
    const now = performance.now();
    if (now - this.lastSend < 80) return;
    this.lastSend = now;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({
      type: "move",
      x: position.x, y: position.y, z: position.z,
      rotation, vehicle, name
    }));
  }

  close() { if (this.socket) this.socket.close(); }
}
