import { Request, Response } from 'express';
import { BorrowingSetting } from '../models';
import { AuditActionType, TABLE_NAMES } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';

const getSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let settings = await BorrowingSetting.findByPk(1);

  // Auto-create default settings if not exists
  if (!settings) {
    settings = await BorrowingSetting.create({
      max_borrow_days: 30,
      default_borrow_days: 14,
      max_books_per_borrower: 3,
    });
  }

  apiResponse.success(res, 'Settings retrieved', settings);
});

const updateSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let settings = await BorrowingSetting.findByPk(1);
  if (!settings) {
    settings = await BorrowingSetting.create({
      max_borrow_days: 30,
      default_borrow_days: 14,
      max_books_per_borrower: 3,
    });
  }

  const oldValue = settings.toJSON();
  const { max_borrow_days, default_borrow_days, max_books_per_borrower } = req.body;

  await settings.update({
    max_borrow_days: max_borrow_days !== undefined ? parseInt(max_borrow_days, 10) : settings.max_borrow_days,
    default_borrow_days: default_borrow_days !== undefined ? parseInt(default_borrow_days, 10) : settings.default_borrow_days,
    max_books_per_borrower: max_books_per_borrower !== undefined ? parseInt(max_books_per_borrower, 10) : settings.max_books_per_borrower,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.UPDATE, TABLE_NAMES.BORROWING_SETTINGS, settings.setting_id, oldValue, settings.toJSON()));
  apiResponse.success(res, 'Pengaturan berhasil diperbarui', settings);
});

export { getSettings, updateSettings };
