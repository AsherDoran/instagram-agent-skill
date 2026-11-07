#!/bin/bash
# Double-click me (Mac). Installs on first run, then starts the dashboard.
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not installed. Get the LTS version at https://nodejs.org, install it, then double-click this file again."
  read -n 1 -s -r -p "Press any key to close."; exit 1
fi
[ -d node_modules ] || { echo "First run: installing (takes a minute)..."; npm install || { read -n 1 -s -r -p "Install failed. Press any key."; exit 1; }; }
(sleep 4; open http://localhost:3000) &
echo "Dashboard running at http://localhost:3000  (close this window to stop it)"
npm run dev
