"""
Redis-backed session state: setup_phase, setup_data, questions, answers,
current_question_index, is_setup_phase. TTL-bound keys, replaces the Node
version's in-memory `sessions` Map + `userSessionMap` (fixes restart/scaling gap).
"""
