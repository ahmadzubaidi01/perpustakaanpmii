import { Request, Response } from 'express';
import { BookCategory, Book } from '../models';
import { AuditActionType, TABLE_NAMES } from '../config/constants';
import apiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog, buildAuditFromRequest } from '../services/auditService';
import { generateUniqueSlug } from '../utils/helpers';

const listCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categories = await BookCategory.findAll({
    order: [['category_name', 'ASC']]
  });
  apiResponse.success(res, 'Categories retrieved', categories);
});

const getCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.category_id as string, 10);
  const category = await BookCategory.findByPk(categoryId);
  if (!category) {
    apiResponse.notFound(res, 'Kategori tidak ditemukan');
    return;
  }
  apiResponse.success(res, 'Category retrieved', category);
});

const createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category_name } = req.body;
  if (!category_name || !category_name.trim()) {
    apiResponse.badRequest(res, 'Nama kategori tidak boleh kosong.');
    return;
  }

  const trimmedName = category_name.trim();

  // Check duplicate
  const existingCategory = await BookCategory.findOne({
    where: { category_name: trimmedName },
    paranoid: false,
  });

  if (existingCategory) {
    if (existingCategory.deleted_at !== null) {
      // Restore soft deleted category
      existingCategory.deleted_at = null;
      await existingCategory.save();
      await createAuditLog(buildAuditFromRequest(req, AuditActionType.RESTORE, TABLE_NAMES.BOOK_CATEGORIES, existingCategory.category_id));
      apiResponse.created(res, 'Kategori berhasil dipulihkan dari data terhapus', existingCategory);
      return;
    } else {
      apiResponse.badRequest(res, 'Kategori dengan nama tersebut sudah ada.');
      return;
    }
  }

  const category_slug = generateUniqueSlug(trimmedName);

  const category = await BookCategory.create({
    category_name: trimmedName,
    category_slug,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.CREATE, TABLE_NAMES.BOOK_CATEGORIES, category.category_id));
  apiResponse.created(res, 'Category created', category);
});

const updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.category_id as string, 10);
  const category = await BookCategory.findByPk(categoryId);
  if (!category) {
    apiResponse.notFound(res, 'Kategori tidak ditemukan');
    return;
  }

  const { category_name } = req.body;
  if (!category_name || !category_name.trim()) {
    apiResponse.badRequest(res, 'Nama kategori tidak boleh kosong.');
    return;
  }

  const trimmedName = category_name.trim();

  // Check duplicate (other than this category)
  const existingCategory = await BookCategory.findOne({
    where: {
      category_name: trimmedName,
      category_id: { [Op.ne]: categoryId }
    }
  });

  if (existingCategory) {
    apiResponse.badRequest(res, 'Kategori dengan nama tersebut sudah ada.');
    return;
  }

  const oldValue = category.toJSON();
  const category_slug = generateUniqueSlug(trimmedName);

  await category.update({
    category_name: trimmedName,
    category_slug,
  });

  await createAuditLog(buildAuditFromRequest(req, AuditActionType.UPDATE, TABLE_NAMES.BOOK_CATEGORIES, category.category_id, oldValue, category.toJSON()));
  apiResponse.success(res, 'Category updated', category);
});

const deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categoryId = parseInt(req.params.category_id as string, 10);
  const category = await BookCategory.findByPk(categoryId);
  if (!category) {
    apiResponse.notFound(res, 'Kategori tidak ditemukan');
    return;
  }

  // Check if any books use this category
  const bookCount = await Book.count({ where: { category_id: categoryId } });
  if (bookCount > 0) {
    apiResponse.badRequest(res, 'Tidak bisa menghapus kategori yang masih memiliki buku.');
    return;
  }

  await category.destroy();
  await createAuditLog(buildAuditFromRequest(req, AuditActionType.SOFT_DELETE, TABLE_NAMES.BOOK_CATEGORIES, category.category_id));
  apiResponse.success(res, 'Category deleted');
});

import { Op } from 'sequelize';

export { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
