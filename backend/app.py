from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llm import LLM



app = FastAPI()

origins = [
    "http://localhost:3000",   
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    query: str




@app.post("/api/query", response_model=Query)
async def set_query(user_query: Query):
    llm = LLM(user_query.query)
    print('Query:', llm.get_query())
    return user_query

@app.get("/api/results", response_model=Query)
async def read_query(user_query: Query):
    print(user_query.query)
    return user_query

