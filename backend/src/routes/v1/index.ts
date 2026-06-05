import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole, requireMinRole } from '../../middleware/rbac';
import { UserRole } from '../../config/constants';

// Import controllers
import { register, login, refreshAccessToken, logout, forgotPassword, resetPassword, getProfile } from '../../controllers/authController';
import { listBooks, getBook, createBook, updateBook, deleteBook } from '../../controllers/bookController';
import { listBorrowings, getBorrowing, createBorrowing, approveBorrowing, returnBorrowing, rejectBorrowing, deleteBorrowing, returnByScan } from '../../controllers/borrowingController';
import { listFaculties, getFaculty, createFaculty, updateFaculty, deleteFaculty } from '../../controllers/facultyController';
import { listStudyPrograms, getStudyProgram, createStudyProgram, updateStudyProgram, deleteStudyProgram } from '../../controllers/studyProgramController';
import { listCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../../controllers/categoryController';
import { getDashboard } from '../../controllers/dashboardController';
import { getSettings, updateSettings } from '../../controllers/settingController';
import { listUsers, getUser, createUser, updateUser, deleteUser, updateProfile, changePassword } from '../../controllers/userController';
import { listNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../controllers/notificationController';
import { listAuditLogs } from '../../controllers/auditController';
import { uploadSingle } from '../../middleware/upload';

const router = Router();

// ============================================
// AUTH ROUTES (public)
// ============================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/refresh', refreshAccessToken);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Auth (authenticated)
// ============================================
router.post('/auth/logout', authenticate, logout);
router.get('/auth/me', authenticate, getProfile);

// ============================================
// DASHBOARD
// ============================================
router.get('/dashboard', authenticate, getDashboard);

// ============================================
// BOOKS
// ============================================
router.get('/books', authenticate, listBooks);
router.get('/books/:book_id', authenticate, getBook);
router.post('/books', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), uploadSingle('cover_image'), createBook);
router.put('/books/:book_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), uploadSingle('cover_image'), updateBook);
router.delete('/books/:book_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), deleteBook);

// ============================================
// BORROWINGS
// ============================================
router.get('/borrowings', authenticate, listBorrowings);
router.get('/borrowings/:borrowing_id', authenticate, getBorrowing);
router.post('/borrowings', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), createBorrowing);
router.post('/borrowings/return-scan', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), returnByScan);
router.patch('/borrowings/:borrowing_id/approve', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), approveBorrowing);
router.patch('/borrowings/:borrowing_id/return', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), returnBorrowing);
router.patch('/borrowings/:borrowing_id/reject', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), rejectBorrowing);
router.delete('/borrowings/:borrowing_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), deleteBorrowing);

// ============================================
// FACULTIES (Super Admin only for mutation, public for GET)
// ============================================
router.get('/faculties', listFaculties);
router.get('/faculties/:faculty_id', authenticate, getFaculty);
router.post('/faculties', authenticate, requireRole(UserRole.SUPER_ADMIN), createFaculty);
router.put('/faculties/:faculty_id', authenticate, requireRole(UserRole.SUPER_ADMIN), updateFaculty);
router.delete('/faculties/:faculty_id', authenticate, requireRole(UserRole.SUPER_ADMIN), deleteFaculty);

// ============================================
// STUDY PROGRAMS (Super Admin only for mutation, public for GET)
// ============================================
router.get('/study-programs', listStudyPrograms);
router.get('/study-programs/:program_id', authenticate, getStudyProgram);
router.post('/study-programs', authenticate, requireRole(UserRole.SUPER_ADMIN), createStudyProgram);
router.put('/study-programs/:program_id', authenticate, requireRole(UserRole.SUPER_ADMIN), updateStudyProgram);
router.delete('/study-programs/:program_id', authenticate, requireRole(UserRole.SUPER_ADMIN), deleteStudyProgram);

// ============================================
// CATEGORIES
// ============================================
router.get('/categories', authenticate, listCategories);
router.get('/categories/:category_id', authenticate, getCategory);
router.post('/categories', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), createCategory);
router.put('/categories/:category_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), updateCategory);
router.delete('/categories/:category_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), deleteCategory);

// ============================================
// USERS
// ============================================
router.get('/users', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), listUsers);
router.get('/users/:user_id', authenticate, getUser);
router.post('/users', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), uploadSingle('profile_photo'), createUser);
router.put('/users/:user_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), uploadSingle('profile_photo'), updateUser);
router.delete('/users/:user_id', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), deleteUser);

// Profile (self)
router.put('/users/profile', authenticate, uploadSingle('profile_photo'), updateProfile);
router.put('/users/change-password', authenticate, changePassword);

// ============================================
// SETTINGS
// ============================================
router.get('/settings', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), getSettings);
router.put('/settings', authenticate, requireMinRole(UserRole.KOMISARIAT_ADMIN), updateSettings);

// ============================================
// NOTIFICATIONS
// ============================================
router.get('/notifications', authenticate, listNotifications);
router.patch('/notifications/read-all', authenticate, markAllAsRead);
router.patch('/notifications/:notification_id/read', authenticate, markAsRead);
router.delete('/notifications/:notification_id', authenticate, deleteNotification);

// ============================================
// AUDIT LOGS (Super Admin only)
// ============================================
router.get('/audit-logs', authenticate, requireRole(UserRole.SUPER_ADMIN), listAuditLogs);

export default router;
