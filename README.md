# ZotNest

A smart apartment-search platform built for UC Irvine students. Instead of scrolling through raw listings, you describe what you actually care about in plain English — budget, commute, shuttle access, "vibe" — and ZotNest ranks nearby student housing to match.

Unlike listing sites like Zillow, ZotNest incorporates a **"vibe" factor**: it crawls and vectorizes real Google reviews for each property so search results reflect what residents actually say about social life, atmosphere, noise, management, and more — not just square footage and price.

## How it works

1. Type a query like *"quiet studio near UCI under $1400"* or *"somewhere with a shuttle, don't have a car"*.
2. The backend uses Gemini to extract structured preferences from your query (budget, bedroom count, distance sensitivity, shuttle access, building age).
3. Your query is embedded into a vector and matched against property "vibe vectors" — embeddings built from each property's real Google reviews, distance to campus, shuttle availability, and build year — via a Supabase Postgres function (`match_properties`).
4. Results are scored, normalized, and returned with floor-plan images, then displayed as cards and pins on an interactive map centered on UCI.

## Tech stack

**Frontend**
- [Next.js](https://nextjs.org) (React, TypeScript, App Router)
- Tailwind CSS + [Framer Motion](https://www.framer.com/motion/) for animation
- [React-Leaflet](https://react-leaflet.js.org/) for the interactive housing map
- React Context for sharing search results between the home and results pages

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) (Python) serving a small JSON API
- [Google Gemini](https://ai.google.dev/) for:
  - `gemini-2.5-flash` — extracting structured search preferences from natural-language queries
  - `gemini-embedding-001` — embedding queries and property/review text into vectors
- [Supabase](https://supabase.com/) (Postgres + pgvector) for storing properties, scraped Google reviews, and vector similarity search via a `match_properties` RPC function

## Project structure

```
ZOTNest/
├── backend/
│   ├── app.py                 # FastAPI app — /api/query, /api/property/{name}
│   ├── llm.py                 # Core search engine: preference extraction, embeddings,
│   │                           #   Supabase vector search, score normalization
│   ├── revectorize_gemini.py  # Rebuilds property "vibe vectors" from reviews + metadata
│   ├── list_models.py         # Utility to list available Gemini embedding models
│   ├── test_search.py         # CLI script for testing search queries locally
│   └── requirements.txt
└── frontend/
    └── app/
        ├── page.tsx                        # App entry point
        ├── pages/HomePage.tsx               # Landing page with the search box
        ├── results/
        │   ├── page.tsx                     # Results page shell
        │   └── ResultsClient.tsx            # Renders results + map
        ├── components/
        │   ├── HousingMapClient.tsx         # Leaflet map with property markers
        │   ├── HousingSources.tsx           # Scrolling ticker of data sources
        │   └── NavBar.tsx
        └── context/SearchContext.tsx        # Shares search results across pages
```

## Backend API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check |
| `POST` | `/api/query` | Main search — takes `{"query": "..."}`, returns ranked property matches |
| `GET` | `/api/property/{name}` | Lookup details for a specific property |

Interactive API docs are available at `/docs` once the server is running.

## Getting started

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with:

```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_or_anon_key
```

Run the API:

```bash
uvicorn app:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

> Your Supabase project needs a `properties` table (with a `vibe_vector` column), a `google_reviews` table, and a `match_properties` Postgres function that performs the filtered vector similarity search. Run `revectorize_gemini.py` after seeding property/review data to (re)generate embeddings.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_BACKEND_URL` in a `.env.local` file if your backend isn't running on `http://127.0.0.1:8000`.

## Data sources

Housing and review data referenced/aggregated from sources including:
- University of California, Irvine
- American Campus Communities
- Irvine Company Apartments
- First American Corporation
