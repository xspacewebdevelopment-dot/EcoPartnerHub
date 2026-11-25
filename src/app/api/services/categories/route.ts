
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconUrl: true,
        parentId: true,
        displayOrder: true,
        children: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            iconUrl: true,
            displayOrder: true,
          },
          orderBy: {
            displayOrder: "asc",
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
        count: categories.length,
        data: categories,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get categories error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch categories",
      },
      { status: 500 }
    );
  }
}
