import asyncHandler from 'express-async-handler';
import prisma from '../lib/prisma.js';

// @desc    Get all products (supports search, category filter, pagination)
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 12;
  const page = Number(req.query.page) || 1;

  const where = {
    ...(req.query.keyword && {
      name: { contains: req.query.keyword, mode: 'insensitive' },
    }),
    ...(req.query.category && { categoryId: req.query.category }),
  };

  const [count, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: pageSize * (page - 1),
    }),
  ]);

  res.json({
    success: true,
    data: products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({ success: true, data: product });
});

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, imageUrl, category, stock, isFeatured } = req.body;

  if (!name || !description || price === undefined || !category) {
    res.status(400);
    throw new Error('Please provide name, description, price, and category');
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price: Number(price),
      imageUrl: imageUrl || undefined,
      stock: stock !== undefined ? Number(stock) : 0,
      isFeatured: Boolean(isFeatured),
      category: { connect: { id: category } },
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  res.status(201).json({ success: true, data: product });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Product not found');
  }

  const { name, description, price, imageUrl, category, stock, isFeatured } = req.body;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      ...(category !== undefined && { category: { connect: { id: category } } }),
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  res.json({ success: true, data: product });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Product not found');
  }

  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Product removed successfully' });
});
