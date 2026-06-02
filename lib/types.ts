export type Level = "SL" | "HL" | "Both"
export type Format = "MCQ" | "ShortAnswer" | "Essay"
export type Group = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Subject {
  id: string
  name: string
  code: string
  group: Group
  level: Level
  color: string
  topics: string[]
}

export interface Option {
  label: string
  text: string
}

export interface Question {
  id: string
  subjectId: string
  topic: string
  paper: 1 | 2 | 3
  level: Level
  format: Format
  commandTerm: string
  marks: number
  prompt: string
  options?: Option[]
  correctOption?: string
  markScheme: string
  exemplarAnswer?: string
}
