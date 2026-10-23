import { WebSocket } from "ws";
import readline from "node:readline";

const username = process.argv[2]?.trim();
const room = (process.argv[3] || "general").trim();

if (!username || !/^[a-zA-Z0-9_-]+$/.test(username) || username.length > 20) {
  console.log("Usage: node src/client.js <username> [room]");
  console.log("Username must be 1-20 alphanumeric characters (or _, -).");
  process.exit(1);
}

if (!/^[a-zA-Z0-9_-]+$/.test(room) || room.length > 30) {
  console.log("Room must be 1-30 alphanumeric characters (or _, -).");
  process.exit(1);
}

const ws = new WebSocket("ws://localhost:8080");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${username}> `,
});

function send(type, payload) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.log("\nNot connected.");
    return;
  }

  ws.send(JSON.stringify({ type, payload }));
}

ws.on("open", () => {
  send("join", { username, room });

  console.log("\nCommands:");
  console.log("  /msg <username> <message>  Private message");
  console.log("  /users                     List room members");
  console.log("  /quit                      Exit chat\n");

  rl.prompt();
});

ws.on("message", (raw) => {
  let data;
  try {
    data = JSON.parse(raw.toString());
  } catch {
    return;
  }

  const { type, payload } = data;

  if (type === "message") {
    if (typeof payload === "string") {
      console.log(`\n[GROUP] ${payload}`);
    } else {
      console.log(
        `\n[GROUP #${payload.room}] ${payload.from}: ${payload.text} (${payload.time})`
      );
    }
  } else if (type === "private" || type === "private-sent") {
    console.log(
      `\n[PRIVATE] ${payload.from} → ${payload.to}: ${payload.text}`
    );
  } else if (type === "users") {
    console.log("\nOnline in room:", Array.isArray(payload) ? payload.join(", ") : "");
  } else if (type === "system") {
    console.log(`\n[SYSTEM] ${payload}`);
  } else if (type === "error") {
    console.log(`\n[ERROR] ${payload}`);
  }

  rl.prompt();
});

rl.on("line", (line) => {
  const input = line.trim();

  if (input === "/quit") {
    ws.close();
    rl.close();
    return;
  }

  if (input === "/users") {
    send("users", {});
  } else if (input.startsWith("/msg")) {
    const match = input.match(/^\/msg\s+(\S+)\s+(.+)$/);

    if (!match) {
      console.log("Usage: /msg <username> <message>");
    } else {
      send("private", {
        to: match[1],
        text: match[2],
      });
    }
  } else if (input.startsWith("/")) {
    console.log(`Unknown command: ${input}`);
    console.log("Available commands: /msg <user> <message>, /users, /quit");
  } else if (input) {
    send("group", { text: input });
  }

  rl.prompt();
});

rl.on("close", () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  process.exit(0);
});

ws.on("close", () => {
  console.log("\nDisconnected from server.");
  rl.close();
});

ws.on("error", (err) => {
  console.error("\nConnection error:", err.message);
});
