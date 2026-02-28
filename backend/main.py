from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from llm import LLM

app = FastAPI(title="ZOTNest AI Search API")

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

brain = LLM()

@app.get("/")
def home():
    return {"status": "ZOTNest API is Live", "docs": "/docs"}

@app.get("/search")
def search_apartments(q: str = Query("", description="The user's search query")):
    """
    The endpoint your teammates will call.
    Example: http://localhost:8000/search?q=gym with a shuttle
    """
    results = brain.get_recommendations(q)
    return {"results": results}