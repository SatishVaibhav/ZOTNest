from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from llm import LLM

app = FastAPI(title="ZOTNest Production API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

engine = LLM()

@app.get("/")
def health_check():
    return {"status": "ZOTNest API is Live", "docs": "/docs"}

@app.post("/api/query")
async def get_recommendations(user_query: QueryRequest):
    """
    Main Search: Matches what the Frontend 'ResultsClient.tsx' likely calls.
    Expects JSON: {"query": "shuttle near campus"}
    """
    print(f"🔍 Processing Query: {user_query.query}")
    try:
        results = engine.get_recommendations(user_query.query)
        return {"results": results}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/property/{name}")
async def get_details(name: str):
    """
    Specific lookup for when a user clicks an apartment card.
    """
    try:
        details = engine.get_property_details(name) 
        return details
    except Exception as e:
        raise HTTPException(status_code=404, detail="Property not found")