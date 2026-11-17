#!/bin/bash
# ==============================================================================
# QuickDrop Localhost Launcher
# ==============================================================================

DIR="/Users/gahasapurba/Personal/Work/Repositories/AI-Project/quick-drop"
PORT=3333

# Cek apakah server sudah jalan di port 3333
PID=$(lsof -ti :$PORT)

if [ -z "$PID" ]; then
  NODE_BIN=$(which node || echo "/Users/gahasapurba/.nvm/versions/node/v24.16.0/bin/node")
  "$NODE_BIN" "$DIR/server.js" > /dev/null 2>&1 &
  sleep 1
fi

# Buka URL localhost di browser default
open "http://localhost:$PORT"
