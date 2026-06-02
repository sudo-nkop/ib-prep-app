import Link from "next/link"
import { getSubjects, getQuestionCountBySubject } from "@/lib/data"
import SubjectCard from "@/components/SubjectCard"

export default function HomePage() {
  const subjects = getSubjects()
  const counts = getQuestionCountBySubject()

  // Show first 4 subjects as preview
  const previewSubjects = subjects.slice(0, 4)

  const features = [
    {
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Practice Questions",
      description:
        "Real IB-style questions across all formats: MCQ, Short Answer, and Essay. With mark schemes and exemplar answers.",
    },
    {
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "Core Component Tools",
      description:
        "Theory of Knowledge, Extended Essay, and CAS guidance built into the platform — not an afterthought.",
    },
    {
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      title: "Request Content",
      description:
        "Missing questions for your subject? Submit a content request and we'll add it — directly via GitHub Issues.",
    },
  ]

  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0)
  const totalSubjects = subjects.length

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-20 sm:py-32">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/20 px-4 py-1.5 text-sm font-medium text-blue-300 ring-1 ring-blue-600/30 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            IB Diploma Programme
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            IB Prep —{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              built for Diploma students
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-300 mb-10">
            Real exam-style questions, detailed mark schemes, and exemplar
            answers across every subject. Practice smarter, not harder.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/subjects" className="btn-primary text-base px-8 py-3">
              Start Practising
            </Link>
            <Link href="/request" className="btn-secondary text-base px-8 py-3">
              Request a Topic
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-bold text-white">{totalQuestions}+</p>
              <p className="text-sm text-slate-400">Practice questions</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalSubjects}</p>
              <p className="text-sm text-slate-400">IB subjects</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-3xl font-bold text-white">3</p>
              <p className="text-sm text-slate-400">Question formats</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Everything you need to ace your IB exams
            </h2>
            <p className="mt-3 text-slate-500">
              Built by students, for students — with the IB curriculum at its
              core.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-6 flex flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject preview */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Browse subjects
              </h2>
              <p className="mt-1 text-slate-500">
                {totalSubjects} subjects across all IB Groups
              </p>
            </div>
            <Link href="/subjects" className="btn-secondary text-sm">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {previewSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                questionCount={counts[subject.id] ?? 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to start practising?
          </h2>
          <p className="text-blue-100 mb-8 max-w-lg mx-auto">
            Pick a subject and start answering real IB-style questions with
            instant feedback.
          </p>
          <Link
            href="/subjects"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition-colors"
          >
            Choose a Subject
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
              IB
            </span>
            IB Prep — not affiliated with the International Baccalaureate
            Organisation
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/subjects" className="hover:text-slate-600">
              Subjects
            </Link>
            <Link href="/request" className="hover:text-slate-600">
              Request Content
            </Link>
            <Link href="/admin" className="hover:text-slate-600">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
