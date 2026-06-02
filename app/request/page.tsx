"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Subject } from "@/lib/types"

const REQUEST_TYPES = [
  "New Topic Questions",
  "More MCQ",
  "Essay Questions",
  "IA Support",
  "Correction / Error Report",
]

interface FormState {
  subject: string
  type: string
  description: string
  email: string
}

interface SubmitState {
  loading: boolean
  success: boolean
  issueUrl: string
  error: string
}

export default function RequestPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState<FormState>({
    subject: "",
    type: REQUEST_TYPES[0],
    description: "",
    email: "",
  })
  const [status, setStatus] = useState<SubmitState>({
    loading: false,
    success: false,
    issueUrl: "",
    error: "",
  })

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then((r) => r.json())
      .then((data: Subject[]) => setSubjects(data))
      .catch(() => {})
  }, [])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.subject) {
      setStatus((s) => ({ ...s, error: "Please select a subject." }))
      return
    }
    if (form.description.trim().length < 20) {
      setStatus((s) => ({
        ...s,
        error: "Please provide a description of at least 20 characters.",
      }))
      return
    }

    setStatus({ loading: true, success: false, issueUrl: "", error: "" })

    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          type: form.type,
          description: form.description,
          email: form.email || undefined,
        }),
      })

      const data = (await res.json()) as {
        success?: boolean
        issueUrl?: string
        error?: string
      }

      if (!res.ok || !data.success) {
        setStatus({
          loading: false,
          success: false,
          issueUrl: "",
          error: data.error ?? "Failed to submit request. Please try again.",
        })
        return
      }

      setStatus({
        loading: false,
        success: true,
        issueUrl: data.issueUrl ?? "",
        error: "",
      })
      setForm({ subject: "", type: REQUEST_TYPES[0], description: "", email: "" })
    } catch {
      setStatus({
        loading: false,
        success: false,
        issueUrl: "",
        error: "Network error — please check your connection and try again.",
      })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Request Content</h1>
        <p className="mt-2 text-slate-500 leading-relaxed">
          Missing questions for your subject or topic? Let us know and we'll add
          them. Requests are submitted as GitHub Issues and reviewed regularly.
        </p>
      </div>

      {status.success ? (
        <div className="card p-8 text-center flex flex-col gap-4 items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Request submitted!
            </h2>
            <p className="mt-1 text-slate-500 text-sm">
              Thanks — we've logged your request and will get to it soon.
            </p>
          </div>
          {status.issueUrl && (
            <a
              href={status.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View your GitHub Issue →
            </a>
          )}
          <div className="flex gap-3 mt-2">
            <button
              className="btn-primary"
              onClick={() =>
                setStatus({
                  loading: false,
                  success: false,
                  issueUrl: "",
                  error: "",
                })
              }
            >
              Submit another
            </button>
            <Link href="/subjects" className="btn-secondary">
              Back to Subjects
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          {/* Subject */}
          <div>
            <label className="label" htmlFor="req-subject">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              id="req-subject"
              name="subject"
              className="select"
              value={form.subject}
              onChange={handleChange}
              required
            >
              <option value="">Select a subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              <option value="Other / Not listed">Other / Not listed</option>
            </select>
          </div>

          {/* Request type */}
          <div>
            <label className="label" htmlFor="req-type">
              Request Type <span className="text-red-500">*</span>
            </label>
            <select
              id="req-type"
              name="type"
              className="select"
              value={form.type}
              onChange={handleChange}
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="req-desc">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="req-desc"
              name="description"
              className="textarea min-h-[120px]"
              placeholder="Describe what content you need — be as specific as possible. e.g. 'Need more Paper 2 MCQ questions on Authoritarian States (Hitler) for History HL.'"
              value={form.description}
              onChange={handleChange}
              required
              minLength={20}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Minimum 20 characters — more detail helps us prioritise better.
            </p>
          </div>

          {/* Email (optional) */}
          <div>
            <label className="label" htmlFor="req-email">
              Your Email{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="req-email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Only used to notify you when your request is completed. Not stored
              elsewhere.
            </p>
          </div>

          {/* Error */}
          {status.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {status.error}
            </div>
          )}

          {/* Info note */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 flex items-start gap-2">
            <svg
              className="h-4 w-4 text-slate-400 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Your request will be submitted as a GitHub Issue in the IB Prep
              repository. It may be publicly visible.
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={status.loading}
            >
              {status.loading ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
