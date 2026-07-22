# Deploy Scam Slayer on Railway

This app uses a persistent Node.js process and WebSockets through Socket.IO, so deploy the frontend and server together as one Railway service.

## Recommended method: GitHub deployment

### 1. Put the project in a GitHub repository

From the project folder:

```bash
git init
git add .
git commit -m "Scam Slayer multiplayer v2"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Do not commit `node_modules` or local `.env` files.

### 2. Create the Railway service

1. Sign in to Railway.
2. Create a new project.
3. Choose **Deploy from GitHub repo**.
4. Select the repository and the `main` branch.
5. Railway will detect Node.js with Railpack, install dependencies, and run `npm start`.

The included `railway.toml` sets:

- Railpack as the builder
- `npm start` as the start command
- `/health` as the deployment healthcheck
- restart-on-failure behaviour

### 3. Generate the public URL

After the first build:

1. Open the service.
2. Go to **Settings**.
3. Open **Networking / Public Networking**.
4. Choose **Generate Domain**.

Railway will provide an HTTPS domain. Open it in two devices or browser windows to test hosting and joining a room.

### 4. Add optional variables

Open the service's **Variables** tab. These are optional:

```text
QUESTION_TIME_SECONDS=60
MAX_PLAYERS_PER_ROOM=50
```

Do not hard-code Railway's `PORT`. Railway injects it automatically, and `server.js` already listens on `0.0.0.0` using that value.

### 5. Keep one replica

In the service scaling settings, keep the replica count at **1**. The current version stores live rooms, answers, scores, and timers in process memory. Two replicas could hold different versions of the same room.

It is safe to increase CPU or memory for the single replica if needed. Before horizontal scaling, move game state to a shared store and add a Socket.IO adapter designed for multiple nodes.

### 6. Verify the deployment

Open:

```text
https://YOUR_RAILWAY_DOMAIN/health
```

A healthy deployment returns JSON similar to:

```json
{
  "status": "ok",
  "rooms": 0,
  "questions": 20,
  "uptimeSeconds": 15
}
```

Then test the complete flow:

1. Host a room on one device.
2. Join from another device using the six-character code.
3. Start the quiz and submit answers from both devices.
4. Refresh one device during a question and confirm it rejoins.

## Automatic deployments

When the Railway service is connected to GitHub, a push to the selected branch triggers a new build and deployment. Active rooms are cleared during a new deployment because the game state is in memory.

## CLI alternative

Install and sign in to the Railway CLI, then run the following from the project directory:

```bash
railway login
railway init
railway up
railway domain
```

The GitHub method is usually easier for ongoing updates because every push can deploy automatically.

## Troubleshooting

### Deployment says the application did not respond

- Check the deployment logs for an `npm start` error.
- Confirm `package.json`, `package-lock.json`, `server.js`, and `railway.toml` are at the service root.
- Do not replace the generated `PORT` with a fixed value.
- Confirm `/health` returns HTTP 200 locally.

### Players disconnect briefly

Socket.IO reconnects automatically, and the app restores the saved room token. A full Railway restart or deployment still clears rooms because state is not persisted.

### A room works locally but not after adding replicas

Return the service to one replica. Multi-replica Socket.IO requires shared application state and a multi-node adapter; this build is intentionally configured as a single-process room server.

### A room code no longer exists

Rooms are temporary. Empty rooms are cleaned up, and all rooms disappear when the service restarts or redeploys. Create a new room.
