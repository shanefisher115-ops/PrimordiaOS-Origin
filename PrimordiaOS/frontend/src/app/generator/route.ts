import { NextResponse } from "next/server"
import { Generator } from "@/primordia/generator"

export async function POST(req: Request) {
  const body = await req.json()

  const pipeline = Generator.generatePipeline(body)
  const artifacts = await Generator.emitArtifacts(pipeline)

  return NextResponse.json(artifacts)
}
