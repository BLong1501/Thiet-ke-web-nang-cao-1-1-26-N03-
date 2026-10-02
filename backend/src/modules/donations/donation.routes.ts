import { Router } from 'express';
import { authenticate, authorize } from '../../core/middleware/auth.middleware';
import { validate } from '../../core/middleware/validate.middleware';
import { createDonationSchema, emptyActionSchema, reasonSchema } from './donation.validation';
import { donationController as controller } from './donation.controller';

export const donationRouter = Router();
donationRouter.use(authenticate);
donationRouter.post('/', validate(createDonationSchema), controller.create);
donationRouter.post('/campaigns/:campaignId/cancel', authorize('ADMIN'), validate(reasonSchema), controller.cancel);
donationRouter.get('/campaigns/:campaignId/reconciliation', authorize('ADMIN'), controller.reconcile);
donationRouter.get('/:id', controller.detail);
donationRouter.post('/:id/confirm-demo', authorize('ADMIN'), validate(emptyActionSchema), controller.confirm);
donationRouter.post('/:id/refund', validate(reasonSchema), controller.refund);
