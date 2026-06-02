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
STEVEGPT_EXTRA_MEMORY=optional_private_extra_details_about_steve
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
fallback replies and does not expose the API key.

## Vercel Setup

This repo includes a Vercel serverless endpoint at `api/chat.js`.

1. Import this GitHub repo into Vercel.
2. In Vercel, open Project Settings > Environment Variables.
3. Add:

```text
OPENAI_API_KEY=your_openai_api_key_here
STEVEGPT_EXTRA_MEMORY=optional_private_extra_details_about_steve
```

4. Deploy the project.

SteveGPT uses `gpt-5.4-mini` in `api/chat.js`. The optional `STEVEGPT_EXTRA_MEMORY`
environment variable lets you add more private Steve-specific memory in Vercel without
putting it into browser files.

If the whole site is hosted on Vercel, the chatbot uses `/api/chat` automatically.

If the site stays on GitHub Pages and only the AI endpoint is on Vercel, update
`js/chat-config.js`:

```js
window.STEVEGPT_API_ENDPOINT = "https://your-vercel-project.vercel.app/api/chat";
```

Then commit and push that change to GitHub Pages. The Vercel endpoint allows browser
requests, but the OpenAI key still stays private inside Vercel.
