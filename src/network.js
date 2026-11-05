
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:8787/room/demo";

export class NetworkClient {
  constructor(onSnapshot, onStatus) {
    this.onSnapshot = onSnapshot;
    this.onStatus = onStatus;

    this.socket = null;
    this.id = null;
    this.players = new Map();

    this.lastSend = 0;
    this.lastPosition = null;
    this.sendInterval = 200;
  }

  connect(name) {
    try {
      const url = new URL(WS_URL);

      url.searchParams.set(
        "name",
        name.slice(0, 18)
      );

      this.socket = new WebSocket(url);

      this.socket.addEventListener("open", () => {
        this.onStatus("online");
      });

      this.socket.addEventListener("message", (event) => {
        let message;

        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === "welcome") {
          this.id = message.id;
        }

        if (message.type === "snapshot") {
          this.players = new Map(
            message.players
              .filter(player => player.id !== this.id)
              .map(player => [player.id, player])
          );

          this.onSnapshot([
            ...this.players.values()
          ]);
        }
      });

      this.socket.addEventListener("close", () => {
        this.onStatus("offline");
      });

      this.socket.addEventListener("error", () => {
        this.onStatus("offline");
      });

    } catch {
      this.onStatus("offline");
    }
  }

  sendPosition(position, rotation, vehicle, name) {
    const now = performance.now();

    if (now - this.lastSend < this.sendInterval) {
      return;
    }

    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const current = {
      x: position.x,
      y: position.y,
      z: position.z,
      rotation,
      vehicle,
      name
    };

    // Avoid sending unchanged positions.
    if (this.lastPosition) {
      const dx = current.x - this.lastPosition.x;
      const dy = current.y - this.lastPosition.y;
      const dz = current.z - this.lastPosition.z;

      const moved =
        dx * dx + dy * dy + dz * dz > 0.01;

      const rotated =
        Math.abs(current.rotation - this.lastPosition.rotation) > 0.02;

      const vehicleChanged =
        current.vehicle !== this.lastPosition.vehicle;

      if (!moved && !rotated && !vehicleChanged) {
        return;
      }
    }

    this.socket.send(JSON.stringify({
      type: "move",
      ...current
    }));

    this.lastPosition = current;
    this.lastSend = now;
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
