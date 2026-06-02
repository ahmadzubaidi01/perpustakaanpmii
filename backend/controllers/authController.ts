import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, RefreshToken, UserSession, PasswordReset, Faculty, StudyProgram } from '../models';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../middleware/auth';
import { AccountStatus, UserRole, SessionStatus, AuditActionType, TABLE_NAMES } from '../config/constants';
import env from '../config/environment';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';
import { generateSecureToken, hashToken, validatePasswordComplexity, generateUUID } from '../utils/helpers';
import { sendEmailNotification } from '../services/notificationService';

/**
 * Public registration for borrowers.
 * Required: full_name, email_address, password, nim, phone_number, faculty_id, program_id
 */
const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { full_name, email_address, password, phone_number, nim, faculty_id, program_id } = req.body;

  // Validate required fields
  if (!full_name || !email_address || !password || !nim || !faculty_id || !program_id) {
    apiResponse.badRequest(res, 'Full name, email, password, NIM, faculty, and study program are required');
    return;
  }

  // Validate password complexity
  const passwordCheck = validatePasswordComplexity(password);
  if (!passwordCheck.valid) {
    apiResponse.unprocessable(res, 'Password does not meet requirements', passwordCheck.errors);
    return;
  }

  // Validate NIM uniqueness
  const existingNim = await User.scope('withDeleted').findOne({ where: { nim } });
  if (existingNim) {
    apiResponse.conflict(res, 'NIM sudah terdaftar. Gunakan NIM yang berbeda.');
    return;
  }

  // Validate email uniqueness
  const existingEmail = await User.scope('withDeleted').findOne({ where: { email_address } });
  if (existingEmail) {
    apiResponse.conflict(res, 'Email sudah terdaftar. Gunakan email yang berbeda.');
    return;
  }

  // Validate faculty exists
  const faculty = await Faculty.findByPk(faculty_id);
  if (!faculty) {
    apiResponse.badRequest(res, 'Fakultas tidak ditemukan');
    return;
  }

  // Validate study program exists and belongs to the selected faculty
  const program = await StudyProgram.findOne({ where: { program_id, faculty_id } });
  if (!program) {
    apiResponse.badRequest(res, 'Program studi tidak ditemukan atau tidak sesuai dengan fakultas yang dipilih');
    return;
  }

  const password_hash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    full_name,
    email_address,
    password_hash,
    phone_number: phone_number || null,
    nim,
    user_role: UserRole.BORROWER,
    account_status: AccountStatus.ACTIVE,
    faculty_id,
    program_id,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.CREATE, TABLE_NAMES.USERS, user.user_id, null, { full_name, email_address, nim, user_role: UserRole.BORROWER }));

  apiResponse.created(res, 'Registrasi berhasil', {
    user_id: user.user_id,
    full_name: user.full_name,
    email_address: user.email_address,
    nim: user.nim,
    user_role: user.user_role,
  });
});

const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email_address, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email_address },
    attributes: ['user_id', 'full_name', 'email_address', 'password_hash', 'user_role', 'account_status', 'faculty_id', 'program_id', 'profile_photo_url', 'nim', 'phone_number'],
  });

  if (!user) {
    apiResponse.unauthorized(res, 'Email atau password salah');
    return;
  }

  if (user.account_status !== AccountStatus.ACTIVE) {
    apiResponse.forbidden(res, `Akun ${user.account_status}`);
    return;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    apiResponse.unauthorized(res, 'Email atau password salah');
    return;
  }

  // Check concurrent session limits
  const activeSessions = await UserSession.count({
    where: { user_id: user.user_id, session_status: SessionStatus.ACTIVE, expired_at: { [Op.gt]: new Date() } },
  });

  if (activeSessions >= env.MAX_CONCURRENT_SESSIONS) {
    const oldest = await UserSession.findOne({
      where: { user_id: user.user_id, session_status: SessionStatus.ACTIVE },
      order: [['login_at', 'ASC']],
    });
    if (oldest) await oldest.update({ session_status: SessionStatus.TERMINATED });
  }

  const payload: JwtPayload = {
    user_id: user.user_id,
    user_role: user.user_role,
    email_address: user.email_address,
    faculty_id: user.faculty_id,
    program_id: user.program_id,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  await RefreshToken.create({
    user_id: user.user_id,
    token_hash: tokenHash,
    device_name: req.deviceInfo?.device_name || null,
    device_type: req.deviceInfo?.device_type || null,
    ip_address: req.deviceInfo?.ip_address || null,
    issued_at: now,
    expired_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
  });

  await UserSession.create({
    user_id: user.user_id,
    device_name: req.deviceInfo?.device_name || null,
    device_type: req.deviceInfo?.device_type || null,
    device_os: req.deviceInfo?.device_os || null,
    browser_name: req.deviceInfo?.browser_name || null,
    browser_version: req.deviceInfo?.browser_version || null,
    ip_address: req.deviceInfo?.ip_address || null,
    login_at: now,
    expired_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    session_status: SessionStatus.ACTIVE,
  });

  await user.update({ last_login_at: now });

  // Reload with associations
  await user.reload({
    include: [
      { association: 'faculty', attributes: ['faculty_id', 'faculty_name', 'faculty_code'], required: false },
      { association: 'study_program', attributes: ['program_id', 'program_name', 'program_code'], required: false },
    ],
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.LOGIN, TABLE_NAMES.USERS, user.user_id));

  apiResponse.success(res, 'Login berhasil', {
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      email_address: user.email_address,
      user_role: user.user_role,
      nim: user.nim,
      phone_number: user.phone_number,
      profile_photo_url: user.profile_photo_url,
      faculty_id: user.faculty_id,
      program_id: user.program_id,
      faculty: (user as any).faculty,
      study_program: (user as any).study_program,
    },
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: env.JWT_ACCESS_EXPIRY,
    },
  });
});

const refreshAccessToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    apiResponse.badRequest(res, 'Refresh token is required');
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = verifyRefreshToken(refresh_token);
  } catch {
    apiResponse.unauthorized(res, 'Invalid or expired refresh token');
    return;
  }

  const tokenHash = hashToken(refresh_token);
  const storedToken = await RefreshToken.findOne({
    where: { user_id: decoded.user_id, token_hash: tokenHash, revoked_at: null, expired_at: { [Op.gt]: new Date() } },
  });

  if (!storedToken) {
    apiResponse.unauthorized(res, 'Refresh token has been revoked or expired');
    return;
  }

  const user = await User.findByPk(decoded.user_id, {
    attributes: ['user_id', 'user_role', 'email_address', 'account_status', 'faculty_id', 'program_id'],
  });

  if (!user || user.account_status !== AccountStatus.ACTIVE) {
    apiResponse.unauthorized(res, 'User account is not active');
    return;
  }

  await storedToken.update({ revoked_at: new Date() });

  const payload: JwtPayload = {
    user_id: user.user_id,
    user_role: user.user_role,
    email_address: user.email_address,
    faculty_id: user.faculty_id,
    program_id: user.program_id,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);
  const newTokenHash = hashToken(newRefreshToken);
  const now = new Date();

  await RefreshToken.create({
    user_id: user.user_id,
    token_hash: newTokenHash,
    device_name: req.deviceInfo?.device_name || null,
    device_type: req.deviceInfo?.device_type || null,
    ip_address: req.deviceInfo?.ip_address || null,
    issued_at: now,
    expired_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
  });

  apiResponse.success(res, 'Token refreshed', {
    tokens: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: env.JWT_ACCESS_EXPIRY,
    },
  });
});

const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;

  if (refresh_token) {
    const th = hashToken(refresh_token);
    await RefreshToken.update({ revoked_at: new Date() }, { where: { token_hash: th, user_id: req.user!.user_id } });
  }

  if (req.deviceInfo?.ip_address) {
    await UserSession.update(
      { session_status: SessionStatus.TERMINATED },
      { where: { user_id: req.user!.user_id, ip_address: req.deviceInfo.ip_address, session_status: SessionStatus.ACTIVE } }
    );
  }

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.LOGOUT, TABLE_NAMES.USERS, req.user!.user_id));

  apiResponse.success(res, 'Logged out successfully');
});

const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email_address } = req.body;
  const msg = 'Jika akun dengan email tersebut ada, link reset password telah dikirim.';

  const user = await User.findOne({ where: { email_address } });
  if (!user) {
    apiResponse.success(res, msg);
    return;
  }

  const resetToken = generateSecureToken(32);
  const resetTokenHash = hashToken(resetToken);
  const expiredAt = new Date(Date.now() + env.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await PasswordReset.destroy({ where: { email_address } });
  await PasswordReset.create({ email_address, reset_token_hash: resetTokenHash, expired_at: expiredAt });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmailNotification(
    email_address,
    'Reset Password — Buku PMII Lintang Songo',
    `<h2>Reset Password</h2><p>Klik <a href="${resetUrl}">di sini</a> untuk mereset password Anda. Link berlaku selama ${env.RESET_TOKEN_EXPIRY_MINUTES} menit.</p><p>— Buku PMII Lintang Songo</p>`
  );

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.PASSWORD_RESET, TABLE_NAMES.USERS, user.user_id));

  apiResponse.success(res, msg);
});

const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, new_password } = req.body;

  const pwCheck = validatePasswordComplexity(new_password);
  if (!pwCheck.valid) {
    apiResponse.unprocessable(res, 'Password does not meet requirements', pwCheck.errors);
    return;
  }

  const th = hashToken(token);
  const record = await PasswordReset.findOne({ where: { reset_token_hash: th, expired_at: { [Op.gt]: new Date() } } });
  if (!record) {
    apiResponse.badRequest(res, 'Token reset tidak valid atau sudah kadaluarsa');
    return;
  }

  const user = await User.scope('withPassword').findOne({ where: { email_address: record.email_address } });
  if (!user) {
    apiResponse.notFound(res, 'User tidak ditemukan');
    return;
  }

  const ph = await bcrypt.hash(new_password, env.BCRYPT_SALT_ROUNDS);
  await user.update({ password_hash: ph });
  await record.destroy();

  await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: user.user_id, revoked_at: null } });
  await UserSession.update({ session_status: SessionStatus.TERMINATED }, { where: { user_id: user.user_id, session_status: SessionStatus.ACTIVE } });

  apiResponse.success(res, 'Password berhasil direset. Silakan login dengan password baru.');
});

const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByPk(req.user!.user_id, {
    include: [
      { association: 'faculty', attributes: ['faculty_id', 'faculty_name', 'faculty_code'], required: false },
      { association: 'study_program', attributes: ['program_id', 'program_name', 'program_code'], required: false },
    ],
  });

  if (!user) {
    apiResponse.notFound(res, 'User tidak ditemukan');
    return;
  }

  apiResponse.success(res, 'Profile retrieved', user);
});

export { register, login, refreshAccessToken, logout, forgotPassword, resetPassword, getProfile };
