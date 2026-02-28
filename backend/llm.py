import os
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

class LLM:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )

    def get_embedding(self, text, task_type="RETRIEVAL_QUERY"):
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={self.gemini_key}",
            json={
                "model": "models/gemini-embedding-001",
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
                "outputDimensionality": 1536
            }
        )
        return response.json()["embedding"]["values"]

    def get_recommendations(self, user_query: str):
        if not user_query.strip():
            print("Empty query received. Returning default results.")
            return []

        query_vector = self.get_embedding(user_query)

        response = self.supabase.rpc('match_properties', {
            'query_embedding': query_vector,
            'match_threshold': 0.1, 
            'match_count': 5,
            'user_query_text': user_query 
        }).execute()

        return response.data

    def get_property_details(self, location_name: str):
        prop = self.supabase.table("properties").select("*").eq("location_name", location_name).single().execute()
        plans = self.supabase.table("floor_plans").select("*").eq("location_name", location_name).execute()
        reviews = self.supabase.table("google_reviews").select("*").eq("location_name", location_name).limit(5).execute()

        return {
            "property": prop.data,
            "floor_plans": plans.data,
            "reviews": reviews.data
        }