from fastapi import FastAPI
from pydantic import BaseModel
from data_transfer import DataTransfer


app = FastAPI()

class Query(BaseModel):
    query: str

@app.post("/query", response_model=Query)
async def root(user_query: Query):
    DataTransfer.send_to_LLM(user_query.query)
    return user_query

