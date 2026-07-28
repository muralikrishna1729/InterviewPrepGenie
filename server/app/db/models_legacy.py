"""
SQLAlchemy models (async ORM), mapped 1:1 from the old Prisma schema plus two new tables.

- User            (id, name, email, password_hash, created_at) -> interviews[]
- Interview       (id, user_id, role, interview_type, tech_stack[], experience_level,
                    number_of_questions, status, created_at, updated_at)
                    -> questions[], feedback (1:1), transcript_chunks[]
- Question        (id, interview_id, question_text, order_index, created_at) -> answer (1:1)
- Answer          (id, interview_id, question_id, transcript, created_at)
- Feedback        (id, interview_id, strengths JSON, weaknesses JSON, improvements JSON,
                    summary, score, created_at)
- TranscriptChunk (id, interview_id, speaker, text, timestamp)

NEW (previously ephemeral/in-memory in the Node version):
- ResumeAnalysis  (id, user_id, filename, score, strengths JSON, weaknesses JSON,
                    grammar_suggestions JSON, ats_tips JSON, improvements JSON, created_at)
- McqSession      (id, user_id, job_title, job_description, questions JSON,
                    status, score, correct_count, total, feedback, created_at)
  -- replaces mcq.service.ts's in-memory sessionStore Map
"""
