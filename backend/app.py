from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from llm import LLM  # Make sure your llm.py is updated too!

app = FastAPI()

# 1. Keep your CORS settings so the frontend can talk to you
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Define what the data looks like
class QueryRequest(BaseModel):
    query: str

class PropertyResult(BaseModel):
    location_name: str
    review_reasoning: str
    similarity: float

# Initialize your logic engine
# This is where your Supabase/AI connections live
engine = LLM()

@app.post("/api/query")
async def get_recommendations(user_query: QueryRequest):
    """
    This is the main search endpoint.
    It takes text, turns it into a vector, and finds matches in Supabase.
    """
    print(f"Received query: {user_query.query}")
    
    # Use your LLM class to get real data from the database
    results = engine.get_recommendations(user_query.query)
    
    return {"results": results}

@app.get("/api/property/{name}")
async def get_details(name: str):
    """
    Optional: Get all floor plans for a specific building when clicked
    """
    details = engine.get_property_details(name)
    return details