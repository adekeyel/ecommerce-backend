import asyncHandler from 'express-async-handler';
import prisma from '../lib/prisma.js';

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items provided');
  }

  if (!shippingAddress || !shippingAddress.address || !shippingAddress.city) {
    res.status(400);
    throw new Error('Shipping address is required');
  }

  // Run validation, stock decrement, and order creation atomically so
  // stock can never be oversold under concurrent requests.
  const order = await prisma.$transaction(async (tx) => {
    let itemsPrice = 0;
    const itemsToCreate = [];

    for (const item of orderItems) {
      const product = await tx.product.findUnique({ where: { id: item.product } });
      if (!product) {
        const err = new Error(`Product not found: ${item.product}`);
        err.statusCode = 404;
        throw err;
      }
      if (product.stock < item.qty) {
        const err = new Error(`Insufficient stock for product: ${product.name}`);
        err.statusCode = 400;
        throw err;
      }

      itemsPrice += product.price * item.qty;
      itemsToCreate.push({
        productId: product.id,
        name: product.name,
        image: product.imageUrl,
        price: product.price,
        qty: item.qty,
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: item.qty } },
      });
    }

    const shippingPrice = itemsPrice > 100 ? 0 : 10;
    const totalPrice = itemsPrice + shippingPrice;

    return tx.order.create({
      data: {
        userId: req.user.id,
        shippingAddress,
        paymentMethod: paymentMethod || 'Cash on Delivery',
        itemsPrice,
        shippingPrice,
        totalPrice,
        orderItems: { create: itemsToCreate },
      },
      include: { orderItems: true },
    });
  });

  res.status(201).json({ success: true, data: serializeOrder(order) });
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { orderItems: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: orders.map(serializeOrder) });
});

// @desc    Get a single order by ID
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      orderItems: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner = order.userId === req.user.id;
  if (!isOwner && !req.user.isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json({ success: true, data: serializeOrder(order) });
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      orderItems: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: orders.map(serializeOrder) });
});

// @desc    Update order status / delivery
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Order not found');
  }

  const { status } = req.body;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(status === 'Delivered' && { isDelivered: true, deliveredAt: new Date() }),
    },
    include: { orderItems: true },
  });

  res.json({ success: true, data: serializeOrder(order) });
});

// Reshape order items so `productId` is exposed as `product`, matching
// the shape the frontend already expects.
function serializeOrder(order) {
  return {
    ...order,
    orderItems: order.orderItems.map((item) => ({
      product: item.productId,
      name: item.name,
      image: item.image,
      price: item.price,
      qty: item.qty,
    })),
  };
}
