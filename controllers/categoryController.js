import asyncHandler from 'express-async-handler';
import prisma from '../lib/prisma.js';

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: categories });
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }

  const slug = slugify(name);
  const exists = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } });
  if (exists) {
    res.status(400);
    throw new Error('Category already exists');
  }

  const category = await prisma.category.create({ data: { name, slug } });
  res.status(201).json({ success: true, data: category });
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Category not found');
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Category removed successfully' });
});
