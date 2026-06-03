import { Request, Response } from 'express';
import { Faculty, StudyProgram } from '../models';
import { AuditActionType, TABLE_NAMES } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';

const listFaculties = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const faculties = await Faculty.findAll({
    include: [{ association: 'study_programs', attributes: ['program_id', 'program_name', 'program_code'] }],
    order: [['faculty_name', 'ASC']],
  });
  apiResponse.success(res, 'Faculties retrieved', faculties);
});

const getFaculty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const faculty = await Faculty.findByPk(parseInt(req.params.faculty_id as string, 10), {
    include: [{ association: 'study_programs', attributes: ['program_id', 'program_name', 'program_code'] }],
  });
  if (!faculty) { apiResponse.notFound(res, 'Fakultas tidak ditemukan'); return; }
  apiResponse.success(res, 'Faculty retrieved', faculty);
});

const createFaculty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { faculty_name, faculty_code } = req.body;
  if (!faculty_name || !faculty_code) { apiResponse.badRequest(res, 'Nama dan kode fakultas wajib diisi'); return; }

  const existing = await Faculty.findOne({ where: { faculty_code } });
  if (existing) { apiResponse.conflict(res, 'Kode fakultas sudah digunakan'); return; }

  const faculty = await Faculty.create({ faculty_name, faculty_code: faculty_code.toUpperCase() });
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.CREATE, TABLE_NAMES.FACULTIES, faculty.faculty_id, null, { faculty_name, faculty_code }));
  apiResponse.created(res, 'Fakultas berhasil dibuat', faculty);
});

const updateFaculty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const faculty = await Faculty.findByPk(parseInt(req.params.faculty_id as string, 10));
  if (!faculty) { apiResponse.notFound(res, 'Fakultas tidak ditemukan'); return; }

  const { faculty_name, faculty_code } = req.body;
  const oldValue = faculty.toJSON();

  if (faculty_code && faculty_code !== faculty.faculty_code) {
    const existing = await Faculty.findOne({ where: { faculty_code } });
    if (existing) { apiResponse.conflict(res, 'Kode fakultas sudah digunakan'); return; }
  }

  await faculty.update({
    faculty_name: faculty_name || faculty.faculty_name,
    faculty_code: faculty_code ? faculty_code.toUpperCase() : faculty.faculty_code,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.UPDATE, TABLE_NAMES.FACULTIES, faculty.faculty_id, oldValue, faculty.toJSON()));
  apiResponse.success(res, 'Fakultas berhasil diperbarui', faculty);
});

const deleteFaculty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const faculty = await Faculty.findByPk(parseInt(req.params.faculty_id as string, 10));
  if (!faculty) { apiResponse.notFound(res, 'Fakultas tidak ditemukan'); return; }

  // Check if faculty has study programs
  const programCount = await StudyProgram.count({ where: { faculty_id: faculty.faculty_id } });
  if (programCount > 0) { apiResponse.badRequest(res, 'Tidak bisa menghapus fakultas yang masih memiliki program studi'); return; }

  await faculty.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.SOFT_DELETE, TABLE_NAMES.FACULTIES, faculty.faculty_id));
  apiResponse.success(res, 'Fakultas berhasil dihapus');
});

export { listFaculties, getFaculty, createFaculty, updateFaculty, deleteFaculty };
