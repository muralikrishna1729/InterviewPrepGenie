import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { interviewService } from "../services/interview";
import type { Interview, Question } from "../types";

function LoadingSkeleton() {
  return (
    <div className="p-4 border rounded shadow animate-pulse" style={{ background: "var(--bg-base)" }}>
      <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-20 bg-gray-200 rounded"></div>
    </div>
  );
}

function FeedbackSection({ feedback }: { feedback: NonNullable<Interview["feedback"]> }) {
  return (
    <section
      className="mb-8 rounded-2xl p-6 shadow-md"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <h2
          className="text-2xl font-exponent font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Overall Feedback
        </h2>
        <span
          className="text-xl font-bold tabular-nums px-3 py-1 rounded-full"
          style={{ background: "var(--bg-surface-raised)", color: "var(--accent-mint)" }}
        >
          {feedback.score}/100
        </span>
      </div>

      <p className="mt-4 text-[var(--text-secondary)] whitespace-pre-line">
        {feedback.summary || "No summary available."}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="font-exponent font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Strengths
          </h3>
          <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
            {feedback.strengths?.length ? (
              feedback.strengths.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li className="italic">No data</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="font-exponent font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Weaknesses
          </h3>
          <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
            {feedback.weaknesses?.length ? (
              feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)
            ) : (
              <li className="italic">No data</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="font-exponent font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Improvements
          </h3>
          <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
            {feedback.improvements?.length ? (
              feedback.improvements.map((im, i) => <li key={i}>{im}</li>)
            ) : (
              <li className="italic">No data</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function QuestionCard({ question, modelAnswer, index, onGenerate, generating }: {
  question: Question;
  modelAnswer: string | null;
  index: number;
  onGenerate?: (index: number) => void;
  generating?: boolean;
}) {
  const transcript = question.answer?.transcript ?? "";
  return (
    <div
      className="mb-8 rounded-2xl p-6 shadow-md"
      style={{ background: "var(--bg-surface)" }}
    >
      <h2
        className="font-exponent font-semibold text-xl mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        Question {index + 1}
      </h2>
      <p className="mb-5 text-[var(--text-secondary)] whitespace-pre-line">
        {question.question_text}
      </p>

      <h3
        className="mt-6 font-exponent font-semibold text-lg"
        style={{ color: "var(--text-primary)" }}
      >
        Your Answer (Transcript)
      </h3>
      {transcript.trim() ? (
        <p className="mb-5 whitespace-pre-line text-[var(--text-secondary)]">{transcript}</p>
      ) : (
        <p className="mb-5 italic text-[var(--text-secondary)]">
          No answer recorded for this question.
        </p>
      )}

      <div
        className="mt-4 rounded-xl border border-dashed p-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface-raised)" }}
      >
        <h3
          className="font-exponent font-semibold text-lg mb-2"
          style={{ color: "var(--accent-mint)" }}
        >
          Example of a strong answer
        </h3>
        {modelAnswer ? (
          <div className="whitespace-pre-line text-[var(--text-secondary)]">
            {(() => {
              // model_answers entries now combine "Suggestion:" + "Model answer:" in one
              // string. Split on the marker for two clean paragraphs; fall back to the
              // raw string when it doesn't match (older data).
              const m = modelAnswer.match(/^Suggestion:\s*(.*?)\s*Model answer:\s*([\s\S]*)$/i);
              if (m) {
                return (
                  <>
                    <div className="mb-2">
                      <span className="font-semibold text-amber-600">Suggestion:</span> {m[1]}
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--accent-mint)]">Model answer:</span> {m[2]}
                    </div>
                  </>
                );
              }
              return modelAnswer;
            })()}
          </div>
        ) : onGenerate ? (
          <button
            onClick={() => onGenerate(index)}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-300 hover:bg-indigo-50 transition disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating suggested answer…
              </>
            ) : (
              <>✨ Generate suggested answer</>
            )}
          </button>
        ) : (
          <p className="italic text-[var(--text-secondary)]">
            No model answer available for this question.
          </p>
        )}
      </div>
    </div>
  );
}

export default function InterviewResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [interview, setInterview] = React.useState<Interview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [polling, setPolling] = React.useState(false);
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchInterview = useCallback(async () => {
    try {
      const data = await interviewService.getById(sessionId!);
      setInterview(data);
      setLoading(false);
      // Feedback is one aggregate row per interview — poll until it's ready.
      setPolling(!data.feedback);
    } catch {
      setLoading(false);
      setInterview(null);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  useEffect(() => {
    if (!polling) return;
    const intervalId = setInterval(fetchInterview, 5000);
    return () => clearInterval(intervalId);
  }, [polling, fetchInterview]);

  // Generate model answers on demand when the feedback row has none
  // (recovery path for interviews generated before model answers were reliable).
  const handleGenerateAnswers = useCallback(async () => {
    if (!sessionId) return;
    setGeneratingAnswer(true);
    setGenerateError(null);
    try {
      await interviewService.generateModelAnswers(sessionId);
      await fetchInterview(); // reload so the newly persisted answers show up
    } catch {
      setGenerateError("Failed to generate suggested answers. Please try again.");
    } finally {
      setGeneratingAnswer(false);
    }
  }, [sessionId, fetchInterview]);

  if (loading) return <LoadingSkeleton />;

  if (!interview)
    return (
      <div
        className="p-6 max-w-4xl mx-auto rounded-2xl shadow-lg"
        style={{ background: "var(--bg-surface-raised)" }}
      >
        <p className="text-red-500 font-semibold text-center">
          Failed to load interview results.
        </p>
      </div>
    );

  const questions = interview.questions ?? [];
  const feedback = interview.feedback ?? null;
  const modelAnswers = feedback?.model_answers ?? [];

  return (
    <div
      className="max-w-4xl mx-auto p-8 rounded-2xl shadow-lg"
      style={{ background: "var(--bg-surface-raised)" }}
    >
      <h1 className="text-3xl font-exponent mb-8" style={{ color: "var(--text-primary)" }}>
        Interview Results
      </h1>

      {polling && (
        <div
          className="mb-8 p-4 rounded-xl border text-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          We're generating your feedback… This page will refresh automatically.
        </div>
      )}

      {feedback && <FeedbackSection feedback={feedback} />}

      {feedback && modelAnswers.length < questions.length && (
        <div
          className="mb-8 p-4 rounded-xl border text-sm flex items-center justify-between gap-4 flex-wrap"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            {generateError ?? "Model answers are missing for some questions. Generate them now to see what a strong answer would look like."}
          </div>
          <button
            onClick={handleGenerateAnswers}
            disabled={generatingAnswer}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {generatingAnswer ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating…
              </>
            ) : (
              <>✨ Generate suggested answers</>
            )}
          </button>
        </div>
      )}

      {questions.map((question, i) => (
        <QuestionCard
          key={question.id}
          question={question}
          modelAnswer={modelAnswers[i] ?? null}
          index={i}
        />
      ))}

      <div className="flex gap-6">
        <button
          onClick={() => navigate(`/practice/new`)}
          className="rounded-full bg-accent-mint px-6 py-3 text-white font-exponent font-semibold shadow-[0_0_20px_0_var(--accent-mint)] hover:brightness-110 transition"
        >
          Practice Again
        </button>
        <button
          onClick={() => navigate(`/dashboard`)}
          className="rounded-full border border-[var(--border)] px-6 py-3 font-exponent font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
