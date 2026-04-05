/**
 * Phase 4: Dashboard Analytics Integration Tests
 */

const BASE = 'http://localhost:3000/api/v1';
let adminToken, analystToken, viewerToken;
let adminId;

const passed = [];
const failed = [];

function assert(condition, label, detail = '') {
  if (condition) {
    passed.push(label);
    console.log(`✅ ${label}${detail ? ' — ' + detail : ''}`);
  } else {
    failed.push(label);
    console.log(`❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function api(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function setup() {
  console.log('\n--- Setup: Creating users + seed transactions ---');

  // Create viewer
  let r = await api('POST', '/auth/register', {
    email: 'dash-viewer@test.com', password: 'Viewer@123',
    firstName: 'Dash', lastName: 'Viewer',
  });
  viewerToken = r.data?.data?.tokens?.accessToken;

  // Create analyst
  r = await api('POST', '/auth/register', {
    email: 'dash-analyst@test.com', password: 'Analyst@123',
    firstName: 'Dash', lastName: 'Analyst',
  });

  // Create admin
  r = await api('POST', '/auth/register', {
    email: 'dash-admin@test.com', password: 'Admin@123',
    firstName: 'Dash', lastName: 'Admin',
  });
  adminId = r.data?.data?.user?.id;

  // Promote roles via DB
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
  const analyst = await prisma.user.findUnique({ where: { email: 'dash-analyst@test.com' } });
  await prisma.user.update({ where: { id: analyst.id }, data: { role: 'ANALYST' } });
  await prisma.$disconnect();

  // Re-login
  r = await api('POST', '/auth/login', { email: 'dash-admin@test.com', password: 'Admin@123' });
  adminToken = r.data?.data?.tokens?.accessToken;
  r = await api('POST', '/auth/login', { email: 'dash-analyst@test.com', password: 'Analyst@123' });
  analystToken = r.data?.data?.tokens?.accessToken;

  // Seed transactions across multiple months and categories
  const seeds = [
    // January
    { amount: 5000, type: 'INCOME', category: 'SALARY', date: '2026-01-15', description: 'Jan salary' },
    { amount: 800, type: 'EXPENSE', category: 'RENT', date: '2026-01-01' },
    { amount: 150, type: 'EXPENSE', category: 'UTILITIES', date: '2026-01-10' },
    { amount: 200, type: 'EXPENSE', category: 'FOOD', date: '2026-01-20' },
    // February
    { amount: 5000, type: 'INCOME', category: 'SALARY', date: '2026-02-15', description: 'Feb salary' },
    { amount: 2000, type: 'INCOME', category: 'FREELANCE', date: '2026-02-20', description: 'Freelance gig' },
    { amount: 800, type: 'EXPENSE', category: 'RENT', date: '2026-02-01' },
    { amount: 300, type: 'EXPENSE', category: 'TRANSPORT', date: '2026-02-10' },
    { amount: 100, type: 'EXPENSE', category: 'ENTERTAINMENT', date: '2026-02-25' },
    // March
    { amount: 5500, type: 'INCOME', category: 'SALARY', date: '2026-03-15', description: 'Mar salary (raise)' },
    { amount: 1000, type: 'INCOME', category: 'INVESTMENT', date: '2026-03-20', description: 'Dividend' },
    { amount: 800, type: 'EXPENSE', category: 'RENT', date: '2026-03-01' },
    { amount: 250, type: 'EXPENSE', category: 'HEALTHCARE', date: '2026-03-10' },
    { amount: 500, type: 'EXPENSE', category: 'EDUCATION', date: '2026-03-25' },
  ];

  for (const txn of seeds) {
    await api('POST', '/transactions', txn, adminToken);
  }
  console.log(`   Seeded ${seeds.length} transactions across 3 months\n`);
}

async function testOverview() {
  console.log('--- Overview ---');

  let r = await api('GET', '/dashboard/overview', null, adminToken);
  assert(r.status === 200, '[200] Admin can access overview');
  assert(parseFloat(r.data?.data?.totalIncome) > 0, '[]   totalIncome > 0', r.data?.data?.totalIncome);
  assert(parseFloat(r.data?.data?.totalExpense) > 0, '[]   totalExpense > 0', r.data?.data?.totalExpense);
  assert(r.data?.data?.netBalance !== undefined, '[]   netBalance present', r.data?.data?.netBalance);
  assert(r.data?.data?.transactionCount === 14, '[]   transactionCount = 14', r.data?.data?.transactionCount);

  // Analyst can access
  r = await api('GET', '/dashboard/overview', null, analystToken);
  assert(r.status === 200, '[200] Analyst can access overview');

  // Viewer CANNOT access analytics
  r = await api('GET', '/dashboard/overview', null, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot access overview');

  // Date range filter
  r = await api('GET', '/dashboard/overview?dateFrom=2026-02-01&dateTo=2026-02-28', null, adminToken);
  assert(r.status === 200, '[200] Overview with date range');
  assert(r.data?.data?.transactionCount === 5, '[]   Feb only: 5 transactions', r.data?.data?.transactionCount);

  // Unauthenticated
  r = await api('GET', '/dashboard/overview');
  assert(r.status === 401, '[401] Unauthenticated rejected');
  console.log('');
}

async function testCategorySummary() {
  console.log('--- Category Summary ---');

  let r = await api('GET', '/dashboard/category-summary', null, adminToken);
  assert(r.status === 200, '[200] Category summary');
  const cats = r.data?.data?.categories || [];
  assert(cats.length > 0, '[]   Categories returned', `count: ${cats.length}`);

  // Check percentage adds up
  const totalPct = cats.reduce((sum, c) => sum + c.percentage, 0);
  assert(Math.abs(totalPct - 100) < 1, '[]   Percentages sum to ~100%', `${totalPct.toFixed(1)}%`);

  // Check first category has all fields
  const first = cats[0];
  assert(first.category && first.totalAmount && first.count !== undefined && first.percentage !== undefined,
    '[]   Category shape is correct');

  // Filter by type
  r = await api('GET', '/dashboard/category-summary?type=EXPENSE', null, adminToken);
  assert(r.status === 200, '[200] Category summary for EXPENSE only');

  // Viewer CANNOT access
  r = await api('GET', '/dashboard/category-summary', null, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot access category summary');
  console.log('');
}

async function testTrends() {
  console.log('--- Monthly Trends ---');

  let r = await api('GET', '/dashboard/trends', null, adminToken);
  assert(r.status === 200, '[200] Trends endpoint');
  const trends = r.data?.data?.trends || [];
  assert(trends.length >= 3, '[]   At least 3 months of data', `months: ${trends.length}`);

  // Check shape
  const entry = trends[0];
  assert(entry.month && entry.income && entry.expense && entry.net !== undefined,
    '[]   Trend entry shape correct');

  // Check month format
  assert(/^\d{4}-\d{2}$/.test(entry.month), '[]   Month format YYYY-MM', entry.month);

  // Moving average should exist for 3rd+ month
  const lastEntry = trends[trends.length - 1];
  if (trends.length >= 3) {
    assert(lastEntry.movingAverage !== null, '[]   Moving average calculated', lastEntry.movingAverage);
  }

  // Custom months param
  r = await api('GET', '/dashboard/trends?months=2', null, adminToken);
  assert(r.status === 200, '[200] Trends with months=2');

  // Analyst can access
  r = await api('GET', '/dashboard/trends', null, analystToken);
  assert(r.status === 200, '[200] Analyst can access trends');

  // Viewer CANNOT
  r = await api('GET', '/dashboard/trends', null, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot access trends');
  console.log('');
}

async function testRecent() {
  console.log('--- Recent Transactions ---');

  // All roles can access recent
  let r = await api('GET', '/dashboard/recent', null, viewerToken);
  assert(r.status === 200, '[200] Viewer CAN access recent');
  const txns = r.data?.data?.transactions || [];
  assert(txns.length === 5, '[]   Default limit = 5', `got: ${txns.length}`);

  // Check ordered by most recent
  if (txns.length >= 2) {
    const d1 = new Date(txns[0].createdAt);
    const d2 = new Date(txns[1].createdAt);
    assert(d1 >= d2, '[]   Ordered by most recent first');
  }

  // Custom limit
  r = await api('GET', '/dashboard/recent?limit=3', null, adminToken);
  assert(r.status === 200, '[200] Recent with limit=3');
  assert((r.data?.data?.transactions || []).length === 3, '[]   Limit respected', 'got: 3');

  // Analyst can access
  r = await api('GET', '/dashboard/recent', null, analystToken);
  assert(r.status === 200, '[200] Analyst can access recent');
  console.log('');
}

async function testTopCategories() {
  console.log('--- Top Categories ---');

  let r = await api('GET', '/dashboard/top-categories', null, adminToken);
  assert(r.status === 200, '[200] Top categories');
  const cats = r.data?.data?.categories || [];
  assert(cats.length > 0, '[]   Categories returned');

  // Should be sorted by amount descending
  if (cats.length >= 2) {
    assert(parseFloat(cats[0].totalAmount) >= parseFloat(cats[1].totalAmount),
      '[]   Sorted by amount desc');
  }

  // Filter by type
  r = await api('GET', '/dashboard/top-categories?type=INCOME&limit=3', null, adminToken);
  assert(r.status === 200, '[200] Top income categories');
  assert((r.data?.data?.categories || []).length <= 3, '[]   Limit respected');

  // Viewer CANNOT
  r = await api('GET', '/dashboard/top-categories', null, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot access top categories');
  console.log('');
}

async function cleanup() {
  console.log('--- Cleanup ---');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const emails = ['dash-viewer@test.com', 'dash-analyst@test.com', 'dash-admin@test.com'];
  await prisma.transaction.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
  console.log('   Cleaned up test data\n');
}

async function run() {
  console.log('\n========== PHASE 4: DASHBOARD ANALYTICS TESTS ==========\n');

  await setup();
  await testOverview();
  await testCategorySummary();
  await testTrends();
  await testRecent();
  await testTopCategories();
  await cleanup();

  console.log('========== PHASE 4 TESTS COMPLETE ==========');
  console.log(`\nPassed: ${passed.length} | Failed: ${failed.length}\n`);

  if (failed.length > 0) {
    console.log('FAILED TESTS:');
    failed.forEach(f => console.log(`  ❌ ${f}`));
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
