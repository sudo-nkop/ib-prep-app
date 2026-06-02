import { NextResponse } from "next/server"
import { getQuestionsForSubject } from "@/lib/data"

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const questions = getQuestionsForSubject(params.slug)
  return NextResponse.json(questions)
}
