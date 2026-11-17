#!/bin/bash
DIR="/Users/gahasapurba/Personal/Work/Repositories/AI-Project/quick-drop"
PORT=3333

# Cek port
if ! lsof -ti :$PORT >/dev/null 2>&1; then
  NODE_BIN="/Users/gahasapurba/.nvm/versions/node/v24.16.0/bin/node"
  if [ ! -f "$NODE_BIN" ]; then
    NODE_BIN=$(which node)
  fi
  nohup "$NODE_BIN" "$DIR/server.js" > /dev/null 2>&1 &
  sleep 1
fi

open "http://localhost:$PORT"
