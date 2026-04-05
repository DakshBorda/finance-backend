/**
 * Database seed script — populates the database with realistic sample data
 * for development and demo purposes.
 *
 * Usage: node scripts/seed.js
 *
 * Creates:
 *  - 3 users (admin, analyst, viewer)
 *  - 30+ transactions across multiple months and categories
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const USERS = [
  { email: 'admin@finance.app', password: 'Admin@2026', firstName: 'Raj', lastName: 'Patel', role: 'ADMIN' },
  { email: 'analyst@finance.app', password: 'Analyst@2026', firstName: 'Priya', lastName: 'Sharma', role: 'ANALYST' },
  { email: 'viewer@finance.app', password: 'Viewer@2026', firstName: 'Amit', lastName: 'Singh', role: 'VIEWER' },
];

const TRANSACTIONS = [
  // Jan 2026
  { amount: 85000, type: 'INCOME', category: 'SALARY', date: '2026-01-01', description: 'January salary' },
  { amount: 15000, type: 'EXPENSE', category: 'RENT', date: '2026-01-05', description: 'Monthly rent — January' },
  { amount: 3500, type: 'EXPENSE', category: 'UTILITIES', date: '2026-01-10', description: 'Electricity + internet' },
  { amount: 6000, type: 'EXPENSE', category: 'FOOD', date: '2026-01-15', description: 'Groceries and dining' },
  { amount: 2500, type: 'EXPENSE', category: 'TRANSPORT', date: '2026-01-18', description: 'Fuel and metro pass' },
  { amount: 12000, type: 'INCOME', category: 'FREELANCE', date: '2026-01-20', description: 'Logo design project' },

  // Feb 2026
  { amount: 85000, type: 'INCOME', category: 'SALARY', date: '2026-02-01', description: 'February salary' },
  { amount: 15000, type: 'EXPENSE', category: 'RENT', date: '2026-02-05', description: 'Monthly rent — February' },
  { amount: 4200, type: 'EXPENSE', category: 'HEALTHCARE', date: '2026-02-08', description: 'Annual health checkup' },
  { amount: 5500, type: 'EXPENSE', category: 'FOOD', date: '2026-02-12', description: 'Groceries + restaurant' },
  { amount: 8000, type: 'EXPENSE', category: 'EDUCATION', date: '2026-02-15', description: 'Online course — React Advanced' },
  { amount: 3000, type: 'EXPENSE', category: 'ENTERTAINMENT', date: '2026-02-20', description: 'Movie tickets + concert' },
  { amount: 25000, type: 'INCOME', category: 'INVESTMENT', date: '2026-02-25', description: 'Mutual fund dividend' },

  // Mar 2026
  { amount: 90000, type: 'INCOME', category: 'SALARY', date: '2026-03-01', description: 'March salary (increment)' },
  { amount: 15000, type: 'EXPENSE', category: 'RENT', date: '2026-03-05', description: 'Monthly rent — March' },
  { amount: 3200, type: 'EXPENSE', category: 'UTILITIES', date: '2026-03-08', description: 'Electricity + water + internet' },
  { amount: 7000, type: 'EXPENSE', category: 'FOOD', date: '2026-03-12', description: 'Groceries and eating out' },
  { amount: 18000, type: 'INCOME', category: 'FREELANCE', date: '2026-03-15', description: 'Mobile app UI redesign' },
  { amount: 2800, type: 'EXPENSE', category: 'TRANSPORT', date: '2026-03-18', description: 'Fuel + cab rides' },
  { amount: 45000, type: 'EXPENSE', category: 'OTHER', date: '2026-03-22', description: 'New laptop (work expense)' },
  { amount: 1500, type: 'EXPENSE', category: 'ENTERTAINMENT', date: '2026-03-25', description: 'Streaming subscriptions' },

  // Apr 2026 (partial)
  { amount: 90000, type: 'INCOME', category: 'SALARY', date: '2026-04-01', description: 'April salary' },
  { amount: 15000, type: 'EXPENSE', category: 'RENT', date: '2026-04-01', description: 'Monthly rent — April' },
  { amount: 10000, type: 'INCOME', category: 'INVESTMENT', date: '2026-04-03', description: 'Stock dividends Q1' },
  { amount: 5000, type: 'EXPENSE', category: 'EDUCATION', date: '2026-04-04', description: 'Node.js certification' },
];

function generateRef() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const r = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN-${d}-${r}`;
}

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Create users
  const userMap = {};
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`   ↳ User ${u.email} already exists, skipping`);
      userMap[u.role] = existing.id;
      continue;
    }

    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { ...u, password: hashed },
    });
    userMap[u.role] = user.id;
    console.log(`   ✅ Created ${u.role}: ${u.email}`);
  }

  // Create transactions (all owned by admin)
  const adminId = userMap['ADMIN'];
  let created = 0;

  for (const txn of TRANSACTIONS) {
    await prisma.transaction.create({
      data: {
        amount: txn.amount,
        type: txn.type,
        category: txn.category,
        date: new Date(txn.date),
        description: txn.description,
        reference: generateRef(),
        userId: adminId,
      },
    });
    created++;
  }

  console.log(`   ✅ Created ${created} transactions\n`);

  // Print summary
  const counts = await prisma.transaction.groupBy({
    by: ['type'],
    _count: true,
    _sum: { amount: true },
  });

  console.log('   Summary:');
  for (const g of counts) {
    console.log(`   ↳ ${g.type}: ${g._count} transactions, total ₹${g._sum.amount}`);
  }

  console.log('\n   Login credentials:');
  for (const u of USERS) {
    console.log(`   ↳ ${u.role.padEnd(8)} ${u.email.padEnd(25)} ${u.password}`);
  }

  console.log('\n🌱 Seed complete!\n');
}

seed()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
