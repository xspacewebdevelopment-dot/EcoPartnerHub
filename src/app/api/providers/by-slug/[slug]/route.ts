
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ProviderVerificationStatus,
  ListingStatus,
} from "@prisma/client";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    if (!slug?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider slug is required",
        },
        { status: 400 }
      );
    }

    const provider = await prisma.providerProfile.findFirst({
      where: {
        slug: slug.trim(),
        verificationStatus: ProviderVerificationStatus.APPROVED,
        isPubliclyVisible: true,
        deletedAt: null,
      },

      select: {
        id: true,
        businessName: true,
        slug: true,
        description: true,
        tagline: true,
        logoUrl: true,
        bannerUrl: true,
        website: true,
        city: true,
        state: true,
        country: true,
        rating: true,
        reviewCount: true,
        membershipTier: true,
        verifiedAt: true,

        services: {
          where: {
            status: ListingStatus.ACTIVE,
            service: {
              isActive: true,
            },
          },
          select: {
            id: true,
            customTitle: true,
            customDescription: true,
            pricingModel: true,
            startingPrice: true,
            currency: true,
            service: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },

        marketplaces: {
          where: {
            isListed: true,
            marketplace: {
              isActive: true,
            },
          },
          select: {
            id: true,
            listingPriority: true,
            marketplace: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                regionCode: true,
              },
            },
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Provider fetched successfully",
        data: provider,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get provider by slug error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
