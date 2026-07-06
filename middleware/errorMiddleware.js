// Handles requests to undefined routes
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Centralized error handler (aware of Prisma's error shapes)
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  // Prisma: unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 400;
    const field = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
    message = `Duplicate value for field: ${field}`;
  }

  // Prisma: record not found (e.g. update/delete on missing row)
  if (err.code === 'P2025') {
    statusCode = 404;
    message = err.meta?.cause || 'Resource not found';
  }

  // Prisma: foreign key constraint failure (e.g. invalid categoryId/productId)
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Related resource not found (invalid reference)';
  }

  // Prisma: malformed/invalid UUID or query argument
  if (err.code === 'P2023' || err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
