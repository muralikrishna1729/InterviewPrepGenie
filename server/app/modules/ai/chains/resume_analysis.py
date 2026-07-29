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
(Applicant Tracking System) specialist. Analyze the resume below and provide:
- score: overall quality score 0-100
- strengths: list of specific strong points
- weaknesses: list of specific weak points
- grammar_suggestions: specific grammar/phrasing fixes
- ats_tips: specific ATS-optimization suggestions (keywords, formatting)
- improvements: prioritized list of actionable improvements

Return ONLY valid JSON matching this exact structure."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": resume_text},
    ]

    logger.info("Analyzing resume text: chars=%d", len(resume_text))
    return await generate_structured(
        messages, response_model=ResumeAnalysisResult, model=MODEL_STANDARD
    )
