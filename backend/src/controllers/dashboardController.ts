import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { User, Book, Borrowing, AuditLog, Faculty, StudyProgram, BookCategory, UserSession } from '../models';
import { BorrowingStatus, UserRole, SessionStatus } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Unified dashboard — adapts based on user role.
 */
const getDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userRole = req.user!.user_role as UserRole;

  if (userRole === UserRole.BORROWER) {
    // Borrower sees their own borrowing stats
    const userId = req.user!.user_id;
    const [activeBorrowings, totalBorrowed, overdueBorrowings] = await Promise.all([
      Borrowing.count({ where: { user_id: userId, borrowing_status: BorrowingStatus.BORROWED } }),
      Borrowing.count({ where: { user_id: userId } }),
      Borrowing.count({ where: { user_id: userId, borrowing_status: BorrowingStatus.OVERDUE } }),
    ]);

    const recentBorrowings = await Borrowing.findAll({
      where: { user_id: userId },
      include: [{ association: 'book', attributes: ['book_id', 'book_title', 'author_name', 'cover_image_url'] }],
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    apiResponse.success(res, 'Dashboard', {
      active_borrowings: activeBorrowings,
      total_borrowed: totalBorrowed,
      overdue_borrowings: overdueBorrowings,
      recent_borrowings: recentBorrowings,
    });
    return;
  }

  // Admin dashboard (super_admin + komisariat_admin)
  const [totalBooks, availableBooks, borrowedBooks, totalBorrowers, activeBorrowings, overdueBorrowings, pendingRequests] = await Promise.all([
    Book.count(),
    Book.sum('available_stock') || 0,
    Book.sum('borrowed_stock') || 0,
    User.count({ where: { user_role: UserRole.BORROWER } }),
    Borrowing.count({ where: { borrowing_status: BorrowingStatus.BORROWED } }),
    Borrowing.count({ where: { borrowing_status: BorrowingStatus.OVERDUE } }),
    Borrowing.count({ where: { borrowing_status: BorrowingStatus.PENDING } }),
  ]);

  // Monthly borrowing stats (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyBorrowings = await Borrowing.findAll({
    attributes: [
      [literal('EXTRACT(YEAR FROM "borrowed_at")'), 'year'],
      [literal('EXTRACT(MONTH FROM "borrowed_at")'), 'month'],
      [fn('COUNT', col('borrowing_id')), 'count'],
    ],
    where: {
      borrowed_at: { [Op.gte]: sixMonthsAgo },
      borrowing_status: { [Op.in]: [BorrowingStatus.BORROWED, BorrowingStatus.RETURNED, BorrowingStatus.OVERDUE] },
    },
    group: [literal('EXTRACT(YEAR FROM "borrowed_at")') as any, literal('EXTRACT(MONTH FROM "borrowed_at")') as any],
    order: [[literal('EXTRACT(YEAR FROM "borrowed_at")'), 'ASC'], [literal('EXTRACT(MONTH FROM "borrowed_at")'), 'ASC']],
    raw: true,
  });

  const monthlyReturns = await Borrowing.findAll({
    attributes: [
      [literal('EXTRACT(YEAR FROM "returned_at")'), 'year'],
      [literal('EXTRACT(MONTH FROM "returned_at")'), 'month'],
      [fn('COUNT', col('returned_at')), 'count'],
    ],
    where: {
      returned_at: { [Op.gte]: sixMonthsAgo, [Op.ne]: null },
    },
    group: [literal('EXTRACT(YEAR FROM "returned_at")') as any, literal('EXTRACT(MONTH FROM "returned_at")') as any],
    order: [[literal('EXTRACT(YEAR FROM "returned_at")'), 'ASC'], [literal('EXTRACT(MONTH FROM "returned_at")'), 'ASC']],
    raw: true,
  });

  // Popular books
  const popularBooks = await Borrowing.findAll({
    attributes: ['book_id', [fn('COUNT', col('borrowing_id')), 'borrow_count']],
    include: [{ association: 'book', attributes: ['book_id', 'book_title', 'author_name', 'cover_image_url'] }],
    group: [
      'Borrowing.book_id',
      'book.book_id',
      'book.book_title',
      'book.author_name',
      'book.cover_image_url'
    ],
    order: [[literal('borrow_count'), 'DESC']],
    limit: 5,
    raw: false,
  });

  // Recent audit logs (super_admin only)
  let recentAuditLogs: any[] = [];
  let activeUsersCount = 0;
  let totalCategories = 0;
  let totalFaculties = 0;
  let totalStudyPrograms = 0;

  if (userRole === UserRole.SUPER_ADMIN) {
    const [actLogs, actUsers, catCount, facCount, progCount] = await Promise.all([
      AuditLog.findAll({
        order: [['created_at', 'DESC']],
        limit: 10,
        include: [{ association: 'performed_by', attributes: ['user_id', 'full_name'] }],
      }),
      UserSession.count({
        distinct: true,
        col: 'user_id',
        where: {
          session_status: SessionStatus.ACTIVE,
          expired_at: { [Op.gt]: new Date() },
        },
      }),
      BookCategory.count(),
      Faculty.count(),
      StudyProgram.count(),
    ]);
    recentAuditLogs = actLogs;
    activeUsersCount = actUsers;
    totalCategories = catCount;
    totalFaculties = facCount;
    totalStudyPrograms = progCount;
  }

  apiResponse.success(res, 'Dashboard', {
    total_books: totalBooks,
    available_books: availableBooks || 0,
    borrowed_books: borrowedBooks || 0,
    total_borrowers: totalBorrowers,
    active_borrowings: activeBorrowings,
    overdue_borrowings: overdueBorrowings,
    pending_requests: pendingRequests,
    monthly_borrowings: monthlyBorrowings,
    monthly_returns: monthlyReturns,
    popular_books: popularBooks,
    recent_audit_logs: recentAuditLogs,
    active_users: activeUsersCount,
    total_categories: totalCategories,
    total_faculties: totalFaculties,
    total_study_programs: totalStudyPrograms,
  });
});

export { getDashboard };
