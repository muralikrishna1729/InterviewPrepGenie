"""
LangChain-style structured chain: analyze extracted resume text, return
a validated ResumeAnalysisResult.
"""

from app.core.logging import get_logger
from app.modules.ai.llm import MODEL_STANDARD, generate_structured
from app.schemas.resume import ResumeAnalysisResult

logger = get_logger(__name__)


async def analyze_resume_text(resume_text: str) -> ResumeAnalysisResult:
    system_prompt = """You are an expert technical resume reviewer and ATS
(Applicant Tracking System) specialist. Analyze the resume below.

Every list field (strengths, weaknesses, grammar_suggestions, ats_tips, improvements)
MUST be an array of plain strings — never objects.

Example shape:
{
  "score": 72,
  "strengths": ["Clear project descriptions"],
  "weaknesses": ["Missing quantified impact"],
  "grammar_suggestions": ["Use past tense consistently in Experience"],
  "ats_tips": ["Add keywords: Kubernetes, Terraform"],
  "improvements": ["Add a concise professional summary at the top"]
}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": resume_text},
    ]

    logger.info("Analyzing resume text: chars=%d", len(resume_text))
    return await generate_structured(
        messages, response_model=ResumeAnalysisResult, model=MODEL_STANDARD
    )
