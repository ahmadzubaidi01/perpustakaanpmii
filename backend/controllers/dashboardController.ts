import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { User, Book, Borrowing, AuditLog } from '../models';
import { BorrowingStatus, UserRole } from '../config/constants';
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
      [fn('YEAR', col('borrowed_at')), 'year'],
      [fn('MONTH', col('borrowed_at')), 'month'],
      [fn('COUNT', col('borrowing_id')), 'count'],
    ],
    where: {
      borrowed_at: { [Op.gte]: sixMonthsAgo },
      borrowing_status: { [Op.in]: [BorrowingStatus.BORROWED, BorrowingStatus.RETURNED, BorrowingStatus.OVERDUE] },
    },
    group: [fn('YEAR', col('borrowed_at')), fn('MONTH', col('borrowed_at'))],
    order: [[fn('YEAR', col('borrowed_at')), 'ASC'], [fn('MONTH', col('borrowed_at')), 'ASC']],
    raw: true,
  });

  const monthlyReturns = await Borrowing.findAll({
    attributes: [
      [fn('YEAR', col('returned_at')), 'year'],
      [fn('MONTH', col('returned_at')), 'month'],
      [fn('COUNT', col('borrowing_id')), 'count'],
    ],
    where: {
      returned_at: { [Op.gte]: sixMonthsAgo, [Op.ne]: null },
    },
    group: [fn('YEAR', col('returned_at')), fn('MONTH', col('returned_at'))],
    order: [[fn('YEAR', col('returned_at')), 'ASC'], [fn('MONTH', col('returned_at')), 'ASC']],
    raw: true,
  });

  // Popular books
  const popularBooks = await Borrowing.findAll({
    attributes: ['book_id', [fn('COUNT', col('borrowing_id')), 'borrow_count']],
    include: [{ association: 'book', attributes: ['book_id', 'book_title', 'author_name', 'cover_image_url'] }],
    group: ['Borrowing.book_id', 'book.book_id'],
    order: [[literal('borrow_count'), 'DESC']],
    limit: 5,
    raw: false,
  });

  // Recent audit logs (super_admin only)
  let recentAuditLogs: any[] = [];
  if (userRole === UserRole.SUPER_ADMIN) {
    recentAuditLogs = await AuditLog.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ association: 'performed_by', attributes: ['user_id', 'full_name'] }],
    });
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
  });
});

export { getDashboard };
