import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import generateToken from '../utils/generateToken.js';

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  res.status(201).json({
    success: true,
    data: { ...publicUser(user), token: generateToken(user.id) },
  });
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      success: true,
      data: { ...publicUser(user), token: generateToken(user.id) },
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current logged-in user's profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ success: true, data: publicUser(user) });
});
