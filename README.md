# PPTX Translator (Papago) — Public via ngrok

## Quick start
```bash
# unzip and enter
npm install
cp .env.example .env
# edit .env with your NCP_KEY_ID / NCP_KEY, choose PAPAGO_BASE
npm start   # local: http://localhost:3000
```

## Public URL via ngrok (one command)
```bash
./run_public.sh
```
- Prompts for keys (if .env missing)
- Starts the server and launches `ngrok http 3000`
- Share the printed https URL

### Requirements
- Node.js 18+
- ngrok installed (`brew install ngrok/ngrok/ngrok`) and authtoken set (`ngrok config add-authtoken <TOKEN>`)
