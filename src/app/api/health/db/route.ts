import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startTime = Date.now();
    const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      database: "Neon PostgreSQL",
      connected: true,
      queryResult: result,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unknown database error";
    // Sanitize error message to avoid exposing database credentials
    const sanitizedMessage = rawMessage.replace(
      /(postgres(?:ql)?:\/\/)[^@]+@/gi,
      "$1***:***@"
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "Neon PostgreSQL",
        connected: false,
        error: sanitizedMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

