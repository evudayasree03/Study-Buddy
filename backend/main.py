"""
Study Buddy backend — FastAPI + Groq (OpenAI-compatible API)

Endpoints:
  POST /explain            -> plain-language explanation of a topic
  POST /summarize           -> bullet-point summary of pasted notes
  POST /generate-flashcards -> list of {front, back} flashcards
  POST /generate-quiz       -> list of multiple-choice questions

Uses Groq's OpenAI-compatible chat completions endpoint. Get a free API key
at https://console.groq.com/keys — no credit card required.
"""

import json
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

from auth import get_current_user

API_KEY = os.getenv("GROQ_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not set. Create a .env file (see .env.example) "
        "and add your key before starting the server."
    )

# Groq exposes an OpenAI-compatible endpoint, so we reuse the openai client
# and just point it at Groq's base_url.
client = OpenAI(api_key=API_KEY, base_url="https://api.groq.com/openai/v1")

# Current recommended general-purpose model on Groq's free tier
# (llama-3.3-70b-versatile was deprecated June 2026 in favor of this).
MODEL = "openai/gpt-oss-120b"

app = FastAPI(title="Study Buddy API (Groq)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models (identical to the Claude version — the frontend
# doesn't need to know which provider is behind the API)
# ---------------------------------------------------------------------------

class ExplainRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    level: str = Field("beginner", description="e.g. 'beginner', 'high school', 'college'")


class ExplainResponse(BaseModel):
    explanation: str


class SummarizeRequest(BaseModel):
    notes: str = Field(..., min_length=1)
    max_points: int = Field(5, ge=1, le=15)


class SummarizeResponse(BaseModel):
    points: list[str]


class FlashcardsRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    count: int = Field(8, ge=1, le=25)


class Flashcard(BaseModel):
    front: str
    back: str


class FlashcardsResponse(BaseModel):
    cards: list[Flashcard]


class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    num_questions: int = Field(5, ge=1, le=20)
    difficulty: str = Field("medium")


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer_index: int


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ask_groq(system: str, user: str, max_tokens: int = 1500, json_mode: bool = False) -> str:
    """Send a single-turn request to Groq and return the text response."""
    try:
        kwargs = {}
        if json_mode:
            # Groq supports OpenAI-style structured JSON mode on most models.
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(
            model=MODEL,
            max_completion_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            **kwargs,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return response.choices[0].message.content or ""


def parse_json_response(raw: str):
    """Groq is asked to return JSON; strip accidental code fences and parse.

    json_object mode requires the word 'json' in the prompt and returns an
    object, so array-shaped responses are wrapped as {"items": [...]}. This
    unwraps that if present, otherwise parses directly.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse AI response as JSON: {exc}. Raw: {raw[:300]}",
        ) from exc

    if isinstance(parsed, dict):
        # json_object mode returns an object — unwrap the first list value found
        for value in parsed.values():
            if isinstance(value, list):
                return value
    return parsed


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "provider": "groq", "model": MODEL}


@app.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest, user: dict = Depends(get_current_user)):
    system = (
        "You are a patient, encouraging study tutor. Explain concepts in plain, "
        "simple language appropriate for the requested level. Use short paragraphs "
        "or a small analogy where it helps. Avoid jargon unless you define it."
    )
    user = f"Explain this topic at a {req.level} level: {req.topic}"
    explanation = ask_groq(system, user, max_tokens=800)
    return ExplainResponse(explanation=explanation.strip())


@app.post("/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest, user: dict = Depends(get_current_user)):
    system = (
        "You summarize study notes into clear, standalone bullet points. "
        'Respond ONLY with JSON shaped like {"points": ["...", "..."]}. '
        "No preamble, no markdown fences."
    )
    user = (
        f"Summarize the following notes into at most {req.max_points} key points:\n\n"
        f"{req.notes}"
    )
    raw = ask_groq(system, user, max_tokens=800, json_mode=True)
    points = parse_json_response(raw)
    if not isinstance(points, list):
        raise HTTPException(status_code=502, detail="Expected a JSON array of strings from AI.")
    return SummarizeResponse(points=points)


@app.post("/generate-flashcards", response_model=FlashcardsResponse)
def generate_flashcards(req: FlashcardsRequest, user: dict = Depends(get_current_user)):
    system = (
        "You create study flashcards. Respond ONLY with JSON shaped like "
        '{"cards": [{"front": "...", "back": "..."}, ...]}. No preamble, no markdown fences.'
    )
    user = f"Create {req.count} flashcards for studying this topic:\n\n{req.topic}"
    raw = ask_groq(system, user, max_tokens=1500, json_mode=True)
    data = parse_json_response(raw)
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Expected a JSON array of flashcards from AI.")
    return FlashcardsResponse(cards=[Flashcard(**c) for c in data])


@app.post("/generate-quiz", response_model=QuizResponse)
def generate_quiz(req: QuizRequest, user: dict = Depends(get_current_user)):
    system = (
        "You create multiple-choice quiz questions for students. Respond ONLY with JSON "
        'shaped like {"questions": [{"question": "...", "options": ["...", "...", "...", "..."], '
        '"answer_index": 0}, ...]}, where answer_index is the 0-based index of the correct '
        "option. No preamble, no markdown fences."
    )
    user = (
        f"Create {req.num_questions} {req.difficulty}-difficulty multiple-choice questions "
        f"(4 options each) on this topic:\n\n{req.topic}"
    )
    raw = ask_groq(system, user, max_tokens=1800, json_mode=True)
    data = parse_json_response(raw)
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Expected a JSON array of questions from AI.")
    return QuizResponse(questions=[QuizQuestion(**q) for q in data])