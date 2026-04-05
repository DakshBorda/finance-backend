/**
 * Phase 3: Transaction CRUD Integration Tests
 *
 * Tests cover:
 * - Create transactions (admin only)
 * - List with filtering, pagination, sorting
 * - Get by ID
 * - Update (admin only)
 * - Soft delete (admin only)
 * - Role-based access control
 * - Inline summary stats
 * - Edge cases (future date, negative amount, precision)
 */

const BASE = 'http://localhost:3000/api/v1';
let adminToken, viewerToken, analystToken;
let adminId, viewerId;
let transactionId, transactionRef;

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

async function setupUsers() {
  console.log('\n--- Setup: Creating test users ---');

  // Register viewer
  let r = await api('POST', '/auth/register', {
    email: 'txn-viewer@test.com',
    password: 'Viewer@123',
    firstName: 'Transaction',
    lastName: 'Viewer',
  });
  viewerToken = r.data?.data?.tokens?.accessToken;
  viewerId = r.data?.data?.user?.id;

  // Register analyst
  r = await api('POST', '/auth/register', {
    email: 'txn-analyst@test.com',
    password: 'Analyst@123',
    firstName: 'Transaction',
    lastName: 'Analyst',
  });
  analystToken = r.data?.data?.tokens?.accessToken;

  // Register admin
  r = await api('POST', '/auth/register', {
    email: 'txn-admin@test.com',
    password: 'Admin@123',
    firstName: 'Transaction',
    lastName: 'Admin',
  });
  adminId = r.data?.data?.user?.id;

  // Promote to admin via DB
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });

  // Promote analyst
  const analystUser = await prisma.user.findUnique({ where: { email: 'txn-analyst@test.com' } });
  await prisma.user.update({ where: { id: analystUser.id }, data: { role: 'ANALYST' } });
  await prisma.$disconnect();

  // Re-login to get token with correct role
  r = await api('POST', '/auth/login', { email: 'txn-admin@test.com', password: 'Admin@123' });
  adminToken = r.data?.data?.tokens?.accessToken;

  r = await api('POST', '/auth/login', { email: 'txn-analyst@test.com', password: 'Analyst@123' });
  analystToken = r.data?.data?.tokens?.accessToken;

  console.log('   Users ready (admin, analyst, viewer)\n');
}

