import { Prisma, ReportStatus, ReportTargetType } from "@prisma/client";
import { prisma } from "../../core/database/prisma";

export class ReportRepository {
  /** Kiểm tra đối tượng bị báo cáo có tồn tại hay không. */
  async targetExists(type: ReportTargetType, id: string): Promise<boolean> {
    switch (type) {
      case ReportTargetType.CAMPAIGN:
        return (await prisma.campaign.count({ where: { id } })) > 0;
      case ReportTargetType.USER:
        return (await prisma.user.count({ where: { id } })) > 0;
      case ReportTargetType.POST:
        return (await prisma.communityPost.count({ where: { id } })) > 0;
      case ReportTargetType.COMMENT:
        return (await prisma.comment.count({ where: { id } })) > 0;
    }
  }

  findPendingDuplicate(reporterId: string, targetType: ReportTargetType, targetId: string) {
    return prisma.report.findFirst({
      where: { reporterId, targetType, targetId, status: ReportStatus.PENDING },
      select: { id: true },
    });
  }

  create(data: Prisma.ReportUncheckedCreateInput) {
    return prisma.report.create({ data });
  }

  async list(where: Prisma.ReportWhereInput, skip: number, take: number) {
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take,
        include: { reporter: { select: { id: true, fullName: true, email: true } } },
      }),
      prisma.report.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Chuyển PENDING -> trạng thái cuối bằng một câu lệnh có điều kiện, nên hai admin
   * xử lý đồng thời chỉ có một người thành công (không ghi đè nhau).
   */
  async resolveIfPending(
    id: string,
    data: { status: ReportStatus; resolvedBy: string; resolutionNote: string },
  ) {
    const result = await prisma.report.updateMany({
      where: { id, status: ReportStatus.PENDING },
      data,
    });
    return result.count;
  }

  findById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  }
}

export const reportRepository = new ReportRepository();
