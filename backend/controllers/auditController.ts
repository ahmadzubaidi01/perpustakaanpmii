import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { AuditLog } from '../models';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { PAGINATION_DEFAULTS } from '../config/constants';

const listAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string, 10) || PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
  const offset = (page - 1) * limit;

  const where: any = {};

  if (req.query.action_type) where.action_type = req.query.action_type;
  if (req.query.table_name) where.table_name = req.query.table_name;
  if (req.query.performed_by_user_id) where.performed_by_user_id = req.query.performed_by_user_id;
  if (req.query.affected_record_id) where.affected_record_id = req.query.affected_record_id;
  if (req.query.start_date && req.query.end_date) {
    where.created_at = { [Op.between]: [new Date(req.query.start_date as string), new Date(req.query.end_date as string)] };
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [{ association: 'performed_by', attributes: ['user_id', 'full_name', 'email_address'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  apiResponse.success(res, 'Audit logs retrieved', {
    logs: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

const getAuditLog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const log = await AuditLog.findByPk(req.params.log_id as string, { include: [{ association: 'performed_by', attributes: ['user_id', 'full_name', 'email_address'] }] });
  if (!log) { apiResponse.notFound(res, 'Audit log not found'); return; }
  apiResponse.success(res, 'Audit log retrieved', log);
});

export { listAuditLogs, getAuditLog };
