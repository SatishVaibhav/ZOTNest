import os
import json
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

IMAGE_MAP = {
    # Berkeley Court
    ("Berkeley Court", "Plan A (1 Bed / 1 Bath)"): "Berkeley_Plan_A.jpeg",
    ("Berkeley Court", "Plan B (2 Bed / 2 Bath)"): "Berkeley_Plan_B.jpeg",

    # Camino Del Sol
    ("Camino Del Sol", "2 Bed / 2.5 Bath (Townhome)"): "CDS_2B2.5B.png",
    ("Camino Del Sol", "3 Bed / 3 Bath (Townhome)"): "CDS_3B3B.png",
    ("Camino Del Sol", "4 Bed / 4.5 Bath (Townhome)"): "CDS_4B4.5B.png",

    # Columbia Court
    ("Columbia Court", "Plan A (1 Bed / 1 Bath)"): "Columbia_Plan_A.jpeg",
    ("Columbia Court", "Plan D (2 Bed / 2 Bath)"): "Columbia_Plan_D.jpeg",

    # Cornell Court
    ("Cornell Court", "Plan A (1 Bed / 1 Bath)"): "Cornell_Plan_A.jpeg",
    ("Cornell Court", "Plan C (2 Bed / 1.5 Bath)"): "Cornell_Plan_C.jpeg",

    # Dartmouth Court
    ("Dartmouth Court", "Plan B (1 Bed / 1 Bath)"): "Dartmouth_Court_Plan_B.jpeg",
    ("Dartmouth Court", "Plan E (2 Bed / 2 Bath)"): "Dartmouth_Court_Plan_E.jpeg",

    # Harvard Court
    ("Harvard Court", "Plan A (1 Bed / 1 Bath)"): "Harvard_Court_Plan_A.jpeg",
    ("Harvard Court", "Plan B (2 Bed / 2 Bath)"): "Harvard_Court_Plan_B.jpeg",

    # Plaza Verde
    ("Plaza Verde", "1 Bed / 1 Bath (Shared)"): "PV1_1B1BP.png",
    ("Plaza Verde", "1 Bed / 1 Bath (Private)"): "PV1_1B1BP.png",
    ("Plaza Verde", "2 Bed / 1 Bath"): "PV1_2B1B.png",
    ("Plaza Verde", "2 Bed / 2 Bath (Shared)"): "PV1_2B2BA.png",
    ("Plaza Verde", "4 Bed / 4 Bath"): "PV1_4B4B.png",

    # Plaza Verde II
    ("Plaza Verde II", "4 Bed / 2 Bath"): "PV2_4B2BB.png",
    ("Plaza Verde II", "Efficiency"): "PV2_Efficiency.png",
    ("Plaza Verde II", "Studio"): "PV2_Studio.png",

    # Puerta Del Sol
    ("Puerta Del Sol", "1 Bed / 1 Bath"): "PDS_1B1BA.png",
    ("Puerta Del Sol", "2 Bed / 2 Bath (Shared)"): "PDS_2B2B.png",
    ("Puerta Del Sol", "Efficiency (Private)"): "PDS_Efficiency.png",
    ("Puerta Del Sol", "Studio (Private)"): "PDS_Studio.png",

    # Stanford Court
    ("Stanford Court", "Plan A (1 Bed / 1 Bath)"): "Stanford_Court_Plan_A.jpeg",
    ("Stanford Court", "Plan C (2 Bed / 2 Bath)"): "Stanford_Court_Plan_C.jpeg",

    # Vista Del Campo
    ("Vista Del Campo", "1 Bed / 1 Bath"): "VDC_1B1B.png",
    ("Vista Del Campo", "2 Bed / 2 Bath"): "VDC_2B2B.png",
    ("Vista Del Campo", "4 Bed / 2 Bath"): "VDC_4B2B.png",
    ("Vista Del Campo", "3 Bed / 2 Bath"): "VDC_3B2B.png",  # no image file exists for this

    # VDC Norte
    ("VDC Norte", "1 Bed / 1 Bath"): "VDCN_1B1B.png",
    ("VDC Norte", "2 Bed / 2 Bath"): "VDCN_2B2B.png",
    ("VDC Norte", "3 Bed / 2 Bath"): "VDCN_3B2B.png",
}

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

    def extract_preferences(self, user_query: str) -> dict:
        prompt = f"""
You are a housing preference extractor. Given a student's housing query, extract their preferences.
Respond ONLY with a valid JSON object, no markdown, no explanation.

Query: "{user_query}"

Return this exact JSON structure:
{{
  "cares_about_price": true or false,
  "max_budget": a number like 1400 or null if not mentioned,
  "max_bedrooms": a number like 1 or null if not mentioned,
  "cares_about_distance": true or false,
  "cares_about_shuttle": true or false,
  "prefers_newer": true or false
}}

Rules:
- cares_about_price: true if they mention money, cost, cheap, budget, afford, expensive, rent, price, broke, saving
- max_budget: extract a specific dollar amount if mentioned, otherwise null
- max_bedrooms: 1 if they mention single, solo, alone, one room, 1 bed, studio. 2 if they mention 2 bed. null if no preference
- cares_about_distance: true if they mention walking, biking, distance, close, near, far, uphill, commute
- cares_about_shuttle: true if they mention shuttle, bus, transit, no car, don't drive, transportation
- prefers_newer: true if they mention new, modern, updated, renovated, nice building
"""

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}",
            json={"contents": [{"parts": [{"text": prompt}]}]}
        )

        raw_response = response.json()

        if "error" in raw_response:
            print(f"Gemini API error (falling back to vibe-only): {raw_response['error']['message']}")
            return {
                "cares_about_price": False,
                "max_budget": None,
                "cares_about_distance": False,
                "cares_about_shuttle": False,
                "prefers_newer": False
            }


        raw = raw_response["candidates"][0]["content"]["parts"][0]["text"]

        clean = raw.replace("```json", "").replace("```", "").strip()
        
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            print(f"Failed to parse preferences: {raw}")
            return {
                "cares_about_price": False,
                "max_budget": None,
                "cares_about_distance": False,
                "cares_about_shuttle": False,
                "prefers_newer": False
            }



    def get_recommendations(self, user_query: str):
        if not user_query.strip():
            return []

        print(f"Extracting preferences from: {user_query}")
        prefs = self.extract_preferences(user_query)
        print(f"Extracted preferences: {prefs}")

        query_vector = self.get_embedding(user_query)

        response = self.supabase.rpc('match_properties', {
            'query_embedding': query_vector,
            'match_count': 100,
            'cares_about_price': prefs.get('cares_about_price', False),
            'max_budget': prefs.get('max_budget'),
            'max_bedrooms': prefs.get('max_bedrooms'),
            'cares_about_distance': prefs.get('cares_about_distance', False),
            'cares_about_shuttle': prefs.get('cares_about_shuttle', False),
            'prefers_newer': prefs.get('prefers_newer', False)
        }).execute()


        results = response.data
        if not results:
            return []

        raw_scores = [r['final_score'] for r in results]
        min_score = min(raw_scores)
        max_score = max(raw_scores)

        for r in results:
            if max_score == min_score:
                r['final_score'] = 75.0
            else:
                normalized = (r['final_score'] - min_score) / (max_score - min_score)
                r['final_score'] = round(55 + normalized * 37, 1)
            
            filename = IMAGE_MAP.get((r['location_name'], r['plan_name']))
            r['image_path'] = f"/{filename}" if filename else None

        return results