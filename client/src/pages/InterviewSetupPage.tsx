import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { interviewService } from "../services/interview";

const interviewTypes = ["Behavioral", "Technical", "System Design", "Mixed"];
const experienceLevels = ["Entry", "Mid", "Senior"];
const difficultyLevels = ["Easy", "Medium", "Hard"];

const techPool = [
  "Python", "JavaScript", "TypeScript", "Java", "Go", "C++",
  "FastAPI", "Django", "Flask", "Node.js", "React", "Next.js",
  "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "Docker", "Kubernetes", "AWS", "GCP", "Azure",
  "Git", "REST APIs", "GraphQL", "Celery", "RabbitMQ",
];

function buildSampleJD(role: string, techStack: string[]) {
  const roleText = role.trim() || "Software Engineer";
  const stackText = techStack.length
    ? "You'll primarily work with " + techStack.slice(0, 5).join(", ") + "."
    : "You'll design and build scalable APIs and work with relational databases.";
  return "We're hiring a " + roleText + " to help us design, build, and ship reliable software. " + stackText + " You'll own features end to end, from design through deployment, write clean and well-tested code, debug production issues, and collaborate closely with product, design, and other engineers. We value strong fundamentals, clear communication, and a bias toward shipping.";
}

export default function InterviewSetupPage() {
  const navigate = useNavigate();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [interviewType, setInterviewType] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setResumeFile(e.target.files[0]);
    }
  };

  const toggleTech = (tech: string) => {
    setSelectedTech((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const addCustomTech = () => {
    const val = customTech.trim();
    if (val && !selectedTech.includes(val)) {
      setSelectedTech((prev) => [...prev, val]);
    }
    setCustomTech("");
  };

  const handleFillSampleJD = () => {
    setJobDescription(buildSampleJD(role, selectedTech));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!role.trim() || !interviewType || !experienceLevel || !difficulty) {
      setError("Please enter role, and select interview type, experience level, and difficulty.");
      return;
    }

    if (numQuestions < 3 || numQuestions > 30) {
      setError("Number of questions must be between 3 and 30.");
      return;
    }

    setLoading(true);

    try {
      const tech_stack = selectedTech;

      if ((interviewType === "Technical" || interviewType === "Mixed") && tech_stack.length === 0) {
        setError("Please select at least one technology for a Technical or Mixed interview.");
        setLoading(false);
        return;
      }

      const payload = {
        role: role.trim(),
        interview_type: interviewType,
        tech_stack,
        number_of_questions: numQuestions,
        experience_level: experienceLevel,
        difficulty,
      };

      const created = await interviewService.create(payload as any);
      navigate(`/practice/session/${created.id}`);
    } catch {
      setError("Failed to generate interview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pillClasses = (active: boolean) =>
    "px-4 py-1.5 rounded-full font-medium text-sm transition-colors duration-200 whitespace-nowrap shadow-sm " +
    (active
      ? "bg-accent-mint text-white shadow-[0_0_10px_2px_var(--accent-mint)]"
      : "bg-bg-surface text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary");

  return (
    <div className="w-full h-full flex flex-col p-4 bg-bg-surface-raised rounded-2xl shadow-lg overflow-hidden">
      <h1 className="text-2xl font-exponent mb-3 text-text-primary shrink-0">
        Set up your interview
      </h1>

      {error && (
        <p className="text-red-600 font-semibold text-sm mb-2 shrink-0">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4"
      >
        <div className="md:col-span-5 flex flex-col gap-3 min-h-0">
          <label className="block text-text-secondary text-sm">
            Role / Title
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Python Developer"
              className="mt-1 w-full rounded-lg border border-border p-2 bg-bg-surface text-text-primary text-sm"
              required
            />
          </label>

          <label className="block text-text-secondary text-sm">
            Resume Upload (PDF/DOCX)
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleResumeUpload}
              className="mt-1 w-full text-sm rounded-lg border border-border p-2 bg-bg-surface text-text-primary"
            />
            {resumeFile && (
              <p className="mt-1 text-xs text-text-primary truncate">
                Selected: {resumeFile.name}
              </p>
            )}
          </label>

          <div className="flex-1 min-h-0 flex flex-col">
            <span className="font-semibold text-text-primary text-sm mb-1.5 block">
              Tech Stack
            </span>
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border p-2 bg-bg-surface">
              <div className="flex flex-wrap gap-2">
                {techPool.map((tech) => (
                  <button
                    type="button"
                    key={tech}
                    onClick={() => toggleTech(tech)}
                    className={pillClasses(selectedTech.includes(tech))}
                  >
                    {tech}
                  </button>
                ))}
                {selectedTech
                  .filter((t) => !techPool.includes(t))
                  .map((tech) => (
                    <button
                      type="button"
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className={pillClasses(true)}
                    >
                      {tech} ×
                    </button>
                  ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={customTech}
                  onChange={(e) => setCustomTech(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTech();
                    }
                  }}
                  placeholder="Other technology..."
                  className="flex-1 rounded-lg border border-border p-1.5 bg-bg-surface-raised text-text-primary text-xs"
                />
                <button
                  type="button"
                  onClick={addCustomTech}
                  className="px-3 py-1.5 rounded-lg bg-bg-surface-raised border border-border text-text-secondary text-xs hover:text-text-primary"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 shrink-0 rounded-full bg-primary hover:bg-primary-hover py-2.5 text-base font-exponent text-white shadow transition disabled:opacity-40"
          >
            {loading ? "Generating..." : "Generate Interview"}
          </button>
        </div>

        <div className="md:col-span-7 flex flex-col gap-3 min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <fieldset>
              <legend className="font-semibold text-text-primary text-sm mb-1.5">
                Interview Type
              </legend>
              <div className="flex flex-wrap gap-2">
                {interviewTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setInterviewType(type)}
                    className={pillClasses(interviewType === type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-semibold text-text-primary text-sm mb-1.5">
                Experience Level
              </legend>
              <div className="flex flex-wrap gap-2">
                {experienceLevels.map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setExperienceLevel(level)}
                    className={pillClasses(experienceLevel === level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <fieldset>
              <legend className="font-semibold text-text-primary text-sm mb-1.5">
                Difficulty
              </legend>
              <div className="flex flex-wrap gap-2">
                {difficultyLevels.map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={pillClasses(difficulty === level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-text-secondary text-sm">
              Number of Questions
              <input
                type="number"
                min={3}
                max={30}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border p-2 bg-bg-surface text-text-primary text-sm"
              />
            </label>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-text-primary text-sm">
                Job Description
              </span>
              <button
                type="button"
                onClick={handleFillSampleJD}
                className="px-3 py-1 rounded-full text-xs font-medium bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised transition-colors"
              >
                Use sample JD
              </button>
            </div>
            <textarea
              className="flex-1 min-h-0 w-full p-3 rounded-lg border border-border bg-bg-surface text-text-primary font-exponent resize-none text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Describe the job role, or tap 'Use sample JD'..."
            />
          </div>
        </div>
      </form>
    </div>
  );
}