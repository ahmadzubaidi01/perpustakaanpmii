import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Borrowing, Book, BorrowingSetting, User, Notification } from '../models';
import { AuditActionType, TABLE_NAMES, BorrowingStatus, UserRole, NotificationType } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';
import { PAGINATION_DEFAULTS } from '../config/constants';

const generateBorrowingCode = (): string => {
  const date = new Date();
  const prefix = 'BR';
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${y}${m}${d}${rand}`;
};

const listBorrowings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userRole = req.user!.user_role as UserRole;
  const page = parseInt(req.query.page as string, 10) || PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const where: any = {};

  // Borrowers can only see their own
  if (userRole === UserRole.BORROWER) {
    where.user_id = req.user!.user_id;
  }

  if (status) where.borrowing_status = status;

  const includeOptions: any[] = [
    { association: 'book', attributes: ['book_id', 'book_title', 'author_name', 'isbn_code', 'book_code', 'cover_image_url'] },
    { association: 'borrower', attributes: ['user_id', 'full_name', 'nim', 'email_address'] },
    { association: 'approved_by', attributes: ['user_id', 'full_name'], required: false },
  ];

  if (search && userRole !== UserRole.BORROWER) {
    includeOptions[1] = {
      ...includeOptions[1],
      where: {
        [Op.or]: [
          { full_name: { [Op.like]: `%${search}%` } },
          { nim: { [Op.like]: `%${search}%` } },
        ],
      },
    };
  }

  const { count, rows } = await Borrowing.findAndCountAll({
    where,
    include: includeOptions,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  apiResponse.success(res, 'Borrowings retrieved', {
    borrowings: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

const getBorrowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const borrowing = await Borrowing.findByPk(parseInt(req.params.borrowing_id as string, 10), {
    include: [
      { association: 'book', attributes: ['book_id', 'book_title', 'author_name', 'isbn_code', 'book_code', 'cover_image_url'] },
      { association: 'borrower', attributes: ['user_id', 'full_name', 'nim', 'email_address', 'phone_number'] },
      { association: 'approved_by', attributes: ['user_id', 'full_name'], required: false },
    ],
  });

  if (!borrowing) { apiResponse.notFound(res, 'Data peminjaman tidak ditemukan'); return; }

  // Borrowers can only view their own
  if (req.user!.user_role === UserRole.BORROWER && borrowing.user_id !== req.user!.user_id) {
    apiResponse.forbidden(res, 'Anda hanya bisa melihat peminjaman sendiri');
    return;
  }

  apiResponse.success(res, 'Borrowing retrieved', borrowing);
});

/**
 * Borrower requests a book borrowing (creates pending request)
 */
const createBorrowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { book_id, book_code, user_id, borrow_days } = req.body;
  const requesterId = req.user!.user_id;
  const requesterRole = req.user!.user_role as UserRole;

  let targetUserId = requesterId;
  let autoApprove = false;

  if (requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.KOMISARIAT_ADMIN) {
    if (user_id) {
      targetUserId = parseInt(user_id as string, 10);
      autoApprove = true;
    }
  }

  // Find book
  let book;
  if (book_id) {
    book = await Book.findByPk(book_id);
  } else if (book_code) {
    book = await Book.findOne({
      where: {
        [Op.or]: [
          { book_code: book_code },
          { isbn_code: book_code },
        ]
      }
    });
  }

  if (!book) { apiResponse.notFound(res, 'Buku tidak ditemukan'); return; }
  if (book.available_stock <= 0) { apiResponse.badRequest(res, 'Stok buku tidak tersedia'); return; }

  // Check borrowing limits
  const settings = await BorrowingSetting.findByPk(1);
  const maxBooks = settings?.max_books_per_borrower || 3;

  const activeBorrowings = await Borrowing.count({
    where: {
      user_id: targetUserId,
      borrowing_status: { [Op.in]: [BorrowingStatus.BORROWED, BorrowingStatus.PENDING] },
    },
  });

  if (activeBorrowings >= maxBooks) {
    apiResponse.badRequest(res, `Batas maksimum peminjaman anggota tercapai (${maxBooks} buku)`);
    return;
  }

  // Check if already borrowing or pending for this book
  const existing = await Borrowing.findOne({
    where: {
      user_id: targetUserId,
      book_id: book.book_id,
      borrowing_status: { [Op.in]: [BorrowingStatus.BORROWED, BorrowingStatus.PENDING] },
    },
  });
  if (existing) {
    apiResponse.badRequest(res, 'Anggota sudah meminjam atau mengajukan peminjaman buku ini');
    return;
  }

  const now = new Date();
  if (autoApprove) {
    const days = parseInt(borrow_days as string, 10) || settings?.default_borrow_days || 14;
    const dueDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const borrowing = await Borrowing.create({
      borrowing_code: generateBorrowingCode(),
      user_id: targetUserId,
      book_id: book.book_id,
      borrowing_status: BorrowingStatus.BORROWED,
      borrowed_at: now,
      due_date: dueDate,
      approved_by_user_id: requesterId,
    });

    // Decrease stock
    await book.update({
      available_stock: Math.max(0, book.available_stock - 1),
      borrowed_stock: book.borrowed_stock + 1,
    });

    // Send notification to borrower
    await Notification.create({
      user_id: targetUserId,
      notification_title: 'Peminjaman Disetujui (Otomatis)',
      notification_message: `Peminjaman buku "${book.book_title}" telah disetujui. Tenggat pengembalian: ${dueDate.toLocaleDateString('id-ID')}.`,
      notification_type: NotificationType.BORROW_APPROVED,
      reference_id: String(borrowing.borrowing_id),
    });

    await createAuditLog(buildAuditFromRequest(req, AuditActionType.BORROW, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id, null, { book_id: book.book_id, user_id: targetUserId, status: 'borrowed' }));

    apiResponse.created(res, 'Peminjaman berhasil diproses (Auto Approve)', borrowing);
  } else {
    // Normal borrower pending request
    const borrowing = await Borrowing.create({
      borrowing_code: generateBorrowingCode(),
      user_id: targetUserId,
      book_id: book.book_id,
      borrowing_status: BorrowingStatus.PENDING,
    });

    await createAuditLog(buildAuditFromRequest(req, AuditActionType.BORROW, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id, null, { book_id: book.book_id, user_id: targetUserId, status: 'pending' }));

    apiResponse.created(res, 'Permintaan peminjaman berhasil diajukan', borrowing);
  }
});

/**
 * Admin processes return by scanning the book barcode
 */
const returnByScan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { book_code } = req.body;
  if (!book_code) { apiResponse.badRequest(res, 'Kode buku/barcode wajib diisi'); return; }

  const borrowing = await Borrowing.findOne({
    where: {
      borrowing_status: { [Op.in]: [BorrowingStatus.BORROWED, BorrowingStatus.OVERDUE] }
    },
    include: [
      {
        association: 'book',
        where: {
          [Op.or]: [
            { book_code: book_code },
            { isbn_code: book_code }
          ]
        }
      },
      { association: 'borrower', attributes: ['user_id', 'full_name', 'nim'] }
    ],
    order: [['borrowed_at', 'ASC']]
  });

  if (!borrowing) {
    apiResponse.notFound(res, 'Tidak ada transaksi peminjaman aktif untuk buku ini');
    return;
  }

  const book = borrowing.book;
  const now = new Date();

  await borrowing.update({
    borrowing_status: BorrowingStatus.RETURNED,
    returned_at: now,
  });

  // Restore stock
  if (book) {
    await book.update({
      available_stock: book.available_stock + 1,
      borrowed_stock: Math.max(0, book.borrowed_stock - 1),
    });
  }

  // Send notification to borrower
  await Notification.create({
    user_id: borrowing.user_id,
    notification_title: 'Pengembalian Berhasil (Otomatis)',
    notification_message: `Buku "${book?.book_title}" telah berhasil dikembalikan secara otomatis.`,
    notification_type: NotificationType.RETURN_CONFIRMED,
    reference_id: String(borrowing.borrowing_id),
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.RETURN, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id));

  apiResponse.success(res, `Buku "${book?.book_title}" berhasil dikembalikan untuk peminjam: ${borrowing.borrower?.full_name}`, borrowing);
});

/**
 * Admin approves a borrowing request
 */
const approveBorrowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const borrowing = await Borrowing.findByPk(parseInt(req.params.borrowing_id as string, 10), {
    include: [{ association: 'book' }],
  });

  if (!borrowing) { apiResponse.notFound(res, 'Data peminjaman tidak ditemukan'); return; }
  if (borrowing.borrowing_status !== BorrowingStatus.PENDING) {
    apiResponse.badRequest(res, 'Hanya peminjaman berstatus pending yang bisa disetujui');
    return;
  }

  const book = borrowing.book;
  if (!book || book.available_stock <= 0) {
    apiResponse.badRequest(res, 'Stok buku tidak tersedia');
    return;
  }

  // Get borrowing settings for due date calculation
  const settings = await BorrowingSetting.findByPk(1);
  const borrowDays = settings?.default_borrow_days || 14;

  const now = new Date();
  const dueDate = new Date(now.getTime() + borrowDays * 24 * 60 * 60 * 1000);

  await borrowing.update({
    borrowing_status: BorrowingStatus.BORROWED,
    borrowed_at: now,
    due_date: dueDate,
    approved_by_user_id: req.user!.user_id,
  });

  // Decrease stock
  await book.update({
    available_stock: Math.max(0, book.available_stock - 1),
    borrowed_stock: book.borrowed_stock + 1,
  });

  // Send notification to borrower
  await Notification.create({
    user_id: borrowing.user_id,
    notification_title: 'Peminjaman Disetujui',
    notification_message: `Peminjaman buku "${book.book_title}" telah disetujui. Tenggat pengembalian: ${dueDate.toLocaleDateString('id-ID')}.`,
    notification_type: NotificationType.BORROW_APPROVED,
    reference_id: String(borrowing.borrowing_id),
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.APPROVE, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id));

  apiResponse.success(res, 'Peminjaman berhasil disetujui', borrowing);
});

/**
 * Admin processes a book return
 */
const returnBorrowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const borrowing = await Borrowing.findByPk(parseInt(req.params.borrowing_id as string, 10), {
    include: [{ association: 'book' }],
  });

  if (!borrowing) { apiResponse.notFound(res, 'Data peminjaman tidak ditemukan'); return; }
  if (borrowing.borrowing_status !== BorrowingStatus.BORROWED && borrowing.borrowing_status !== BorrowingStatus.OVERDUE) {
    apiResponse.badRequest(res, 'Hanya peminjaman aktif yang bisa dikembalikan');
    return;
  }

  const book = borrowing.book;
  const now = new Date();

  await borrowing.update({
    borrowing_status: BorrowingStatus.RETURNED,
    returned_at: now,
    notes: req.body.notes || borrowing.notes,
  });

  // Restore stock
  if (book) {
    await book.update({
      available_stock: book.available_stock + 1,
      borrowed_stock: Math.max(0, book.borrowed_stock - 1),
    });
  }

  // Notification
  await Notification.create({
    user_id: borrowing.user_id,
    notification_title: 'Pengembalian Berhasil',
    notification_message: `Buku "${book?.book_title}" telah berhasil dikembalikan.`,
    notification_type: NotificationType.RETURN_CONFIRMED,
    reference_id: String(borrowing.borrowing_id),
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.RETURN, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id));

  apiResponse.success(res, 'Pengembalian berhasil diproses', borrowing);
});

/**
 * Admin rejects a pending borrowing request
 */
const rejectBorrowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const borrowing = await Borrowing.findByPk(parseInt(req.params.borrowing_id as string, 10));
  if (!borrowing) { apiResponse.notFound(res, 'Data peminjaman tidak ditemukan'); return; }
  if (borrowing.borrowing_status !== BorrowingStatus.PENDING) {
    apiResponse.badRequest(res, 'Hanya peminjaman berstatus pending yang bisa ditolak');
    return;
  }

  await borrowing.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.REJECT, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id));

  apiResponse.success(res, 'Peminjaman ditolak');
});

const deleteBorrowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const borrowing = await Borrowing.findByPk(parseInt(req.params.borrowing_id as string, 10), { include: [{ association: 'book' }] });
  if (!borrowing) { apiResponse.notFound(res, 'Data peminjaman tidak ditemukan'); return; }

  // If actively borrowed, restore stock
  if (borrowing.borrowing_status === BorrowingStatus.BORROWED || borrowing.borrowing_status === BorrowingStatus.OVERDUE) {
    const book = borrowing.book;
    if (book) {
      await book.update({
        available_stock: book.available_stock + 1,
        borrowed_stock: Math.max(0, book.borrowed_stock - 1),
      });
    }
  }

  await borrowing.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.DELETE, TABLE_NAMES.BORROWINGS, borrowing.borrowing_id));

  apiResponse.success(res, 'Data peminjaman berhasil dihapus');
});

export { listBorrowings, getBorrowing, createBorrowing, approveBorrowing, returnBorrowing, rejectBorrowing, deleteBorrowing, returnByScan };
