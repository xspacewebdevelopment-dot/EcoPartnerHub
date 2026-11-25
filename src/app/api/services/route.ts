
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryId = searchParams.get("categoryId")?.trim();
    const search = searchParams.get("search")?.trim();

    const services = await prisma.service.findMany({
      where: {
        isActive: true,

        ...(categoryId && {
          categoryId,
        }),

        ...(search && {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }),
      },

      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        description: true,
        iconUrl: true,
        displayOrder: true,

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },

      orderBy: {
        displayOrder: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: services.length,
        data: services,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get services error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch services",
      },
      { status: 500 }
    );
  }
}
