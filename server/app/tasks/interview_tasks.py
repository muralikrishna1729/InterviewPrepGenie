"""
Celery task: generate_feedback_task(interview_id)
Runs after interview end -- full transcript -> feedback_gen chain -> persist Feedback row.
Not on the WebSocket's hot path.
"""
