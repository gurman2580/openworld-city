export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true, service: "openworld-city-realtime" });
    if (url.pathname.startsWith("/room/")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("WebSocket upgrade required", { status: 426 });
      }
      const roomId = url.pathname.split("/")[2] || "demo";
      if (!/^[a-zA-Z0-9_-]{1,40}$/.test(roomId)) return new Response("Invalid room", { status: 400 });
      const id = env.ROOMS.idFromName(roomId);
      return env.ROOMS.get(id).fetch(request);
    }
    return new Response("Openworld City multiplayer service. Connect to /room/<roomId>.", { status: 200 });
  }
};

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.players = new Map();
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request) {
    const url = new URL(request.url);
    const name = (url.searchParams.get("name") || "Player").replace(/[<>]/g, "").slice(0, 18);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const id = crypto.randomUUID();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id, name, x: 0, y: 0, z: 32, rotation: 0, vehicle: false, updatedAt: Date.now() });
    server.send(JSON.stringify({ type: "welcome", id }));
    this.sendSnapshot(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(message); } catch { return; }
    if (!data || data.type !== "move") return;
    const attachment = ws.deserializeAttachment();
    if (!attachment) return;
    const finite = n => Number.isFinite(n) ? Math.max(-320, Math.min(320, n)) : 0;
    attachment.x = finite(data.x);
    attachment.y = Math.max(0, Math.min(10, finite(data.y)));
    attachment.z = finite(data.z);
    attachment.rotation = Number.isFinite(data.rotation) ? data.rotation : 0;
    attachment.vehicle = !!data.vehicle;
    attachment.name = String(data.name || attachment.name).replace(/[<>]/g, "").slice(0, 18);
    attachment.updatedAt = Date.now();
    ws.serializeAttachment(attachment);
    this.broadcast({ type: "snapshot", players: this.getPlayers() });
  }

  webSocketClose(ws) {
    this.broadcast({ type: "snapshot", players: this.getPlayers(ws) });
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }

  getPlayers(exclude = null) {
    const now = Date.now();
    const players = [];
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      const p = ws.deserializeAttachment();
      if (p && now - p.updatedAt < 15000) players.push(p);
    }
    return players;
  }

  sendSnapshot(ws) {
    ws.send(JSON.stringify({ type: "snapshot", players: this.getPlayers(ws) }));
  }

  broadcast(payload, exclude = null) {
    const message = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      try { ws.send(message); } catch {}
    }
  }
}
