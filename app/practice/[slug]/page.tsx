"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { Question, Subject } from "@/lib/types"
import QuestionCard from "@/components/QuestionCard"

interface TopicScore {
  correct: number
  total: number
}

export default function PracticePage() {
  const params = useParams()
  const slug = typeof params.slug === "string" ? params.slug : ""

  const [subject, setSubject] = useState<Subject | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [userAnswer, setUserAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [topicFilter, setTopicFilter] = useState<string>("All")
  const [topicScores, setTopicScores] = useState<Record<string, TopicScore>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        const [subjectRes, questionsRes] = await Promise.all([
          fetch(`/api/subjects/${slug}`),
          fetch(`/api/questions/${slug}`),
        ])

        if (!subjectRes.ok) {
          setError("Subject not found")
          return
        }

        const subjectData = (await subjectRes.json()) as Subject
        const questionsData = (await questionsRes.json()) as Question[]

        setSubject(subjectData)
        setAllQuestions(questionsData)
        setFilteredQuestions(questionsData)
      } catch {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    if (slug) loadData()
  }, [slug])

  // Apply topic filter
  useEffect(() => {
    if (topicFilter === "All") {
      setFilteredQuestions(allQuestions)
    } else {
      setFilteredQuestions(allQuestions.filter((q) => q.topic === topicFilter))
    }
    // Reset quiz state when filter changes
    setCurrentIndex(0)
    setSelectedOption(null)
    setUserAnswer("")
    setSubmitted(false)
    setScore(0)
    setFinished(false)
    setTopicScores({})
  }, [topicFilter, allQuestions])

  const currentQuestion = filteredQuestions[currentIndex]

  const handleSubmit = useCallback(() => {
    if (!currentQuestion) return
    setSubmitted(true)

    // Score MCQ
    if (
      currentQuestion.format === "MCQ" &&
      selectedOption === currentQuestion.correctOption
    ) {
      setScore((s) => s + 1)
      setTopicScores((prev) => {
        const existing = prev[currentQuestion.topic] ?? { correct: 0, total: 0 }
        return {
          ...prev,
          [currentQuestion.topic]: {
            correct: existing.correct + 1,
            total: existing.total + 1,
          },
        }
      })
    } else {
      setTopicScores((prev) => {
        const existing = prev[currentQuestion.topic] ?? { correct: 0, total: 0 }
        return {
          ...prev,
          [currentQuestion.topic]: {
            correct: existing.correct,
            total: existing.total + 1,
          },
        }
      })
    }
  }, [currentQuestion, selectedOption])

  const handleNext = useCallback(() => {
    if (currentIndex >= filteredQuestions.length - 1) {
      setFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setUserAnswer("")
      setSubmitted(false)
    }
  }, [currentIndex, filteredQuestions.length])

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setUserAnswer("")
    setSubmitted(false)
    setScore(0)
    setFinished(false)
    setTopicScores({})
  }

  const uniqueTopicsFromQuestions = allQuestions
    .map((q) => q.topic)
    .filter((topic, index, arr) => arr.indexOf(topic) === index)
  const topics = subject?.topics ?? uniqueTopicsFromQuestions

  const mcqTotal = filteredQuestions.filter((q) => q.format === "MCQ").length
  const answeredMCQ = Object.values(topicScores).reduce(
    (a, b) => a + b.total,
    0
  )
  const progressPct =
    filteredQuestions.length > 0
      ? ((currentIndex + (submitted ? 1 : 0)) / filteredQuestions.length) * 100
      : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading questions…</div>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-600">{error || "Subject not found"}</p>
        <Link href="/subjects" className="btn-primary">
          Back to Subjects
        </Link>
      </div>
    )
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/subjects" className="hover:text-slate-700">Subjects</Link>{" "}
          /{" "}
          <Link href={`/subjects/${subject.id}`} className="hover:text-slate-700">{subject.name}</Link>{" "}
          / Practice
        </nav>
        <div className="card p-8 text-center">
          <p className="text-slate-500">No questions found for this filter.</p>
          <button
            className="btn-secondary mt-4"
            onClick={() => setTopicFilter("All")}
          >
            Clear Filter
          </button>
        </div>
      </div>
    )
  }

  // End screen
  if (finished) {
    const mcqScore = score
    const totalMCQ = Object.values(topicScores).reduce(
      (a, b) => a + b.total,
      0
    )
    const pct = totalMCQ > 0 ? Math.round((mcqScore / mcqTotal) * 100) : null

    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card p-8 flex flex-col gap-6">
          {/* Score */}
          <div className="text-center">
            <div
              className={`inline-flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white ${subject.color}`}
            >
              {pct !== null ? `${pct}%` : "Done"}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Session Complete!
            </h2>
            {mcqTotal > 0 && (
              <p className="mt-2 text-slate-500">
                MCQ score: {mcqScore} / {mcqTotal} correct
              </p>
            )}
          </div>

          {/* Topic breakdown */}
          {Object.keys(topicScores).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Breakdown by topic (MCQ)
              </h3>
              <div className="flex flex-col gap-2">
                {Object.entries(topicScores).map(([topic, ts]) => (
                  <div key={topic} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-slate-700">{topic}</span>
                    <span className="text-slate-400">
                      {ts.correct}/{ts.total}
                    </span>
                    <div className="w-24 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${
                          ts.total > 0 && ts.correct / ts.total >= 0.7
                            ? "bg-emerald-500"
                            : ts.total > 0 && ts.correct / ts.total >= 0.4
                            ? "bg-amber-500"
                            : "bg-red-400"
                        }`}
                        style={{
                          width: `${ts.total > 0 ? (ts.correct / ts.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-primary flex-1" onClick={handleRestart}>
              Practice Again
            </button>
            <Link
              href={`/subjects/${subject.id}`}
              className="btn-secondary flex-1 text-center"
            >
              Back to Subject
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/subjects" className="hover:text-slate-700">
          Subjects
        </Link>{" "}
        /{" "}
        <Link href={`/subjects/${subject.id}`} className="hover:text-slate-700">
          {subject.name}
        </Link>{" "}
        / Practice
      </nav>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>
            Question {currentIndex + 1} of {filteredQuestions.length}
          </span>
          <span>
            {mcqTotal > 0 ? `${score}/${answeredMCQ} MCQ correct` : ""}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${subject.color}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar — topic filter */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <div className="card p-4 sticky top-20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Filter by Topic
            </h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setTopicFilter("All")}
                className={`text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                  topicFilter === "All"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Topics ({allQuestions.length})
              </button>
              {topics.map((topic) => {
                const count = allQuestions.filter(
                  (q) => q.topic === topic
                ).length
                return (
                  <button
                    key={topic}
                    onClick={() => setTopicFilter(topic)}
                    className={`text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      topicFilter === topic
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {topic} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Main question area */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              total={filteredQuestions.length}
              selectedOption={selectedOption}
              submitted={submitted}
              userAnswer={userAnswer}
              onSelectOption={setSelectedOption}
              onAnswerChange={setUserAnswer}
              onSubmit={handleSubmit}
              onNext={handleNext}
            />
          )}
        </div>
      </div>
    </div>
  )
}
