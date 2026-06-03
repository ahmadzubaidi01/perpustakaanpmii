import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Book, BookCategory, BookBarcode } from '../models';
import { AuditActionType, TABLE_NAMES, BookStatus } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';
import { PAGINATION_DEFAULTS } from '../config/constants';

const slugify = (text: string): string => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const generateBookCode = async (): Promise<string> => {
  const lastBook = await Book.scope('withDeleted').findOne({
    where: { book_code: { [Op.like]: 'BK-%' } },
    order: [['book_id', 'DESC']],
  });
  const nextNum = lastBook ? parseInt(lastBook.book_code.replace('BK-', ''), 10) + 1 : 1;
  return `BK-${String(nextNum).padStart(6, '0')}`;
};

const listBooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string, 10) || PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
  const offset = (page - 1) * limit;
  const search = req.query.search as string;
  const category_id = req.query.category_id as string;
  const status = req.query.status as string;

  const where: any = {};
  if (search) {
    where[Op.or] = [
      { book_title: { [Op.like]: `%${search}%` } },
      { author_name: { [Op.like]: `%${search}%` } },
      { isbn_code: { [Op.like]: `%${search}%` } },
      { book_code: { [Op.like]: `%${search}%` } },
    ];
  }
  if (category_id) where.category_id = parseInt(category_id, 10);
  if (status) where.book_status = status;

  const { count, rows } = await Book.findAndCountAll({
    where,
    include: [{ association: 'category', attributes: ['category_id', 'category_name'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  apiResponse.success(res, 'Books retrieved', {
    books: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

const getBook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const book = await Book.findByPk(parseInt(req.params.book_id as string, 10), {
    include: [
      { association: 'category', attributes: ['category_id', 'category_name'] },
      { association: 'barcodes', attributes: ['barcode_id', 'barcode_value', 'barcode_status'] },
    ],
  });
  if (!book) { apiResponse.notFound(res, 'Buku tidak ditemukan'); return; }
  apiResponse.success(res, 'Book retrieved', book);
});

const createBook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { book_title, author_name, publisher_name, isbn_code, publication_year, category_id, rack_location, total_stock, book_description } = req.body;

  if (!book_title || !author_name) {
    apiResponse.badRequest(res, 'Judul dan penulis buku wajib diisi');
    return;
  }

  // Determine book_code: use ISBN if available, otherwise auto-generate
  let book_code = isbn_code || await generateBookCode();

  // Check ISBN uniqueness if provided
  if (isbn_code) {
    const existingIsbn = await Book.findOne({ where: { isbn_code } });
    if (existingIsbn) { apiResponse.conflict(res, 'ISBN sudah terdaftar'); return; }
  }

  // Check book_code uniqueness
  const existingCode = await Book.findOne({ where: { book_code } });
  if (existingCode) {
    book_code = await generateBookCode();
  }

  const book_slug = slugify(book_title) + '-' + Date.now();
  const stock = parseInt(total_stock, 10) || 1;

  let cover_image_url = null;

if (req.file) {
  const fileName = `${Date.now()}-${req.file.originalname}`;

  const response = await fetch(
    `https://ijgikmqiggzhofwznxas.supabase.co/storage/v1/object/covee-books/${fileName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Content-Type': req.file.mimetype,
      },
      body: req.file.buffer,
    }
  );

  if (!response.ok) {
    throw new Error('Upload cover ke Supabase gagal');
  }

  cover_image_url =
    `https://ijgikmqiggzhofwznxas.supabase.co/storage/v1/object/public/covee-books/${fileName}`;
}
  const book = await Book.create({
    book_code,
    book_title,
    book_slug,
    book_description: book_description || null,
    author_name,
    publisher_name: publisher_name || null,
    isbn_code: isbn_code || null,
    publication_year: publication_year ? parseInt(publication_year, 10) : null,
    category_id: category_id ? parseInt(category_id, 10) : null,
    rack_location: rack_location || null,
    total_stock: stock,
    available_stock: stock,
    borrowed_stock: 0,
    cover_image_url,
    book_status: BookStatus.AVAILABLE,
  });

  // Auto-generate barcode entry
  await BookBarcode.create({
    book_id: book.book_id,
    barcode_value: isbn_code || book_code,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.CREATE, TABLE_NAMES.BOOKS, book.book_id, null, { book_title, book_code, isbn_code }));

  apiResponse.created(res, 'Buku berhasil ditambahkan', book);
});

const updateBook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const book = await Book.findByPk(parseInt(req.params.book_id as string, 10));
  if (!book) { apiResponse.notFound(res, 'Buku tidak ditemukan'); return; }

  const oldValue = book.toJSON();
  const { book_title, author_name, publisher_name, isbn_code, publication_year, category_id, rack_location, total_stock, book_description, book_status } = req.body;

  // Check ISBN uniqueness if changed
  if (isbn_code && isbn_code !== book.isbn_code) {
    const existingIsbn = await Book.findOne({ where: { isbn_code, book_id: { [Op.ne]: book.book_id } } });
    if (existingIsbn) { apiResponse.conflict(res, 'ISBN sudah digunakan buku lain'); return; }
  }

  const newStock = total_stock ? parseInt(total_stock, 10) : book.total_stock;
  const stockDiff = newStock - book.total_stock;
  const newAvailable = Math.max(0, book.available_stock + stockDiff);

  let cover_image_url = book.cover_image_url;

if (req.file) {
  const fileName = `${Date.now()}-${req.file.originalname}`;

  const response = await fetch(
    `https://ijgikmqiggzhofwznxas.supabase.co/storage/v1/object/covee-books/${fileName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Content-Type': req.file.mimetype,
      },
      body: req.file.buffer,
    }
  );

  if (!response.ok) {
    throw new Error('Upload cover ke Supabase gagal');
  }

  cover_image_url =
    `https://ijgikmqiggzhofwznxas.supabase.co/storage/v1/object/public/covee-books/${fileName}`;
}

  await book.update({
    book_title: book_title || book.book_title,
    book_slug: book_title ? slugify(book_title) + '-' + book.book_id : book.book_slug,
    book_description: book_description !== undefined ? book_description : book.book_description,
    author_name: author_name || book.author_name,
    publisher_name: publisher_name !== undefined ? publisher_name : book.publisher_name,
    isbn_code: isbn_code !== undefined ? isbn_code : book.isbn_code,
    publication_year: publication_year ? parseInt(publication_year, 10) : book.publication_year,
    category_id: category_id ? parseInt(category_id, 10) : book.category_id,
    rack_location: rack_location !== undefined ? rack_location : book.rack_location,
    total_stock: newStock,
    available_stock: newAvailable,
    cover_image_url,
    book_status: book_status || book.book_status,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.UPDATE, TABLE_NAMES.BOOKS, book.book_id, oldValue, book.toJSON()));
  apiResponse.success(res, 'Buku berhasil diperbarui', book);
});

const deleteBook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const book = await Book.findByPk(parseInt(req.params.book_id as string, 10));
  if (!book) { apiResponse.notFound(res, 'Buku tidak ditemukan'); return; }

  if (book.borrowed_stock > 0) {
    apiResponse.badRequest(res, 'Tidak bisa menghapus buku yang sedang dipinjam');
    return;
  }

  await book.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.SOFT_DELETE, TABLE_NAMES.BOOKS, book.book_id));
  apiResponse.success(res, 'Buku berhasil dihapus');
});

export { listBooks, getBook, createBook, updateBook, deleteBook };
