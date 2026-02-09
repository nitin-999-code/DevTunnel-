# DevTunnel+ - Local Developer Tunneling Solution

This repository contains the full source code for DevTunnel+, a powerful alternative to ngrok for exposing local servers to the internet.

## Project Structure

The project is split into two main standalone folders:

| Folder | Description | Tech Stack |
|--------|-------------|------------|
| **`frontend/`** | The Dashboard UI | React, Vite, Tailwind CSS |
| **`backend/`** | The Gateway Server & CLI | Node.js, Express, WebSocket |

---

## 🚀 Getting Started

You will need two terminal windows to run the full application.

### 1. Start the Backend (Gateway Server)

This runs the core server that handles all tunnel connections.

```bash
cd backend
npm install
npm run dev
```

*Server runs at:* `http://localhost:3000`

### 2. Start the Frontend (Dashboard)

This runs the UI for inspecting requests and managing tunnels.

```bash
cd frontend
npm install
npm run dev
```

*Dashboard runs at:* `http://localhost:3002`

---

## 💻 Using the CLI

To start a tunnel for your local app, use the included CLI tool from the `backend` directory.

```bash
# In inside the backend folder
npm run cli -- start 8080
```
*(Replace `8080` with the port of your local application)*

---

## Features

- **HTTP & WebSocket Tunneling**: Seamlessly forward traffic to localhost.
- **Request Inspector**: View headers, body, and timing for every request.
- **Replay & Diff**: Replay requests and compare responses side-by-side.
- **Traffic Control**: Throttle speeds, inject latency, or block IPs for testing.
- **Security**: IP Whitelisting/Blacklisting and API Key authentication.
