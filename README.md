# WebSocket CLI Chat

A real-time, terminal-based chat application built with Node.js and WebSockets. Supports room-based group chats, private messaging, and user discovery.

---

## Features

- **Room-Based Group Chat:** Join any room (`general` by default) and chat with all active members in real-time.
- **Direct Messaging:** Send private messages across users using `/msg <username> <message>`.
- **Member Discovery:** View the list of online members in your current room with `/users`.
- **Validation & Safety:** Input character limits, regex validation for usernames and room names, safe message parsing, and size checks.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm`

---

## Installation

```bash
git clone https://github.com/mohitvaishnav/Websocket_CLI_Chat.git
cd Websocket_CLI_Chat
npm install
```

---

## Usage

### 1. Start the Server

Start the WebSocket server on port `8080`:

```bash
npm start
# or for development
npm run dev
```

### 2. Connect a Client

Open a new terminal window for each client:

```bash
node src/client.js <username> [room]
```

Examples:
```bash
# Joins the default 'general' room
node src/client.js Alice

# Joins a custom room 'devs'
node src/client.js Bob devs
```

---

## Commands

| Command | Description |
|---|---|
| `<message>` | Send a message to everyone in the current room |
| `/msg <username> <message>` | Send a direct/private message to a specific user |
| `/users` | List all users online in your current room |
| `/quit` | Leave the chat and disconnect cleanly |

---

## Project Structure

```text
├── src/
│   ├── server.js     # WebSocket server and event handling
│   └── client.js     # CLI client with Readline interface
├── package.json
└── README.md
```
