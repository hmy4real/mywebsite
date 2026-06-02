from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "3000"))


def load_env():
    env_path = ROOT / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


class SteveGPTHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_json(404, {"error": "Not found."})
            return

        try:
            self.handle_chat()
        except Exception as error:
            print(error)
            self.send_json(500, {"error": "Something went wrong."})

    def handle_chat(self):
        api_key = os.environ.get("XAI_API_KEY")

        if not api_key:
            self.send_json(500, {
                "error": "Missing XAI_API_KEY. Add it to your .env file."
            })
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(content_length) or b"{}")
        user_message = str(body.get("message", "")).strip()

        if not user_message:
            self.send_json(400, {"error": "Message is required."})
            return

        messages = body.get("messages", [])
        input_messages = []

        if isinstance(messages, list):
            for message in messages[-10:]:
                role = message.get("role")

                if role not in ("user", "assistant"):
                    continue

                input_messages.append({
                    "role": role,
                    "content": str(message.get("content", ""))[:2000]
                })

        if not input_messages or input_messages[-1]["content"] != user_message:
            input_messages.append({"role": "user", "content": user_message})

        payload = {
            "model": os.environ.get("XAI_MODEL", "grok-4.3"),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are SteveGPT, Steve's casual capstone chatbot. "
                        "Talk like a smart, blunt student, not customer support. "
                        "Keep replies concise and natural. Most casual replies should be 1-4 short lines. "
                        "If asked what you are, explain briefly that you are SteveGPT, an AI chatbot integrated into Steve's capstone page."
                    )
                },
                *input_messages
            ],
            "temperature": 0.9
        }

        request = Request(
            "https://api.x.ai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        try:
            with urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            details = json.loads(error.read().decode("utf-8"))
            api_error = details.get("error", {}).get("message", "xAI request failed.")
            print(details)
            self.send_json(200, {
                "reply": get_fallback_reply(user_message),
                "source": "fallback",
                "apiError": api_error
            })
            return
        except URLError as error:
            print(error)
            self.send_json(200, {
                "reply": get_fallback_reply(user_message),
                "source": "fallback",
                "apiError": "Could not reach xAI."
            })
            return

        reply = ""
        choices = data.get("choices")
        if choices:
            reply = choices[0].get("message", {}).get("content", "")

        self.send_json(200, {
            "reply": reply or "I am here, but I could not form a reply just now."
        })

    def send_json(self, status, body):
        response = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def get_fallback_reply(message):
    message = message.lower()

    if "hello" in message or "hi" in message:
        return "yo. endpoint is connected, but im fallback rn until the xAI reply works."

    if "capstone" in message or "project" in message:
        return "its steve's capstone demo lol. public chat page, private ai endpoint."

    if "train" in message or "training" in message:
        return "For this project, start by improving my instructions and adding knowledge about the capstone before considering fine-tuning."

    return "fallback reply rn. the endpoint exists, but the xAI request didnt finish."


if __name__ == "__main__":
    load_env()
    server = ThreadingHTTPServer((HOST, PORT), SteveGPTHandler)
    print(f"SteveGPT is running at http://{HOST}:{PORT}")
    server.serve_forever()
