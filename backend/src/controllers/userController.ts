import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Faculty, StudyProgram } from '../models';
import { AuditActionType, TABLE_NAMES, UserRole, AccountStatus } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';
import { validatePasswordComplexity } from '../utils/helpers';
import { PAGINATION_DEFAULTS } from '../config/constants';
import env from '../config/environment';

const saveUploadedFile = (file: Express.Multer.File): string => {
  const randomName = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${timestamp}-${randomName}${ext}`;
  const uploadDir = path.resolve(__dirname, '..', '..', env.UPLOAD_DIR);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return `/uploads/${filename}`;
};

const listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string, 10) || PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
  const offset = (page - 1) * limit;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const faculty_id = req.query.faculty_id as string;

  const where: any = {};
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { nim: { [Op.like]: `%${search}%` } },
      { email_address: { [Op.like]: `%${search}%` } },
    ];
  }
  if (role) where.user_role = role;
  if (faculty_id) where.faculty_id = parseInt(faculty_id, 10);

  const { count, rows } = await User.findAndCountAll({
    where,
    include: [
      { association: 'faculty', attributes: ['faculty_id', 'faculty_name', 'faculty_code'], required: false },
      { association: 'study_program', attributes: ['program_id', 'program_name', 'program_code'], required: false },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  apiResponse.success(res, 'Users retrieved', {
    users: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

const getUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(parseInt(req.params.user_id as string, 10), {
    include: [
      { association: 'faculty', attributes: ['faculty_id', 'faculty_name', 'faculty_code'], required: false },
      { association: 'study_program', attributes: ['program_id', 'program_name', 'program_code'], required: false },
    ],
  });
  if (!user) { apiResponse.notFound(res, 'User tidak ditemukan'); return; }
  apiResponse.success(res, 'User retrieved', user);
});

const createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { full_name, email_address, password, phone_number, nim, user_role, faculty_id, program_id, account_status } = req.body;

  if (!full_name || !email_address || !password || !user_role) {
    apiResponse.badRequest(res, 'Nama, email, password, dan role wajib diisi');
    return;
  }

  const passwordCheck = validatePasswordComplexity(password);
  if (!passwordCheck.valid) { apiResponse.unprocessable(res, 'Password tidak memenuhi persyaratan', passwordCheck.errors); return; }

  const existingEmail = await User.scope('withDeleted').findOne({ where: { email_address } });
  if (existingEmail) { apiResponse.conflict(res, 'Email sudah terdaftar'); return; }

  if (nim) {
    const existingNim = await User.scope('withDeleted').findOne({ where: { nim } });
    if (existingNim) { apiResponse.conflict(res, 'NIM sudah terdaftar'); return; }
  }

  // Validate faculty/program relationship
  if (faculty_id && program_id) {
    const program = await StudyProgram.findOne({ where: { program_id, faculty_id } });
    if (!program) { apiResponse.badRequest(res, 'Program studi tidak sesuai dengan fakultas'); return; }
  }

  const password_hash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  const profile_photo_url = req.file ? saveUploadedFile(req.file) : null;

  const user = await User.create({
    full_name,
    email_address,
    password_hash,
    phone_number: phone_number || null,
    nim: nim || null,
    user_role: user_role as UserRole,
    account_status: (account_status as AccountStatus) || AccountStatus.ACTIVE,
    faculty_id: faculty_id ? parseInt(faculty_id, 10) : null,
    program_id: program_id ? parseInt(program_id, 10) : null,
    profile_photo_url,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.CREATE, TABLE_NAMES.USERS, user.user_id, null, { full_name, email_address, user_role }));
  apiResponse.created(res, 'User berhasil dibuat', user);
});

const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(parseInt(req.params.user_id as string, 10));
  if (!user) { apiResponse.notFound(res, 'User tidak ditemukan'); return; }

  const oldValue = user.toJSON();
  const { full_name, email_address, phone_number, nim, user_role, faculty_id, program_id, account_status } = req.body;

  // Check email uniqueness
  if (email_address && email_address !== user.email_address) {
    const existing = await User.findOne({ where: { email_address, user_id: { [Op.ne]: user.user_id } } });
    if (existing) { apiResponse.conflict(res, 'Email sudah digunakan'); return; }
  }

  // Check NIM uniqueness
  if (nim && nim !== user.nim) {
    const existing = await User.findOne({ where: { nim, user_id: { [Op.ne]: user.user_id } } });
    if (existing) { apiResponse.conflict(res, 'NIM sudah digunakan'); return; }
  }

  const profile_photo_url = req.file ? saveUploadedFile(req.file) : user.profile_photo_url;

  await user.update({
    full_name: full_name || user.full_name,
    email_address: email_address || user.email_address,
    phone_number: phone_number !== undefined ? phone_number : user.phone_number,
    nim: nim !== undefined ? nim : user.nim,
    user_role: user_role || user.user_role,
    faculty_id: faculty_id !== undefined ? (faculty_id ? parseInt(faculty_id, 10) : null) : user.faculty_id,
    program_id: program_id !== undefined ? (program_id ? parseInt(program_id, 10) : null) : user.program_id,
    account_status: account_status || user.account_status,
    profile_photo_url,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.UPDATE, TABLE_NAMES.USERS, user.user_id, oldValue, user.toJSON()));
  apiResponse.success(res, 'User berhasil diperbarui', user);
});

const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(parseInt(req.params.user_id as string, 10));
  if (!user) { apiResponse.notFound(res, 'User tidak ditemukan'); return; }

  if (user.user_id === req.user!.user_id) {
    apiResponse.badRequest(res, 'Tidak bisa menghapus akun sendiri');
    return;
  }

  await user.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.SOFT_DELETE, TABLE_NAMES.USERS, user.user_id));
  apiResponse.success(res, 'User berhasil dihapus');
});

const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(req.user!.user_id);
  if (!user) { apiResponse.notFound(res, 'User tidak ditemukan'); return; }

  const { full_name, phone_number } = req.body;
  const profile_photo_url = req.file ? saveUploadedFile(req.file) : user.profile_photo_url;

  await user.update({
    full_name: full_name || user.full_name,
    phone_number: phone_number !== undefined ? phone_number : user.phone_number,
    profile_photo_url,
  });

  apiResponse.success(res, 'Profil berhasil diperbarui', user);
});

const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { current_password, new_password } = req.body;

  const user = await User.scope('withPassword').findByPk(req.user!.user_id);
  if (!user) { apiResponse.notFound(res, 'User tidak ditemukan'); return; }

  const isValid = await bcrypt.compare(current_password, user.password_hash);
  if (!isValid) { apiResponse.unauthorized(res, 'Password saat ini salah'); return; }

  const pwCheck = validatePasswordComplexity(new_password);
  if (!pwCheck.valid) { apiResponse.unprocessable(res, 'Password baru tidak memenuhi persyaratan', pwCheck.errors); return; }

  const password_hash = await bcrypt.hash(new_password, env.BCRYPT_SALT_ROUNDS);
  await user.update({ password_hash });

  apiResponse.success(res, 'Password berhasil diubah');
});

export { listUsers, getUser, createUser, updateUser, deleteUser, updateProfile, changePassword };
