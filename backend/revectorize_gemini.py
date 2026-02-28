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
    print(f"❌ Error: Missing variables in {env_path}")
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
    # 1. Pull ALL factual columns now, not just reviews
    print("Fetching properties...")
    response = supabase.table("properties").select("*").execute()

    for row in response.data:
        name = row['location_name']
        
        # 2. Build a "Mega-String" of facts + reviews
        # This ensures Gemini "sees" the shuttle and distance data
        shuttle_status = "has a shuttle service" if row.get('has_shuttle') else "no shuttle"
        distance = f"{row.get('distance_miles', 'unknown')} miles from UCI campus"
        year = f"built in {row.get('year_built')}" if row.get('year_built') else ""
        
        # The AI "Profile" for this apartment
        combined_text = (
            f"Apartment: {name}. Location: {distance}. Features: {shuttle_status}, {year}. "
            f"Resident feedback: {row['review_reasoning']}"
        )
        
        print(f"Vectorizing {name} with Facts...")
        vector = get_embedding(combined_text) # Use your existing get_embedding function
        
        # 3. Update Supabase
        supabase.table("properties").update({"vibe_vector": vector}).eq("location_name", name).execute()

if __name__ == "__main__":
    refresh_vectors()