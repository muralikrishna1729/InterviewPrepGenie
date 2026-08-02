"""
LangChain-style structured chain: analyze extracted resume text, return
a validated ResumeAnalysisResult.
"""

from app.core.logging import get_logger
from app.modules.ai.llm import MODEL_STANDARD, generate_structured
from app.schemas.resume import ResumeAnalysisResult

logger = get_logger(__name__)


async def analyze_resume_text(
    resume_text: str, job_description: str | None = None
) -> ResumeAnalysisResult:
    jd_block = (
        f"JOB DESCRIPTION TO MATCH AGAINST (score how well the resume fits THIS role):\n{job_description}"
        if job_description and job_description.strip()
        else "No job description provided — score the resume on its own merits as a general technical resume."
    )

    system_prompt = f"""You are a strict, expert technical resume reviewer and ATS
(Applicant Tracking System) specialist. Analyze the resume against the job description below
and give an honest, rigorous score — not a generous one.

{jd_block}

SCORING RUBRIC (be STRICT — a typical resume should land 45-70, only an exceptional one 80+):
- Start at 50.
- +15 if it clearly matches the job description's required skills/keywords.
- +10 for quantified, measurable impact (numbers, %, scale) in at least 3 bullet points.
- +5 for a clean, well-structured layout (clear sections, consistent formatting).
- +5 for a strong professional summary tailored to the role.
- -10 for missing the job description's core required skills.
- -10 if impact is vague/unquantified throughout.
- -5 for poor structure, typos, or inconsistent formatting.
- -5 for an unprofessional or generic summary (or none at all).
Clamp the final score to 0-100. Do NOT inflate — being under 70 is normal and expected.

Every list field (strengths, weaknesses, grammar_suggestions, ats_tips, improvements)
MUST be an array of plain strings — never objects.

- strengths: what the resume does well, specifically relative to this job description.
- weaknesses: real gaps (missing skills, weak quant, structure problems) — be concrete.
- grammar_suggestions: specific, actionable grammar/wording/tense fixes with the exact phrase.
- ats_tips: exact keywords from the job description that are missing and should be added verbatim.
- improvements: neat, clean, concrete edits to make (reorder sections, reword bullets, add a summary), one per item.

Example shape:
{{
  "score": 62,
  "strengths": ["Strong Python + FastAPI experience matching the JD"],
  "weaknesses": ["No quantified impact — most bullets describe tasks, not results"],
  "grammar_suggestions": ["Change 'Worked on building' to 'Built' in the 2nd bullet under Experience"],
  "ats_tips": ["Add the missing keywords: Kubernetes, Terraform, Redis"],
  "improvements": ["Add a 2-line professional summary at the top tailored to a Backend Developer role"]
}}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"RESUME:\n{resume_text}"},
    ]

    logger.info("Analyzing resume text: chars=%d jd_present=%s", len(resume_text), bool(job_description))
    return await generate_structured(
        messages, response_model=ResumeAnalysisResult, model=MODEL_STANDARD
    )
