import { Request, Response, NextFunction } from 'express';
import { donationService as service } from './donation.service';
import { sendSuccess } from '../../core/utils/response.util';

const handle = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

export const donationController = {
  create: handle(async (req, res) => {
    const result = await service.create(req.user!, req.body);
    return sendSuccess(res, result.replayed ? 200 : 201, 'Đã tạo yêu cầu đóng góp', result);
  }),
  confirm: handle(async (req, res) => sendSuccess(res, 200, 'Xác nhận thanh toán mô phỏng thành công', await service.confirm(req.user!, String(req.params.id)))),
  refund: handle(async (req, res) => sendSuccess(res, 200, 'Hoàn tiền mô phỏng thành công', await service.refund(req.user!, String(req.params.id), req.body.reason))),
  detail: handle(async (req, res) => sendSuccess(res, 200, 'Thông tin đóng góp', await service.detail(req.user!, String(req.params.id)))),
  cancel: handle(async (req, res) => sendSuccess(res, 200, 'Đã hủy chiến dịch', await service.cancelCampaign(req.user!, String(req.params.campaignId), req.body.reason))),
  reconcile: handle(async (req, res) => sendSuccess(res, 200, 'Đối soát bút toán', await service.reconcile(req.user!, String(req.params.campaignId)))),
};
