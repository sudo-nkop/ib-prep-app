import type { Question } from "@/lib/types"

interface QuestionCardProps {
  question: Question
  questionNumber: number
  total: number
  selectedOption: string | null
  submitted: boolean
  userAnswer: string
  onSelectOption: (label: string) => void
  onAnswerChange: (text: string) => void
  onSubmit: () => void
  onNext: () => void
}

export default function QuestionCard({
  question,
  questionNumber,
  total,
  selectedOption,
  submitted,
  userAnswer,
  onSelectOption,
  onAnswerChange,
  onSubmit,
  onNext,
}: QuestionCardProps) {
  const isCorrect =
    question.format === "MCQ" && submitted
      ? selectedOption === question.correctOption
      : null

  const formatBadgeClass =
    question.format === "MCQ"
      ? "bg-blue-50 text-blue-700"
      : question.format === "ShortAnswer"
      ? "bg-amber-50 text-amber-700"
      : "bg-purple-50 text-purple-700"

  return (
    <div className="card p-6 flex flex-col gap-5">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${formatBadgeClass}`}>
          {question.format}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {question.topic}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          Paper {question.paper}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {question.marks} mark{question.marks !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto text-slate-400">
          Q{questionNumber} / {total}
        </span>
      </div>

      {/* Command term */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Command term:{" "}
        </span>
        <span className="text-xs font-semibold text-slate-600 capitalize">
          {question.commandTerm}
        </span>
      </div>

      {/* Prompt */}
      <div className="text-slate-900 leading-relaxed whitespace-pre-wrap">
        {question.prompt}
      </div>

      {/* MCQ Options */}
      {question.format === "MCQ" && question.options && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => {
            let optClass =
              "flex items-start gap-3 rounded-lg border p-3.5 text-sm cursor-pointer transition-all"

            if (!submitted) {
              optClass +=
                selectedOption === opt.label
                  ? " border-blue-500 bg-blue-50"
                  : " border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            } else {
              if (opt.label === question.correctOption) {
                optClass += " border-emerald-500 bg-emerald-50"
              } else if (opt.label === selectedOption && !isCorrect) {
                optClass += " border-red-400 bg-red-50"
              } else {
                optClass += " border-slate-200 opacity-60"
              }
            }

            return (
              <button
                key={opt.label}
                type="button"
                className={optClass}
                onClick={() => !submitted && onSelectOption(opt.label)}
                disabled={submitted}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    submitted && opt.label === question.correctOption
                      ? "bg-emerald-500 text-white"
                      : submitted && opt.label === selectedOption && !isCorrect
                      ? "bg-red-400 text-white"
                      : selectedOption === opt.label && !submitted
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-slate-700">{opt.text}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Short answer / Essay input */}
      {(question.format === "ShortAnswer" || question.format === "Essay") && !submitted && (
        <textarea
          className="textarea min-h-[140px]"
          placeholder={
            question.format === "Essay"
              ? "Write your essay response here…"
              : "Write your answer here…"
          }
          value={userAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      )}

      {/* Submit / Next buttons */}
      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            className="btn-primary"
            onClick={onSubmit}
            disabled={
              question.format === "MCQ"
                ? !selectedOption
                : userAnswer.trim().length === 0
            }
          >
            Submit Answer
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={onNext}>
            {questionNumber < total ? "Next Question →" : "See Results →"}
          </button>
        )}
      </div>

      {/* Mark scheme reveal */}
      {submitted && (
        <div className="mt-2 flex flex-col gap-4">
          {/* MCQ result banner */}
          {question.format === "MCQ" && (
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-sm font-semibold ${
                isCorrect
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </div>
          )}

          {/* Mark scheme */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Mark Scheme
            </h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {question.markScheme}
            </p>
          </div>

          {/* Exemplar answer */}
          {question.exemplarAnswer && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
                Exemplar Answer
              </h4>
              <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                {question.exemplarAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
