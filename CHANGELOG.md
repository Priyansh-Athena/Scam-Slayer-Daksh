# Changelog

## 2.0.0 — Multiplayer rooms and redesigned interface

### Question bank

- Replaced the generic quiz with the 20 Scam Slayer questions supplied for the project.
- Preserved the four-option format, correct answer, and educational tip after every question.
- Updated several statements for safer current wording, including KYC verification, QR/UPI authorisation, SBI's current internet-banking address, call-forwarding scams, investment-group scams, sextortion evidence, and loan-app harassment.

### Multiplayer server

- Added independent six-character room codes.
- Added host and player session tokens for reconnecting after a network drop or refresh.
- Added server-controlled deadlines and score calculation.
- Added host reassignment after a disconnect grace period.
- Added inactive-player and empty-room cleanup.
- Prevented answer choices from being revealed in `playerAnswered` events.
- Added `/health` and `/api/config` endpoints.
- Added graceful shutdown handling for Railway deployments.

### Interface

- Rebuilt the home, lobby, question, results, and final-score screens.
- Added large answer buttons, high-contrast text, focus states, responsive layouts, progress indicators, a circular timer, room sharing, answer distribution, and personalised results.
- Removed third-party fonts and analytics.
- Added reconnect and connection-status feedback.
- Added optional generated sound effects with a persistent mute setting.

### Deployment and quality

- Switched Railway configuration to Railpack.
- Added a deployment healthcheck and current Railway guide.
- Removed obsolete Nixpacks, Procfile, Vercel, and duplicate deployment files.
- Added automated server tests for health, room isolation, answer privacy, scoring, and session restoration.
