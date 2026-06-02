import Link from "next/link"
import { getSubjects, getQuestionCountBySubject } from "@/lib/data"
import SubjectCard from "@/components/SubjectCard"

export default function DashboardPage() {
  const subjects = getSubjects()
  const counts = getQuestionCountBySubject()
  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Your IB practice overview — pick a subject to continue.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Subjects", value: subjects.length },
          { label: "Total Questions", value: totalQuestions },
          { label: "Question Formats", value: 3 },
          { label: "IB Groups Covered", value: new Set(subjects.map((s) => s.group)).size },
        ].map((stat) => (
          <div key={stat.label} className="card p-5 text-center">
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* All subjects */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">All Subjects</h2>
        <Link href="/subjects" className="text-sm text-blue-600 hover:underline">
          View grouped →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            questionCount={counts[subject.id] ?? 0}
          />
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/request" className="card p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-slate-900 mb-1">Request Content</h3>
          <p className="text-sm text-slate-500">
            Missing a topic? Submit a request and we'll add it.
          </p>
        </Link>
        <Link href="/admin" className="card p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-slate-900 mb-1">Admin</h3>
          <p className="text-sm text-slate-500">
            Add new questions or subjects to the question bank.
          </p>
        </Link>
        <div className="card p-5 opacity-60">
          <h3 className="font-semibold text-slate-900 mb-1">Progress Tracking</h3>
          <p className="text-sm text-slate-500">
            Coming soon — track your scores across sessions.
          </p>
        </div>
      </div>
    </div>
  )
}
