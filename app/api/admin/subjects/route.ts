import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { Subject } from "@/lib/types"

const subjectsPath = path.join(process.cwd(), "data", "subjects.json")

export async function GET() {
  const raw = fs.readFileSync(subjectsPath, "utf-8")
  const subjects = JSON.parse(raw) as Subject[]
  return NextResponse.json(subjects)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Subject>

    // Validate required fields
    const required = ["id", "name", "code", "group", "level", "color", "topics"] as const
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const raw = fs.readFileSync(subjectsPath, "utf-8")
    const subjects = JSON.parse(raw) as Subject[]

    // Check for duplicate id
    if (subjects.some((s) => s.id === body.id)) {
      return NextResponse.json(
        { error: `Subject with id "${body.id}" already exists` },
        { status: 409 }
      )
    }

    const newSubject: Subject = {
      id: body.id as string,
      name: body.name as string,
      code: body.code as string,
      group: body.group as Subject["group"],
      level: body.level as Subject["level"],
      color: body.color as string,
      topics: body.topics as string[],
    }

    subjects.push(newSubject)
    fs.writeFileSync(subjectsPath, JSON.stringify(subjects, null, 2), "utf-8")

    return NextResponse.json({ success: true, subject: newSubject }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