async function testCreateTransaction() {
  console.log('--- Create Transaction ---');

  // Viewer cannot create
  let r = await api('POST', '/transactions', {
    amount: 1000, type: 'INCOME', category: 'SALARY', date: '2026-03-15',
  }, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot create');

  // Analyst cannot create
  r = await api('POST', '/transactions', {
    amount: 1000, type: 'INCOME', category: 'SALARY', date: '2026-03-15',
  }, analystToken);
  assert(r.status === 403, '[403] Analyst cannot create');

  // Missing required fields
  r = await api('POST', '/transactions', {}, adminToken);
  assert(r.status === 400, '[400] Empty body rejected');

  // Future date
  r = await api('POST', '/transactions', {
    amount: 1000, type: 'INCOME', category: 'SALARY', date: '2030-01-01',
  }, adminToken);
  assert(r.status === 400, '[400] Future date rejected');

  // Negative amount
  r = await api('POST', '/transactions', {
    amount: -500, type: 'EXPENSE', category: 'FOOD', date: '2026-03-01',
  }, adminToken);
  assert(r.status === 400, '[400] Negative amount rejected');

  // Zero amount
  r = await api('POST', '/transactions', {
    amount: 0, type: 'EXPENSE', category: 'FOOD', date: '2026-03-01',
  }, adminToken);
  assert(r.status === 400, '[400] Zero amount rejected');

  // Invalid category
  r = await api('POST', '/transactions', {
    amount: 100, type: 'INCOME', category: 'INVALID', date: '2026-03-01',
  }, adminToken);
  assert(r.status === 400, '[400] Invalid category rejected');

  // Valid creation — INCOME
  r = await api('POST', '/transactions', {
    amount: 5000.50, type: 'INCOME', category: 'SALARY',
    date: '2026-03-15', description: 'March salary',
  }, adminToken);
  assert(r.status === 201, '[201] Create income transaction');
  transactionId = r.data?.data?.transaction?.id;
  transactionRef = r.data?.data?.transaction?.reference;
  assert(!!transactionRef, '[]   Auto-generated reference', transactionRef);
  assert(r.data?.data?.transaction?.amount === '5000.5', '[]   Amount stored correctly', r.data?.data?.transaction?.amount);

  // Valid creation — EXPENSE with custom reference
  r = await api('POST', '/transactions', {
    amount: 250.75, type: 'EXPENSE', category: 'FOOD',
    date: '2026-03-20', description: 'Team lunch',
    reference: 'CUSTOM-REF-001',
  }, adminToken);
  assert(r.status === 201, '[201] Create expense with custom reference');
  assert(r.data?.data?.transaction?.reference === 'CUSTOM-REF-001', '[]   Custom reference preserved');

  // Duplicate reference
  r = await api('POST', '/transactions', {
    amount: 100, type: 'EXPENSE', category: 'FOOD',
    date: '2026-03-21', reference: 'CUSTOM-REF-001',
  }, adminToken);
  assert(r.status === 409, '[409] Duplicate reference rejected');

  // Create more for filtering tests
  const bulkData = [
    { amount: 3000, type: 'INCOME', category: 'FREELANCE', date: '2026-02-10', description: 'Freelance project' },
    { amount: 800, type: 'EXPENSE', category: 'TRANSPORT', date: '2026-02-15' },
    { amount: 1200, type: 'EXPENSE', category: 'RENT', date: '2026-01-01' },
    { amount: 150, type: 'EXPENSE', category: 'UTILITIES', date: '2026-01-15' },
    { amount: 7500, type: 'INCOME', category: 'SALARY', date: '2026-02-15', description: 'February salary' },
  ];
  for (const txn of bulkData) {
    await api('POST', '/transactions', txn, adminToken);
  }
  console.log('   Created 7 total transactions for testing\n');
}

async function testListTransactions() {
  console.log('--- List & Filter Transactions ---');

  // List all
  let r = await api('GET', '/transactions', null, adminToken);
  assert(r.status === 200, '[200] List all transactions');
  assert(r.data?.pagination?.total >= 7, '[]   Total count correct', `count: ${r.data?.pagination?.total}`);
  assert(!!r.data?.data?.summary, '[]   Inline summary present');
  assert(parseFloat(r.data?.data?.summary?.totalIncome) > 0, '[]   Summary totalIncome > 0', r.data?.data?.summary?.totalIncome);
  assert(parseFloat(r.data?.data?.summary?.totalExpense) > 0, '[]   Summary totalExpense > 0', r.data?.data?.summary?.totalExpense);

  // Viewer CAN list (read access)
  r = await api('GET', '/transactions', null, viewerToken);
  assert(r.status === 200, '[200] Viewer can list transactions');

  // Analyst CAN list
  r = await api('GET', '/transactions', null, analystToken);
  assert(r.status === 200, '[200] Analyst can list transactions');

  // Filter by type
  r = await api('GET', '/transactions?type=INCOME', null, adminToken);
  assert(r.status === 200, '[200] Filter by type INCOME');
  const incomeItems = r.data?.data?.transactions || [];
  const allIncome = incomeItems.every(t => t.type === 'INCOME');
  assert(allIncome, '[]   All results are INCOME');

  // Filter by category
  r = await api('GET', '/transactions?category=SALARY', null, adminToken);
  assert(r.status === 200, '[200] Filter by category SALARY');

  // Filter by date range
  r = await api('GET', '/transactions?dateFrom=2026-02-01&dateTo=2026-02-28', null, adminToken);
  assert(r.status === 200, '[200] Filter by date range (Feb 2026)');

  // Filter by amount range
  r = await api('GET', '/transactions?amountMin=1000&amountMax=5000', null, adminToken);
  assert(r.status === 200, '[200] Filter by amount range');

  // Search in description
  r = await api('GET', '/transactions?search=salary', null, adminToken);
  assert(r.status === 200, '[200] Search by description');
  assert(r.data?.pagination?.total >= 1, '[]   Search found results');

  // Pagination
  r = await api('GET', '/transactions?page=1&limit=2', null, adminToken);
  assert(r.status === 200, '[200] Pagination works');
  assert(r.data?.data?.transactions?.length <= 2, '[]   Limit respected', `got: ${r.data?.data?.transactions?.length}`);
  assert(r.data?.pagination?.totalPages > 1, '[]   Multiple pages exist');

  // Sort by amount ascending
  r = await api('GET', '/transactions?sortBy=amount&sortOrder=asc', null, adminToken);
  assert(r.status === 200, '[200] Sort by amount asc');
  const amounts = (r.data?.data?.transactions || []).map(t => parseFloat(t.amount));
  const isSorted = amounts.every((v, i) => i === 0 || v >= amounts[i - 1]);
  assert(isSorted, '[]   Amounts sorted ascending');
  console.log('');
}

async function testGetTransaction() {
  console.log('--- Get Transaction by ID ---');

  let r = await api('GET', `/transactions/${transactionId}`, null, adminToken);
  assert(r.status === 200, '[200] Get transaction by ID');
  assert(r.data?.data?.transaction?.reference === transactionRef, '[]   Reference matches');

  // Viewer can read single transaction
  r = await api('GET', `/transactions/${transactionId}`, null, viewerToken);
  assert(r.status === 200, '[200] Viewer can read single transaction');

  // Invalid UUID
  r = await api('GET', '/transactions/not-a-uuid', null, adminToken);
  assert(r.status === 400, '[400] Invalid UUID rejected');

  // Non-existent ID
  r = await api('GET', '/transactions/00000000-0000-0000-0000-000000000000', null, adminToken);
  assert(r.status === 404, '[404] Non-existent transaction');
  console.log('');
}

async function testUpdateTransaction() {
  console.log('--- Update Transaction ---');

  // Viewer cannot update
  let r = await api('PATCH', `/transactions/${transactionId}`, { amount: 9999 }, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot update');

  // Analyst cannot update
  r = await api('PATCH', `/transactions/${transactionId}`, { amount: 9999 }, analystToken);
  assert(r.status === 403, '[403] Analyst cannot update');

  // Admin can update
  r = await api('PATCH', `/transactions/${transactionId}`, {
    amount: 5500.00,
    description: 'March salary (revised)',
  }, adminToken);
  assert(r.status === 200, '[200] Admin can update');
  assert(r.data?.data?.transaction?.amount === '5500', '[]   Amount updated', r.data?.data?.transaction?.amount);
  assert(r.data?.data?.transaction?.description === 'March salary (revised)', '[]   Description updated');

  // Empty body
  r = await api('PATCH', `/transactions/${transactionId}`, {}, adminToken);
  assert(r.status === 400, '[400] Empty update rejected');
  console.log('');
}

async function testDeleteTransaction() {
  console.log('--- Soft Delete Transaction ---');

  // Viewer cannot delete
  let r = await api('DELETE', `/transactions/${transactionId}`, null, viewerToken);
  assert(r.status === 403, '[403] Viewer cannot delete');

  // Admin can delete
  r = await api('DELETE', `/transactions/${transactionId}`, null, adminToken);
  assert(r.status === 200, '[200] Admin can soft-delete');
  assert(r.data?.data?.transaction?.isDeleted === true, '[]   isDeleted=true');

  // Deleted transaction not in list
  r = await api('GET', '/transactions', null, adminToken);
  const ids = (r.data?.data?.transactions || []).map(t => t.id);
  assert(!ids.includes(transactionId), '[]   Deleted transaction excluded from list');

  // Cannot get deleted transaction by ID
  r = await api('GET', `/transactions/${transactionId}`, null, adminToken);
  assert(r.status === 404, '[404] Deleted transaction not found');

  // Cannot delete again
  r = await api('DELETE', `/transactions/${transactionId}`, null, adminToken);
  assert(r.status === 400, '[400] Already-deleted transaction rejected');
  console.log('');
}

async function cleanup() {
  console.log('--- Cleanup ---');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.transaction.deleteMany({
    where: { user: { email: { in: ['txn-admin@test.com'] } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: ['txn-viewer@test.com', 'txn-analyst@test.com', 'txn-admin@test.com'] } },
  });
  await prisma.$disconnect();
  console.log('   Cleaned up test data\n');
}

async function run() {
  console.log('\n========== PHASE 3: TRANSACTION CRUD TESTS ==========\n');

  await setupUsers();
  await testCreateTransaction();
  await testListTransactions();
  await testGetTransaction();
  await testUpdateTransaction();
  await testDeleteTransaction();
  await cleanup();

  console.log('========== PHASE 3 TESTS COMPLETE ==========');
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
