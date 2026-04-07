import { NextResponse } from "next/server";

import { submitGeneration } from "@/lib/server/generation";
import { generateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid generation payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const generation = await submitGeneration(parsed.data);
    return NextResponse.json({ generation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit generation",
      },
      { status: 500 },
    );
  }
}
