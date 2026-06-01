# SteveGPT Capstone Site

This site includes a private chat endpoint for the SteveGPT capstone demo.

## Local Setup

1. Create a private `.env` file:

```bash
cp .env.example .env
```

2. Put your OpenAI API key in `.env`:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

3. Start the site:

```bash
python3 server.py
```

If Node/npm is installed, this also works:

```bash
npm start
```

4. Open:

```text
http://127.0.0.1:3000/capstone/index.html
```

## Important

Do not put an OpenAI API key in `js/chatbot.js`, `index.html`, or any other browser file.
Browser files are public. The key belongs only in `.env` locally or in private deployment
environment variables on a server.

## Deployment Note

GitHub Pages can host the static HTML, CSS, and JavaScript files, but it cannot run
`server.py` or `server.js`. On GitHub Pages, the chat interface still works with local
fallback replies and does not expose the API key. To make real OpenAI replies work
online, deploy the server to a host that supports Python or Node.js, or move `/api/chat`
into a serverless function on a platform such as Vercel, Netlify, or Render.
