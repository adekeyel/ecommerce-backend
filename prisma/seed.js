// Run with: npm run seed          (populate)
//           npm run seed:destroy  (wipe all tables)
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedData = async () => {
  // Delete in FK-safe order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@example.com', password: adminPassword, isAdmin: true },
  });
  await prisma.user.create({
    data: { name: 'John Doe', email: 'john@example.com', password: userPassword },
  });

  const electronics = await prisma.category.create({ data: { name: 'Electronics', slug: 'electronics' } });
  const clothing = await prisma.category.create({ data: { name: 'Clothing', slug: 'clothing' } });
  const homeKitchen = await prisma.category.create({ data: { name: 'Home & Kitchen', slug: 'home-kitchen' } });

  await prisma.product.createMany({
    data: [
      {
        name: 'Wireless Headphones',
        description: 'Noise-cancelling over-ear wireless headphones with 30hr battery life.',
        price: 89.99,
        categoryId: electronics.id,
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        isFeatured: true,
      },
      {
        name: 'Smart Watch',
        description: 'Fitness tracking smart watch with heart-rate monitor and GPS.',
        price: 149.99,
        categoryId: electronics.id,
        stock: 15,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        isFeatured: true,
      },
      {
        name: 'Cotton T-Shirt',
        description: 'Soft, breathable 100% cotton t-shirt available in multiple colors.',
        price: 19.99,
        categoryId: clothing.id,
        stock: 100,
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
      },
      {
        name: 'Non-Stick Frying Pan',
        description: '12-inch non-stick frying pan, dishwasher safe.',
        price: 34.99,
        categoryId: homeKitchen.id,
        stock: 40,
        imageUrl: 'https://images.unsplash.com/photo-1584990347449-a5d9f800a783?w=500',
      },
    ],
  });

  console.log('Data imported successfully!');
  console.log('Admin login -> email: admin@example.com | password: admin123');
};

const destroyData = async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('Data destroyed successfully!');
};

const run = async () => {
  try {
    if (process.argv[2] === '-d') {
      await destroyData();
    } else {
      await seedData();
    }
  } catch (error) {
    console.error(`Error seeding data: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
