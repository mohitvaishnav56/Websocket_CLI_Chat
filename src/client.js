
import { WebSocket } from "ws";
import readline from "node:readline";

const username = process.argv[2];
const room = process.argv[3] || "general";

if (!username) {
  console.log("Usage: node client.js <username> [room]");
  process.exit(1);
}

const ws = new WebSocket("ws://localhost:8080");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${username}> `
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
  const { type, payload } = JSON.parse(raw.toString());

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
    console.log("\nOnline in room:", payload.join(", "));
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
  } else if (input.startsWith("/msg ")) {
    const match = input.match(/^\/msg\s+(\S+)\s+(.+)$/);

    if (!match) {
      console.log("Usage: /msg <username> <message>");
    } else {
      send("private", {
        to: match[1],
        text: match[2]
      });
    }
  } else if (input) {
    send("group", { text: input });
  }

  rl.prompt();
});

ws.on("close", () => {
  console.log("\nDisconnected from server.");
  rl.close();
});

ws.on("error", (err) => {
  console.error("\nConnection error:", err.message);
});
