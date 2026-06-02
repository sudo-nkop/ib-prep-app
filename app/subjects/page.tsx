import { getSubjects, getQuestionCountBySubject } from "@/lib/data"
import SubjectCard from "@/components/SubjectCard"
import type { Subject } from "@/lib/types"

const GROUP_LABELS: Record<number, string> = {
  0: "Core Components",
  1: "Group 1 — Studies in Language & Literature",
  2: "Group 2 — Language Acquisition",
  3: "Group 3 — Individuals & Societies",
  4: "Group 4 — Sciences",
  5: "Group 5 — Mathematics",
  6: "Group 6 — The Arts",
}

export default function SubjectsPage() {
  const subjects = getSubjects()
  const counts = getQuestionCountBySubject()

  // Group subjects by their group number
  const grouped = subjects.reduce<Record<number, Subject[]>>((acc, subject) => {
    const g = subject.group
    if (!acc[g]) acc[g] = []
    acc[g].push(subject)
    return acc
  }, {})

  // Sort groups: 1-6 first, then 0 (Core)
  const groupOrder = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => {
      if (a === 0) return 1
      if (b === 0) return -1
      return a - b
    })

  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">All Subjects</h1>
        <p className="mt-2 text-slate-500">
          {subjects.length} subjects · {totalQuestions} practice questions
        </p>
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-12">
        {groupOrder.map((group) => (
          <section key={group}>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800">
                {GROUP_LABELS[group] ?? `Group ${group}`}
              </h2>
              <div className="mt-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {grouped[group].map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  questionCount={counts[subject.id] ?? 0}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
