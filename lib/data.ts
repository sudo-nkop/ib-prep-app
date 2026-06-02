import fs from "fs"
import path from "path"
import type { Subject, Question } from "./types"

const dataDir = path.join(process.cwd(), "data")

export function getSubjects(): Subject[] {
  const filePath = path.join(dataDir, "subjects.json")
  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as Subject[]
}

export function getSubjectById(id: string): Subject | undefined {
  return getSubjects().find((s) => s.id === id)
}

export function getQuestionsForSubject(subjectId: string): Question[] {
  const filePath = path.join(dataDir, "questions", `${subjectId}.json`)
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as Question[]
}

export function getAllQuestions(): Question[] {
  const subjects = getSubjects()
  return subjects.flatMap((s) => getQuestionsForSubject(s.id))
}

export function getQuestionCountBySubject(): Record<string, number> {
  const subjects = getSubjects()
  const counts: Record<string, number> = {}
  for (const s of subjects) {
    counts[s.id] = getQuestionsForSubject(s.id).length
  }
  return counts
}

export function getQuestionCountByTopic(subjectId: string): Record<string, number> {
  const questions = getQuestionsForSubject(subjectId)
  const counts: Record<string, number> = {}
  for (const q of questions) {
    counts[q.topic] = (counts[q.topic] ?? 0) + 1
  }
  return counts
}
