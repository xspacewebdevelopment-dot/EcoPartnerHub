import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface LogActionParams {
  action: string;
  userId?: string;
  actorId?: string;
  targetEntity?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Creates an audit log entry for security and compliance tracking.
 */
export async function logAudit(params: LogActionParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId,
        actorId: params.actorId || params.userId,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
