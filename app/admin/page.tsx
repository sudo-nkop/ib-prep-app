"use client"

import { useState, useEffect } from "react"
import type { Subject, Question } from "@/lib/types"

type Tab = "subject" | "question"

interface FormStatus {
  loading: boolean
  success: boolean
  error: string
}

const EMPTY_STATUS: FormStatus = { loading: false, success: false, error: "" }

const COLORS = [
  { label: "Amber 600", value: "bg-amber-600" },
  { label: "Amber 500", value: "bg-amber-500" },
  { label: "Blue 600", value: "bg-blue-600" },
  { label: "Purple 600", value: "bg-purple-600" },
  { label: "Emerald 600", value: "bg-emerald-600" },
  { label: "Rose 600", value: "bg-rose-600" },
  { label: "Orange 600", value: "bg-orange-600" },
  { label: "Teal 600", value: "bg-teal-600" },
  { label: "Indigo 600", value: "bg-indigo-600" },
  { label: "Pink 600", value: "bg-pink-600" },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("question")
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Subject form state
  const [subjectForm, setSubjectForm] = useState({
    id: "",
    name: "",
    code: "",
    group: "3",
    level: "SL" as Subject["level"],
    color: "bg-blue-600",
    topicsInput: "",
  })
  const [subjectStatus, setSubjectStatus] = useState<FormStatus>(EMPTY_STATUS)

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    id: "",
    subjectId: "",
    topic: "",
    paper: "1",
    level: "SL" as Question["level"],
    format: "MCQ" as Question["format"],
    commandTerm: "",
    marks: "1",
    prompt: "",
    markScheme: "",
    exemplarAnswer: "",
    correctOption: "A",
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
  })
  const [questionStatus, setQuestionStatus] = useState<FormStatus>(EMPTY_STATUS)

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then((r) => r.json())
      .then((data: Subject[]) => setSubjects(data))
      .catch(() => {})
  }, [])

  // --- Subject form handlers ---

  const handleSubjectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setSubjectForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubjectStatus({ loading: true, success: false, error: "" })

    const topics = subjectForm.topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    if (topics.length === 0) {
      setSubjectStatus({
        loading: false,
        success: false,
        error: "Enter at least one topic",
      })
      return
    }

    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subjectForm.id,
          name: subjectForm.name,
          code: subjectForm.code,
          group: Number(subjectForm.group),
          level: subjectForm.level,
          color: subjectForm.color,
          topics,
        }),
      })

      const data = (await res.json()) as { success?: boolean; error?: string; subject?: Subject }

      if (!res.ok) {
        setSubjectStatus({
          loading: false,
          success: false,
          error: data.error ?? "Failed to save subject",
        })
        return
      }

      setSubjectStatus({ loading: false, success: true, error: "" })
      if (data.subject) {
        setSubjects((prev) => [...prev, data.subject!])
      }
      setSubjectForm({
        id: "",
        name: "",
        code: "",
        group: "3",
        level: "SL",
        color: "bg-blue-600",
        topicsInput: "",
      })
    } catch {
      setSubjectStatus({
        loading: false,
        success: false,
        error: "Network error — could not save subject",
      })
    }
  }

  // --- Question form handlers ---

  const handleQuestionChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setQuestionForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleOptionChange = (index: number, text: string) => {
    setQuestionForm((prev) => {
      const opts = [...prev.options]
      opts[index] = { ...opts[index], text }
      return { ...prev, options: opts }
    })
  }

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuestionStatus({ loading: true, success: false, error: "" })

    const payload: Partial<Question> = {
      id: questionForm.id,
      subjectId: questionForm.subjectId,
      topic: questionForm.topic,
      paper: Number(questionForm.paper) as Question["paper"],
      level: questionForm.level,
      format: questionForm.format,
      commandTerm: questionForm.commandTerm,
      marks: Number(questionForm.marks),
      prompt: questionForm.prompt,
      markScheme: questionForm.markScheme,
      ...(questionForm.exemplarAnswer
        ? { exemplarAnswer: questionForm.exemplarAnswer }
        : {}),
    }

    if (questionForm.format === "MCQ") {
      payload.options = questionForm.options.filter((o) => o.text.trim())
      payload.correctOption = questionForm.correctOption
    }

    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok) {
        setQuestionStatus({
          loading: false,
          success: false,
          error: data.error ?? "Failed to save question",
        })
        return
      }

      setQuestionStatus({ loading: false, success: true, error: "" })
      setQuestionForm((prev) => ({
        ...prev,
        id: "",
        prompt: "",
        markScheme: "",
        exemplarAnswer: "",
        options: [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ],
      }))
    } catch {
      setQuestionStatus({
        loading: false,
        success: false,
        error: "Network error — could not save question",
      })
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "question", label: "Add Question" },
    { key: "subject", label: "Add Subject" },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Add new subjects and questions to the question bank.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Subject form */}
      {activeTab === "subject" && (
        <form onSubmit={handleSubjectSubmit} className="card p-6 flex flex-col gap-5">
          <h2 className="text-base font-semibold text-slate-900">
            New Subject
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="s-id">ID (slug)</label>
              <input
                id="s-id"
                name="id"
                className="input"
                placeholder="e.g. biology-sl"
                value={subjectForm.id}
                onChange={handleSubjectChange}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="s-code">Code</label>
              <input
                id="s-code"
                name="code"
                className="input"
                placeholder="e.g. BIO-SL"
                value={subjectForm.code}
                onChange={handleSubjectChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="s-name">Full Name</label>
            <input
              id="s-name"
              name="name"
              className="input"
              placeholder="e.g. Biology SL"
              value={subjectForm.name}
              onChange={handleSubjectChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="label" htmlFor="s-group">IB Group</label>
              <select
                id="s-group"
                name="group"
                className="select"
                value={subjectForm.group}
                onChange={handleSubjectChange}
              >
                <option value="0">Core</option>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={String(g)}>
                    Group {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="s-level">Level</label>
              <select
                id="s-level"
                name="level"
                className="select"
                value={subjectForm.level}
                onChange={handleSubjectChange}
              >
                <option value="SL">SL</option>
                <option value="HL">HL</option>
                <option value="Both">Both (SL/HL)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="s-color">Color</label>
              <select
                id="s-color"
                name="color"
                className="select"
                value={subjectForm.color}
                onChange={handleSubjectChange}
              >
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="s-topics">Topics (comma-separated)</label>
            <input
              id="s-topics"
              name="topicsInput"
              className="input"
              placeholder="e.g. Cell Biology, Genetics, Ecology"
              value={subjectForm.topicsInput}
              onChange={handleSubjectChange}
              required
            />
          </div>

          {subjectStatus.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {subjectStatus.error}
            </div>
          )}
          {subjectStatus.success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              Subject saved successfully!
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={subjectStatus.loading}
            >
              {subjectStatus.loading ? "Saving…" : "Save Subject"}
            </button>
          </div>
        </form>
      )}

      {/* Add Question form */}
      {activeTab === "question" && (
        <form onSubmit={handleQuestionSubmit} className="card p-6 flex flex-col gap-5">
          <h2 className="text-base font-semibold text-slate-900">
            New Question
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="q-id">Question ID</label>
              <input
                id="q-id"
                name="id"
                className="input"
                placeholder="e.g. hist-hl-009"
                value={questionForm.id}
                onChange={handleQuestionChange}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="q-subject">Subject</label>
              <select
                id="q-subject"
                name="subjectId"
                className="select"
                value={questionForm.subjectId}
                onChange={handleQuestionChange}
                required
              >
                <option value="">Select a subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="q-topic">Topic</label>
              <input
                id="q-topic"
                name="topic"
                className="input"
                placeholder="e.g. Rights and Protest"
                value={questionForm.topic}
                onChange={handleQuestionChange}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="q-command">Command Term</label>
              <input
                id="q-command"
                name="commandTerm"
                className="input"
                placeholder="e.g. explain, discuss, compare"
                value={questionForm.commandTerm}
                onChange={handleQuestionChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <label className="label" htmlFor="q-format">Format</label>
              <select
                id="q-format"
                name="format"
                className="select"
                value={questionForm.format}
                onChange={handleQuestionChange}
              >
                <option value="MCQ">MCQ</option>
                <option value="ShortAnswer">Short Answer</option>
                <option value="Essay">Essay</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="q-paper">Paper</label>
              <select
                id="q-paper"
                name="paper"
                className="select"
                value={questionForm.paper}
                onChange={handleQuestionChange}
              >
                <option value="1">Paper 1</option>
                <option value="2">Paper 2</option>
                <option value="3">Paper 3</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="q-level">Level</label>
              <select
                id="q-level"
                name="level"
                className="select"
                value={questionForm.level}
                onChange={handleQuestionChange}
              >
                <option value="SL">SL</option>
                <option value="HL">HL</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="q-marks">Marks</label>
              <input
                id="q-marks"
                name="marks"
                type="number"
                min="1"
                max="25"
                className="input"
                value={questionForm.marks}
                onChange={handleQuestionChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="q-prompt">Question Prompt</label>
            <textarea
              id="q-prompt"
              name="prompt"
              className="textarea min-h-[100px]"
              placeholder="Enter the full question prompt here…"
              value={questionForm.prompt}
              onChange={handleQuestionChange}
              required
            />
          </div>

          {/* MCQ-specific fields */}
          {questionForm.format === "MCQ" && (
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700">
                MCQ Options
              </h3>
              {questionForm.options.map((opt, i) => (
                <div key={opt.label} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {opt.label}
                  </span>
                  <input
                    className="input flex-1"
                    placeholder={`Option ${opt.label} text…`}
                    value={opt.text}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                  />
                </div>
              ))}
              <div>
                <label className="label" htmlFor="q-correct">Correct Option</label>
                <select
                  id="q-correct"
                  name="correctOption"
                  className="select w-28"
                  value={questionForm.correctOption}
                  onChange={handleQuestionChange}
                >
                  {["A", "B", "C", "D"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="q-markscheme">Mark Scheme</label>
            <textarea
              id="q-markscheme"
              name="markScheme"
              className="textarea min-h-[100px]"
              placeholder="Enter the mark scheme / model answer criteria…"
              value={questionForm.markScheme}
              onChange={handleQuestionChange}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="q-exemplar">
              Exemplar Answer{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="q-exemplar"
              name="exemplarAnswer"
              className="textarea min-h-[80px]"
              placeholder="Optional model answer for students to compare against…"
              value={questionForm.exemplarAnswer}
              onChange={handleQuestionChange}
            />
          </div>

          {questionStatus.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {questionStatus.error}
            </div>
          )}
          {questionStatus.success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              Question saved successfully!
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={questionStatus.loading}
            >
              {questionStatus.loading ? "Saving…" : "Save Question"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
