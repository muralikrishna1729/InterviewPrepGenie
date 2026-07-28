"""
POST /api/mcq/generate, POST /api/mcq/submit
Mirrors mcq.routes.ts / mcq.controller.ts. Session now backed by McqSession
DB row (+ optionally Redis cache) instead of in-memory Map.
"""
