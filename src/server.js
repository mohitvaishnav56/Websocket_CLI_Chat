import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";

// create a webserver
const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();

// create the send message service
function send(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({ type, payload }));
}

// create the broadcast message service
function broadcast(room, message, exclude = null) {
  for (const [client, user] of clients) {
    if (
      user.room == room &&
      client != exclude &&
      client.readyState == WebSocket.OPEN
    ) {
      send(client, "message", message);
    }
  }
}

// writing the connection
wss.on("connection", (ws) => {
  ws.id = randomUUID();
  console.log("New Connection: ", ws.id);

  ws.on("error", (err) => {
    console.error(`Socket error (${ws.id}):`, err.message);
  });

  ws.on("message", (raw) => {
    if (raw.length >= 4000) {
      send(ws, "error", "Message too large");
      ws.close(1009, "Message too large");
      return;
    }

    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch (error) {
      send(ws, "error", "Invalid Json");
      return;
    }

    if (!msg || typeof msg !== "object") {
      send(ws, "error", "Invalid message format");
      return;
    }

    // register a username and join a room
    if (msg.type === "join") {
      const username = msg.payload?.username?.trim();
      const room = msg.payload?.room?.trim();

      if (
        typeof username !== "string" ||
        username.length < 1 ||
        username.length > 20 ||
        typeof room !== "string" ||
        room.length < 1 ||
        room.length > 30 ||
        !/^[a-zA-Z0-9_-]+$/.test(username) ||
        !/^[a-zA-Z0-9_-]+$/.test(room)
      ) {
        send(ws, "error", "Invalid username or room");
        return;
      }

      const nameTaken = [...clients.values()].some(
        (u) => u.username.toLowerCase() === username.toLowerCase(),
      );

      if (nameTaken) {
        send(ws, "error", "Username is already taken");
        ws.close(1008, "Username is already taken");
        return;
      }

      clients.set(ws, { username, room });
      send(ws, "system", `Welcome ${username}! to Room: ${room}`);

      broadcast(room, `${username} joined the room`, ws);

      send(
        ws,
        "users",
        [...clients.values()]
          .filter((u) => u.room === room)
          .map((u) => u.username),
      );
      console.log(`${username} joined #${room}`);
      return;
    }

    const user = clients.get(ws);

    if (!user) {
      send(ws, "error", "Join a room first");
      return;
    }

    // group message
    if (msg.type === "group") {
      const text = msg.payload?.text;

      if (typeof text !== "string" || !text.trim() || text.length > 2000) {
        send(ws, "error", "Message must be 1–2000 characters");
        return;
      }

      broadcast(user.room, {
        from: user.username,
        room: user.room,
        text: text.trim(),
        time: new Date().toLocaleTimeString(),
      });
      return;
    }

    // Personal message: /msg username hello
    if (msg.type === "private") {
      const { to, text } = msg.payload ?? {};
      if (
        typeof to !== "string" ||
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 2000
      ) {
        send(ws, "error", "Invalid private message");
        return;
      }

      const recipient = [...clients.entries()].find(
        ([, u]) => u.username.toLowerCase() === to.toLowerCase(),
      );

      if (!recipient) {
        send(ws, "error", `${to} is not online`);
        return;
      }

      const [target] = recipient;

      if (target === ws) {
        send(ws, "error", "You cannot message yourself");
        return;
      }

      const privateMessage = {
        from: user.username,
        to: recipient[1].username,
        text: text.trim(),
        time: new Date().toLocaleTimeString(),
      };

      send(target, "private", privateMessage);
      send(ws, "private-sent", privateMessage);
      return;
    }

    if (msg.type === "users") {
      send(
        ws,
        "users",
        [...clients.values()]
          .filter((u) => u.room === user.room)
          .map((u) => u.username),
      );
      return;
    }

    send(ws, "error", "Unknown event type");
  });

  ws.on("close", () => {
    const user = clients.get(ws);
    clients.delete(ws);

    if (user) {
      broadcast(user.room, `${user.username} left the room`);
      console.log(`${user.username} disconnected`);
    }
  });
});

console.log("Chat server listening on ws://localhost:8080");
