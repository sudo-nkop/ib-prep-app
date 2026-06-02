import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { Question } from "@/lib/types"

const questionsDir = path.join(process.cwd(), "data", "questions")

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Question>

    // Validate required fields
    const required = [
      "id",
      "subjectId",
      "topic",
      "paper",
      "level",
      "format",
      "commandTerm",
      "marks",
      "prompt",
      "markScheme",
    ] as const

    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    if (body.format === "MCQ") {
      if (!body.options || body.options.length < 2) {
        return NextResponse.json(
          { error: "MCQ questions require at least 2 options" },
          { status: 400 }
        )
      }
      if (!body.correctOption) {
        return NextResponse.json(
          { error: "MCQ questions require a correctOption" },
          { status: 400 }
        )
      }
    }

    const filePath = path.join(questionsDir, `${body.subjectId}.json`)

    let questions: Question[] = []
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8")
      questions = JSON.parse(raw) as Question[]
    }

    // Check for duplicate id
    if (questions.some((q) => q.id === body.id)) {
      return NextResponse.json(
        { error: `Question with id "${body.id}" already exists` },
        { status: 409 }
      )
    }

    const newQuestion: Question = {
      id: body.id as string,
      subjectId: body.subjectId as string,
      topic: body.topic as string,
      paper: body.paper as Question["paper"],
      level: body.level as Question["level"],
      format: body.format as Question["format"],
      commandTerm: body.commandTerm as string,
      marks: Number(body.marks),
      prompt: body.prompt as string,
      markScheme: body.markScheme as string,
      ...(body.options ? { options: body.options } : {}),
      ...(body.correctOption ? { correctOption: body.correctOption } : {}),
      ...(body.exemplarAnswer ? { exemplarAnswer: body.exemplarAnswer } : {}),
    }

    questions.push(newQuestion)
    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), "utf-8")

    return NextResponse.json(
      { success: true, question: newQuestion },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
