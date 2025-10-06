#!/usr/bin/env bash
set -euo pipefail

echo "▶ PPTX Translator public start"

if [ ! -f .env ]; then
  echo "Creating .env (you will be prompted for keys)…"
  read -p "NCP_KEY_ID (Client ID): " NCP_ID
  read -s -p "NCP_KEY (Client Secret): " NCP_SECRET
  echo ""
  echo "Choose Papago base:"
  select c in "naveropenapi" "papago"; do
    case "$REPLY" in
      1) BASE="https://naveropenapi.apigw.ntruss.com/doc-trans/v1"; break;;
      2) BASE="https://papago.apigw.ntruss.com/doc-trans/v1"; break;;
      *) BASE="https://naveropenapi.apigw.ntruss.com/doc-trans/v1"; break;;
    esac
  done
  cat > .env <<EOF
NCP_KEY_ID=${NCP_ID}
NCP_KEY=${NCP_SECRET}
PAPAGO_BASE=${BASE}
PORT=3000
EOF
  echo "Wrote .env"
fi

# Install deps if node_modules absent
if [ ! -d node_modules ]; then
  echo "Installing npm dependencies…"
  npm install
fi

# Ensure ngrok
if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok is not installed. Install via Homebrew: brew install ngrok/ngrok/ngrok"
  echo "Or download from https://ngrok.com/download"
  exit 1
fi

# Ensure ngrok token
if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok config missing. Run: ngrok config add-authtoken <YOUR_TOKEN>"
  exit 1
fi

# Start server
echo "Starting server on http://localhost:3000 …"
(node server.js &) >/dev/null 2>&1
sleep 2

# Start ngrok
echo "Starting ngrok…"
ngrok http 3000
