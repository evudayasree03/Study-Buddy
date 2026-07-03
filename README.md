# Study Buddy

An AI-powered study assistant: explains topics in plain terms, summarizes notes, and generates flashcards and quizzes on demand.

```
study-buddy/
├── backend/     FastAPI + Groq API
└── frontend/    React + Vite + Tailwind
```

The frontend and backend run as two separate processes, in two separate terminal windows, at the same time.

## 1. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add your free Groq API key (get one at [console.groq.com/keys](https://console.groq.com/keys)):
```
GROQ_API_KEY=gsk_your_key_here
```

Run it:
```bash
uvicorn main:app --reload
```

Backend is now live at `http://localhost:8000`. Test it at `http://localhost:8000/docs`.

## 2. Frontend setup

Open a **new** terminal window (keep the backend running in the first one):

```bash
cd frontend
npm install
npm run dev
```

Frontend is now live at `http://localhost:5173`. Open that link in your browser.

## How it works

- The **Explain** tab sends whatever you type to `POST /explain` and shows the AI's plain-language answer.
- The **Flashcards** tab: enter a topic, click Generate, it calls `POST /generate-flashcards` and renders a flippable deck.
- The **Quiz** tab: enter a topic, click Generate, it calls `POST /generate-quiz` and runs a scored multiple-choice quiz.
- The **Notes** tab: paste notes, click Summarize, it calls `POST /summarize` and shows bullet-point key points.

If a request fails, the UI shows a red banner reminding you to check the backend is running at `http://localhost:8000`.

## Troubleshooting

- **"Failed to fetch" in the browser** → the backend isn't running, or it's running on a different port. Confirm `http://localhost:8000/health` loads in your browser.
- **CORS error in the browser console** → confirm the frontend is running on `http://localhost:5173` (the backend only allows that origin by default — see `allow_origins` in `backend/main.py`).
- **`GROQ_API_KEY is not set`** → check `.env` is in the `backend` folder (not `frontend`), named exactly `.env` (not `.env.txt`), and that you're running `uvicorn` from inside `backend`.

## Swapping in Claude instead of Groq

The backend was originally built for the Claude API. If you'd rather use Claude for higher-quality explanations, swap `backend/main.py` for the Claude version (uses `anthropic` package + `ANTHROPIC_API_KEY` instead) — ask if you'd like that file again.
