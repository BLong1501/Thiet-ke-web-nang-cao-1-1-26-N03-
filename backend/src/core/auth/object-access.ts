import { CampaignStatus, UserRole } from "@prisma/client";
import { AppError } from "../errors/app.error";
import { auditService } from "../services/audit.service";

export type Actor = { userId: string; role: string };

/** Trạng thái chiến dịch được xem công khai. Bản nháp/chờ duyệt không lộ qua ID. */
export const PUBLIC_CAMPAIGN_STATUSES: ReadonlySet<CampaignStatus> = new Set([
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.COMPLETED,
  CampaignStatus.CANCELLED,
]);

export function isAdmin(actor?: Actor | null): boolean {
  return actor?.role === UserRole.ADMIN;
}

export function isOwner(actor: Actor | null | undefined, ownerId: string | null | undefined): boolean {
  return Boolean(actor?.userId && ownerId && actor.userId === ownerId);
}

export function canSeeUnpublishedCampaign(
  actor: Actor | null | undefined,
  fundraiserId: string
): boolean {
  return isAdmin(actor) || isOwner(actor, fundraiserId);
}

async function recordDeniedAccess(
  actor: Actor,
  entityName: string,
  entityId: string,
  ownerIds: Array<string | null | undefined>
): Promise<void> {
  await auditService.log({
    userId: actor.userId,
    action: "IDOR_ATTEMPT_BLOCKED",
    entityName,
    entityId,
    details: {
      actorId: actor.userId,
      actorRole: actor.role,
      resourceOwnerIds: ownerIds.filter(Boolean),
    },
  });
}

/**
 * Kiểm quyền trên đối tượng: chỉ chủ sở hữu (hoặc ADMIN nếu cho phép) được thao tác.
 */
export async function assertObjectAccess(params: {
  actor?: Actor | null;
  ownerId: string | null | undefined;
  entityName: string;
  entityId: string;
  allowAdmin?: boolean;
  message?: string;
}): Promise<void> {
  return assertAnyObjectAccess({
    ...params,
    ownerIds: [params.ownerId],
  });
}

export async function assertAnyObjectAccess(params: {
  actor?: Actor | null;
  ownerIds: Array<string | null | undefined>;
  entityName: string;
  entityId: string;
  allowAdmin?: boolean;
  message?: string;
}): Promise<void> {
  const allowAdmin = params.allowAdmin !== false;
  if (!params.actor?.userId) {
    throw new AppError("Yêu cầu đăng nhập để truy cập tài nguyên này", 401);
  }
  if (allowAdmin && isAdmin(params.actor)) return;
  if (params.ownerIds.some((id) => isOwner(params.actor, id))) return;

  await recordDeniedAccess(params.actor, params.entityName, params.entityId, params.ownerIds);
  throw new AppError(
    params.message || "Bạn không có quyền thao tác trên tài nguyên này",
    403
  );
}
