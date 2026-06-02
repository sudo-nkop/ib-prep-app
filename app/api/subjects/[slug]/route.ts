import { NextResponse } from "next/server"
import { getSubjectById } from "@/lib/data"

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const subject = getSubjectById(params.slug)
  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 })
  }
  return NextResponse.json(subject)
}
