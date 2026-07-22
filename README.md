# Scam Slayer

**Learn it. Spot it. Stop it.**

Scam Slayer is a room-based, live multiplayer cyber-safety quiz designed for senior citizens and families in India. One player hosts a private room, others join with a six-character code, and everyone answers the same 20 real-life fraud-awareness questions together.

## What changed in version 2

- Replaced the old question bank with all 20 scenarios from the supplied Scam Slayer document.
- Refreshed a few safety statements where current official guidance or website addresses have changed.
- Added private room codes so unrelated groups do not enter the same game.
- Added reconnectable player sessions, host transfer, server-controlled timers, and multiple simultaneous rooms.
- Prevented selected answers from being broadcast before a question ends.
- Rebuilt the interface for clearer type, stronger contrast, large answer targets, mobile use, accessible focus states, and a dedicated safety-tip screen.
- Added a health endpoint and Railway configuration.

## Tech stack

- Node.js 20+
- Express
- Socket.IO
- Plain HTML, CSS, and JavaScript

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000` in two browser windows. Host a room in one window and join using the room code in the other.

For automatic restarts while editing:

```bash
npm run dev
```

Run the automated checks with:

```bash
npm test
```

## Environment variables

| Variable | Default | Purpose |
| --- | ---: | --- |
| `PORT` | `3000` | Port used by the web server. Railway supplies this automatically. |
| `QUESTION_TIME_SECONDS` | `60` | Time per question. Accepted range: 15–180 seconds. |
| `MAX_PLAYERS_PER_ROOM` | `50` | Maximum players in one room. Accepted range: 2–200. |
| `FRONTEND_URL` | empty | Optional comma-separated Socket.IO origin allow-list when the frontend is hosted separately. |

## Important hosting note

Room membership, scores, timers, and reconnect tokens are currently kept in the Node.js process memory. Deploy this version with **one running replica**. A restart or new deployment clears active rooms.

Horizontal scaling requires two changes rather than only adding replicas:

1. Move room and game state to a shared store such as Redis or a database.
2. Configure a compatible Socket.IO multi-node adapter and load-balancing strategy.

## Project structure

```text
.
├── public/
│   ├── index.html
│   ├── script.js
│   ├── sounds.js
│   ├── style.css
│   └── favicon.svg
├── test/
│   └── server.test.js
├── questions.js
├── server.js
├── railway.toml
├── DEPLOYMENT.md
└── package.json
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for Railway deployment instructions.

## Safety disclaimer

This is an educational awareness tool, not legal, financial, or law-enforcement advice. For urgent financial cyber fraud in India, call **1930** promptly and report through the official National Cyber Crime Reporting Portal.
