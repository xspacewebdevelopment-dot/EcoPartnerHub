
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch all active marketplaces
export async function GET() {
  try {
    const marketplaces = await prisma.marketplace.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        regionCode: true,
        currency: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: marketplaces.length,
        data: marketplaces,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get marketplaces error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
