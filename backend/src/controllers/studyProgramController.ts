import { Request, Response } from 'express';
import { StudyProgram, Faculty } from '../models';
import { AuditActionType, TABLE_NAMES } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';

const listStudyPrograms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.faculty_id) {
    where.faculty_id = parseInt(req.query.faculty_id as string, 10);
  }

  const programs = await StudyProgram.findAll({
    where,
    include: [{ association: 'faculty', attributes: ['faculty_id', 'faculty_name', 'faculty_code'] }],
    order: [['program_name', 'ASC']],
  });
  apiResponse.success(res, 'Study programs retrieved', programs);
});

const getStudyProgram = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const program = await StudyProgram.findByPk(parseInt(req.params.program_id as string, 10), {
    include: [{ association: 'faculty', attributes: ['faculty_id', 'faculty_name', 'faculty_code'] }],
  });
  if (!program) { apiResponse.notFound(res, 'Program studi tidak ditemukan'); return; }
  apiResponse.success(res, 'Study program retrieved', program);
});

const createStudyProgram = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { program_name, program_code, faculty_id } = req.body;
  if (!program_name || !program_code || !faculty_id) {
    apiResponse.badRequest(res, 'Nama program, kode program, dan fakultas wajib diisi');
    return;
  }

  // Validate faculty exists
  const faculty = await Faculty.findByPk(faculty_id);
  if (!faculty) { apiResponse.badRequest(res, 'Fakultas tidak ditemukan'); return; }

  // Check unique code
  const existing = await StudyProgram.findOne({ where: { program_code } });
  if (existing) { apiResponse.conflict(res, 'Kode program studi sudah digunakan'); return; }

  const program = await StudyProgram.create({
    program_name,
    program_code: program_code.toUpperCase(),
    faculty_id,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.CREATE, TABLE_NAMES.STUDY_PROGRAMS, program.program_id, null, { program_name, program_code, faculty_id }));
  apiResponse.created(res, 'Program studi berhasil dibuat', program);
});

const updateStudyProgram = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const program = await StudyProgram.findByPk(parseInt(req.params.program_id as string, 10));
  if (!program) { apiResponse.notFound(res, 'Program studi tidak ditemukan'); return; }

  const { program_name, program_code, faculty_id } = req.body;
  const oldValue = program.toJSON();

  if (faculty_id && faculty_id !== program.faculty_id) {
    const faculty = await Faculty.findByPk(faculty_id);
    if (!faculty) { apiResponse.badRequest(res, 'Fakultas tidak ditemukan'); return; }
  }

  if (program_code && program_code !== program.program_code) {
    const existing = await StudyProgram.findOne({ where: { program_code } });
    if (existing) { apiResponse.conflict(res, 'Kode program studi sudah digunakan'); return; }
  }

  await program.update({
    program_name: program_name || program.program_name,
    program_code: program_code ? program_code.toUpperCase() : program.program_code,
    faculty_id: faculty_id || program.faculty_id,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.UPDATE, TABLE_NAMES.STUDY_PROGRAMS, program.program_id, oldValue, program.toJSON()));
  apiResponse.success(res, 'Program studi berhasil diperbarui', program);
});

const deleteStudyProgram = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const program = await StudyProgram.findByPk(parseInt(req.params.program_id as string, 10));
  if (!program) { apiResponse.notFound(res, 'Program studi tidak ditemukan'); return; }

  await program.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.SOFT_DELETE, TABLE_NAMES.STUDY_PROGRAMS, program.program_id));
  apiResponse.success(res, 'Program studi berhasil dihapus');
});

export { listStudyPrograms, getStudyProgram, createStudyProgram, updateStudyProgram, deleteStudyProgram };
