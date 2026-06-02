import { NextResponse } from "next/server"
import { createContentRequest } from "@/lib/github"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      subject?: string
      type?: string
      description?: string
      email?: string
    }

    if (!body.subject || !body.type || !body.description) {
      return NextResponse.json(
        { error: "subject, type, and description are required" },
        { status: 400 }
      )
    }

    const result = await createContentRequest({
      subject: body.subject,
      type: body.type,
      description: body.description,
      email: body.email,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, issueUrl: result.issueUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
