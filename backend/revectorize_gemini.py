import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

if not url or not key or not gemini_key:
    print(f"Error: Missing variables in {env_path}")
    exit()

supabase = create_client(url, key)

def get_embedding(text):
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={gemini_key}",
        json={
            "model": "models/gemini-embedding-001",
            "content": {"parts": [{"text": text}]},
            "taskType": "RETRIEVAL_DOCUMENT",
            "outputDimensionality": 1536
        }
    )
    return response.json()["embedding"]["values"]

def refresh_vectors():
    print("Fetching properties...")
    properties = supabase.table("properties").select("location_name, distance_mi, has_shuttle, year_built").execute()

    for prop in properties.data:
        name = prop['location_name']

        reviews = supabase.table("google_reviews").select("review_text").eq("location_name", name).execute()
        review_texts = [r['review_text'] for r in reviews.data if r.get('review_text')]

        if not review_texts:
            print(f"Skipping {name} (no reviews found)")
            continue

        shuttle_status = "has a shuttle service" if prop.get('has_shuttle') else "no shuttle"
        distance = f"{prop.get('distance_mi', 'unknown')} miles from UCI campus"
        year = f"built in {prop.get('year_built')}" if prop.get('year_built') else ""
        combined_reviews = " | ".join(review_texts)

        combined_text = (
            f"Apartment: {name}. Location: {distance}. Features: {shuttle_status}, {year}. "
            f"Resident reviews: {combined_reviews}"
        )

        print(f"Vectorizing {name} with {len(review_texts)} real reviews...")
        vector = get_embedding(combined_text)
        supabase.table("properties").update({"vibe_vector": vector}).eq("location_name", name).execute()

    print("\nDone! Vectors now based on real reviews.")

if __name__ == "__main__":
    refresh_vectors()