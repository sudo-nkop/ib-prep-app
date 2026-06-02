import { notFound } from "next/navigation"
import Link from "next/link"
import {
  getSubjectById,
  getSubjects,
  getQuestionsForSubject,
  getQuestionCountByTopic,
} from "@/lib/data"

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  const subjects = getSubjects()
  return subjects.map((s) => ({ slug: s.id }))
}

export default function SubjectDetailPage({ params }: Props) {
  const subject = getSubjectById(params.slug)
  if (!subject) notFound()

  const questions = getQuestionsForSubject(subject.id)
  const topicCounts = getQuestionCountByTopic(subject.id)

  const formatBreakdown = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.format] = (acc[q.format] ?? 0) + 1
    return acc
  }, {})

  const levelBadge =
    subject.level === "SL" ? (
      <span className="badge-sl text-sm">SL</span>
    ) : subject.level === "HL" ? (
      <span className="badge-hl text-sm">HL</span>
    ) : (
      <span className="badge-both text-sm">SL / HL</span>
    )

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/subjects" className="hover:text-slate-700">
          Subjects
        </Link>{" "}
        / <span className="text-slate-900">{subject.name}</span>
      </nav>

      {/* Subject header */}
      <div className={`rounded-xl ${subject.color} p-6 sm:p-8 text-white mb-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold opacity-80">{subject.code}</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              {subject.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                {subject.level === "Both" ? "SL & HL" : subject.level}
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <Link
            href={`/practice/${subject.id}`}
            className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition-colors backdrop-blur-sm"
          >
            Start Practice →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Topics */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Topics & Question Counts
            </h2>
            <div className="flex flex-col gap-2">
              {subject.topics.map((topic) => {
                const count = topicCounts[topic] ?? 0
                const pct = questions.length > 0 ? (count / questions.length) * 100 : 0
                return (
                  <div key={topic} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">{topic}</span>
                      <span className="text-slate-400">{count} Qs</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${subject.color}`}
                        style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {/* Topics with questions that aren't in the predefined list */}
              {Object.entries(topicCounts)
                .filter(([topic]) => !subject.topics.includes(topic))
                .map(([topic, count]) => (
                  <div key={topic} className="flex justify-between text-sm py-1">
                    <span className="text-slate-600">{topic}</span>
                    <span className="text-slate-400">{count} Qs</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent questions preview */}
          {questions.length > 0 && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Sample Questions
              </h2>
              <div className="flex flex-col gap-3">
                {questions.slice(0, 3).map((q) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-xs rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-600">
                        {q.format}
                      </span>
                      <span className="text-xs rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-600">
                        {q.topic}
                      </span>
                      <span className="text-xs rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-600">
                        {q.marks} mark{q.marks !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {q.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Stats card */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Question Bank
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total questions</span>
                <span className="font-semibold text-slate-900">
                  {questions.length}
                </span>
              </div>
              {Object.entries(formatBreakdown).map(([fmt, cnt]) => (
                <div key={fmt} className="flex justify-between text-sm">
                  <span className="text-slate-500">{fmt}</span>
                  <span className="font-semibold text-slate-900">{cnt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Level info */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Level
            </h3>
            <div className="flex items-center gap-2">
              {levelBadge}
              <span className="text-sm text-slate-500">
                {subject.level === "Both"
                  ? "Questions for both SL and HL"
                  : `${subject.level} level content`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link href={`/practice/${subject.id}`} className="btn-primary w-full text-center">
              Start Practice
            </Link>
            <Link href="/request" className="btn-secondary w-full text-center text-sm">
              Request more questions
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
