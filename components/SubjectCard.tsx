import Link from "next/link"
import type { Subject } from "@/lib/types"

interface SubjectCardProps {
  subject: Subject
  questionCount?: number
  href?: string
}

export default function SubjectCard({
  subject,
  questionCount = 0,
  href,
}: SubjectCardProps) {
  const target = href ?? `/subjects/${subject.id}`

  const levelBadge =
    subject.level === "SL" ? (
      <span className="badge-sl">SL</span>
    ) : subject.level === "HL" ? (
      <span className="badge-hl">HL</span>
    ) : (
      <span className="badge-both">SL/HL</span>
    )

  return (
    <Link href={target} className="group card flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      {/* Color bar */}
      <div className={`h-2 w-full ${subject.color}`} />

      <div className="flex flex-col gap-3 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {subject.code}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
              {subject.name}
            </h3>
          </div>
          {levelBadge}
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-1.5">
          {subject.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
            >
              {topic}
            </span>
          ))}
          {subject.topics.length > 3 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400">
              +{subject.topics.length - 3} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            {questionCount} question{questionCount !== 1 ? "s" : ""}
          </span>
          <span className="text-sm font-medium text-blue-600 group-hover:underline">
            Practice →
          </span>
        </div>
      </div>
    </Link>
  )
}
