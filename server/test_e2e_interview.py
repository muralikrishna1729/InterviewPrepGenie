import asyncio
import base64
import io
import json
import struct
import sys
import wave
from uuid import uuid4
import websockets

from app.core.security import create_access_token
from app.db.base import AsyncSessionLocal, engine
from app.db.models import User


def generate_tiny_wav():
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        # Write 1 second of silence
        for _ in range(16000):
            data = struct.pack('<h', 0)
            wav.writeframesraw(data)
    return buffer.getvalue()


async def run_e2e():
    print("Initializing E2E Mock Interview WebSocket Test...")

    # 1. Get/create user and generate token
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            print("Creating a test user...")
            user = User(
                id=str(uuid4()),
                email="e2e_test@example.com",
                hashed_password="mockhashedpassword",
                full_name="E2E Tester"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        user_id = user.id

    token = create_access_token(user_id)
    print(f"Generated Token for User {user_id}: {token[:20]}...")

    # 2. Connect to WebSocket server
    uri = f"ws://localhost:5000/ws?token={token}"
    print(f"Connecting to {uri} ...")
    
    async with websockets.connect(uri) as ws:
        print("Connected! Starting Setup Graph...")
        
        # Step 2a: Start Setup
        await ws.send(json.dumps({"type": "start_setup"}))
        resp = json.loads(await ws.recv())
        print(f"Setup Question (role): {resp.get('question_text')}")

        # Step 2b: Answer Role
        await ws.send(json.dumps({"type": "setup_answer", "field": "role", "value": "Python Developer"}))
        resp = json.loads(await ws.recv())
        print(f"Setup Question (interview_type): {resp.get('question_text')}")

        # Step 2c: Answer Interview Type
        await ws.send(json.dumps({"type": "setup_answer", "field": "interview_type", "value": "Technical"}))
        resp = json.loads(await ws.recv())
        print(f"Setup Question (tech_stack): {resp.get('question_text')}")

        # Step 2d: Answer Tech Stack
        await ws.send(json.dumps({"type": "setup_answer", "field": "tech_stack", "value": "FastAPI"}))
        resp = json.loads(await ws.recv())
        print(f"Setup Question (experience_level): {resp.get('question_text')}")

        # Step 2e: Answer Experience Level
        await ws.send(json.dumps({"type": "setup_answer", "field": "experience_level", "value": "Mid"}))
        resp = json.loads(await ws.recv())
        print(f"Setup Question (difficulty): {resp.get('question_text')}")

        # Step 2f: Answer Difficulty
        await ws.send(json.dumps({"type": "setup_answer", "field": "difficulty", "value": "Medium"}))
        resp = json.loads(await ws.recv())
        print(f"Setup Question (number_of_questions): {resp.get('question_text')}")

        # Step 2g: Answer Number of Questions
        await ws.send(json.dumps({"type": "setup_answer", "field": "number_of_questions", "value": "2"}))
        resp = json.loads(await ws.recv())
        
        # Expect Setup Complete
        print(f"Response: {resp}")
        assert resp.get("type") == "setup_complete"
        interview_id = resp.get("interview_id")
        print(f"Setup Complete! Interview ID: {interview_id}")

        # 3. Start Live Interview
        print("\n--- Starting Live Interview ---")
        await ws.send(json.dumps({"type": "start_interview", "interview_id": interview_id}))
        
        # Receive first question
        resp = json.loads(await ws.recv())
        print(f"Question 1: {resp}")
        assert resp.get("type") == "question"
        q1_id = resp.get("question_id")

        # Generate audio base64
        audio_bytes = generate_tiny_wav()
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        # Submit answer 1
        print("Submitting Answer 1 (Base64 audio of silence)...")
        await ws.send(json.dumps({
            "type": "submit_answer",
            "question_id": q1_id,
            "audio_base64": audio_base64
        }))

        # Receive transcript_ready
        resp = json.loads(await ws.recv())
        print(f"Transcript 1: {resp}")
        assert resp.get("type") == "transcript_ready"

        # Receive next question (Question 2)
        resp = json.loads(await ws.recv())
        print(f"Question 2: {resp}")
        assert resp.get("type") == "question"
        q2_id = resp.get("question_id")

        # Submit answer 2
        print("Submitting Answer 2...")
        await ws.send(json.dumps({
            "type": "submit_answer",
            "question_id": q2_id,
            "audio_base64": audio_base64
        }))

        # Receive transcript_ready
        resp = json.loads(await ws.recv())
        print(f"Transcript 2: {resp}")
        assert resp.get("type") == "transcript_ready"

        # Receive Interview Complete
        resp = json.loads(await ws.recv())
        print(f"Final Response: {resp}")
        assert resp.get("type") == "interview_complete"
        print("Interview completed successfully in WebSocket session!")

        # 4. Wait for Celery worker to generate and save feedback
        print("\nWaiting for Celery background feedback task to complete...")
        await asyncio.sleep(5)

        # 5. Check if feedback is persisted in the DB
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            from app.db.models import Feedback
            stmt = select(Feedback).where(Feedback.interview_id == interview_id)
            res = await db.execute(stmt)
            fb = res.scalar_one_or_none()
            if fb:
                print("E2E SUCCESS! Feedback persisted in database:")
                print(f"Score: {fb.score}")
                print(f"Summary: {fb.summary}")
            else:
                print("E2E FAILED: Feedback was not persisted!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_e2e())
