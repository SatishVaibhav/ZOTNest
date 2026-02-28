from fastapi import FastAPI
from pydantic import BaseModel
from llm import LLM



app = FastAPI()

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

if __name__ == '__main__':
    set_query(Query(query="Hello, World!"))