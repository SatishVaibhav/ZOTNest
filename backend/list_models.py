import requests
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
gemini_key = os.getenv("GEMINI_API_KEY")

response = requests.get(
    f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}"
)
models = response.json().get("models", [])
for m in models:
    if "embed" in m["name"].lower():
        print(m["name"], "-", m.get("supportedGenerationMethods", []))