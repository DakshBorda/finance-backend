/**
 * Phase 2 Integration Test Script
 * 
 * Tests all auth + user management endpoints end-to-end.
 * Run: node scripts/test-phase2.js
 */

const BASE = 'http://localhost:3000/api/v1';

let accessToken = '';
let refreshToken = '';
let adminAccessToken = '';
let userId = '';

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function log(label, status, passed, detail = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${status}] ${label}${detail ? ' — ' + detail : ''}`);
  if (!passed) process.exitCode = 1;
}

async function run() {
  console.log('\n========== PHASE 2: AUTH & USER MANAGEMENT TESTS ==========\n');

  // ---- 1. Register ----
  console.log('--- Registration ---');

  // 1a. Validation failure (missing fields)
  let r = await request('POST', '/auth/register', {});
  log('Register with empty body → 400', r.status, r.status === 400);

  // 1b. Weak password
  r = await request('POST', '/auth/register', {
    email: 'test@example.com', password: 'weak', firstName: 'Test', lastName: 'User'
  });
  log('Register with weak password → 400', r.status, r.status === 400);

  // 1c. Successful registration
  r = await request('POST', '/auth/register', {
    email: 'viewer@test.com', password: 'Viewer@123', firstName: 'View', lastName: 'User'
  });
  log('Register viewer → 201', r.status, r.status === 201);
  if (r.status === 201) {
    userId = r.data.data.user.id;
    accessToken = r.data.data.tokens.accessToken;
    refreshToken = r.data.data.tokens.refreshToken;
    log('  Role is VIEWER', '', r.data.data.user.role === 'VIEWER', r.data.data.user.role);
    log('  Tokens received', '', !!accessToken && !!refreshToken);
  }

  // 1d. Duplicate email
  r = await request('POST', '/auth/register', {
    email: 'viewer@test.com', password: 'Viewer@123', firstName: 'Dup', lastName: 'User'
  });
  log('Register duplicate email → 409', r.status, r.status === 409);

  // ---- 2. Login ----
  console.log('\n--- Login ---');

  // 2a. Wrong password
  r = await request('POST', '/auth/login', { email: 'viewer@test.com', password: 'WrongPass@1' });
  log('Login wrong password → 401', r.status, r.status === 401);

  // 2b. Non-existent email
  r = await request('POST', '/auth/login', { email: 'ghost@test.com', password: 'Ghost@123' });
  log('Login non-existent user → 401', r.status, r.status === 401);

  // 2c. Successful login
  r = await request('POST', '/auth/login', { email: 'viewer@test.com', password: 'Viewer@123' });
  log('Login success → 200', r.status, r.status === 200);
  if (r.status === 200) {
    accessToken = r.data.data.tokens.accessToken;
    refreshToken = r.data.data.tokens.refreshToken;
  }

  // ---- 3. Token Refresh ----
  console.log('\n--- Token Refresh ---');

  r = await request('POST', '/auth/refresh', { refreshToken });
  log('Refresh token → 200', r.status, r.status === 200);
  if (r.status === 200) {
    accessToken = r.data.data.tokens.accessToken;
    refreshToken = r.data.data.tokens.refreshToken;
  }

  r = await request('POST', '/auth/refresh', { refreshToken: 'invalid-token' });
  log('Refresh with invalid token → 401', r.status, r.status === 401);

  // ---- 4. Profile ----
  console.log('\n--- Profile ---');

  r = await request('GET', '/auth/profile', null, accessToken);
  log('Get profile → 200', r.status, r.status === 200);

  r = await request('GET', '/auth/profile');
  log('Get profile without token → 401', r.status, r.status === 401);

  r = await request('PATCH', '/auth/profile', { firstName: 'Updated' }, accessToken);
  log('Update profile → 200', r.status, r.status === 200);
  if (r.status === 200) {
    log('  Name updated', '', r.data.data.user.firstName === 'Updated', r.data.data.user.firstName);
  }

  // ---- 5. Change Password ----
  console.log('\n--- Change Password ---');

  r = await request('PATCH', '/auth/change-password', {
    currentPassword: 'WrongCurrent@1', newPassword: 'NewPass@123'
  }, accessToken);
  log('Change password wrong current → 400', r.status, r.status === 400);

  r = await request('PATCH', '/auth/change-password', {
    currentPassword: 'Viewer@123', newPassword: 'Viewer@123'
  }, accessToken);
  log('Change password same as old → 400', r.status, r.status === 400);

  r = await request('PATCH', '/auth/change-password', {
    currentPassword: 'Viewer@123', newPassword: 'NewViewer@123'
  }, accessToken);
  log('Change password success → 200', r.status, r.status === 200);

  // Login with new password
  r = await request('POST', '/auth/login', { email: 'viewer@test.com', password: 'NewViewer@123' });
  log('Login with new password → 200', r.status, r.status === 200);
  if (r.status === 200) accessToken = r.data.data.tokens.accessToken;

  // ---- 6. Role Guard (Viewer cannot access admin routes) ----
  console.log('\n--- Role Guard ---');

  r = await request('GET', '/users', null, accessToken);
  log('Viewer access /users → 403', r.status, r.status === 403);

  // ---- 7. Create Admin user for admin tests ----
  console.log('\n--- Admin User Management ---');

  // Register an admin (we'll promote via direct DB for testing, or register + promote)
  r = await request('POST', '/auth/register', {
    email: 'admin@test.com', password: 'Admin@123', firstName: 'Admin', lastName: 'Boss'
  });
  log('Register admin user → 201', r.status, r.status === 201);

  // We need to promote this user to ADMIN via Prisma directly
  // For the test script, let's use a workaround — import prisma
  const { prisma } = require('../src/config/database');
  if (r.status === 201) {
    const adminId = r.data.data.user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    console.log('   (Promoted to ADMIN via DB)');
  }

  // Login as admin
  r = await request('POST', '/auth/login', { email: 'admin@test.com', password: 'Admin@123' });
  log('Login as admin → 200', r.status, r.status === 200);
  if (r.status === 200) adminAccessToken = r.data.data.tokens.accessToken;

  // 7a. List users
  r = await request('GET', '/users', null, adminAccessToken);
  log('Admin list users → 200', r.status, r.status === 200);
  if (r.status === 200) {
    log('  Has pagination', '', !!r.data.pagination);
    log('  Users found', '', r.data.data.length >= 2, `count: ${r.data.data.length}`);
  }

  // 7b. List with search
  r = await request('GET', '/users?search=viewer', null, adminAccessToken);
  log('Search users "viewer" → 200', r.status, r.status === 200);
  if (r.status === 200) {
    log('  Filtered results', '', r.data.data.length >= 1, `count: ${r.data.data.length}`);
  }

  // 7c. List with role filter
  r = await request('GET', '/users?role=ADMIN', null, adminAccessToken);
  log('Filter by ADMIN role → 200', r.status, r.status === 200);

  // 7d. Get user by ID
  r = await request('GET', `/users/${userId}`, null, adminAccessToken);
  log('Get user by ID → 200', r.status, r.status === 200);

  // 7e. Invalid UUID
  r = await request('GET', '/users/not-a-uuid', null, adminAccessToken);
  log('Get user invalid UUID → 400', r.status, r.status === 400);

  // 7f. Update user role
  r = await request('PATCH', `/users/${userId}`, { role: 'ANALYST' }, adminAccessToken);
  log('Update user role to ANALYST → 200', r.status, r.status === 200);
  if (r.status === 200) {
    log('  Role updated', '', r.data.data.user.role === 'ANALYST', r.data.data.user.role);
  }

  // 7g. Admin cannot modify self
  const adminProfile = await request('GET', '/auth/profile', null, adminAccessToken);
  const adminId = adminProfile.data.data.user.id;
  r = await request('PATCH', `/users/${adminId}`, { role: 'VIEWER' }, adminAccessToken);
  log('Admin self-modify → 400', r.status, r.status === 400);

  // 7h. Soft delete user
  r = await request('DELETE', `/users/${userId}`, null, adminAccessToken);
  log('Soft-delete user → 200', r.status, r.status === 200);
  if (r.status === 200) {
    log('  isDeleted=true', '', r.data.data.user.isDeleted === true);
  }

  // 7i. Deleted user cannot login
  r = await request('POST', '/auth/login', { email: 'viewer@test.com', password: 'NewViewer@123' });
  log('Deleted user login → 401', r.status, r.status === 401);

  // 7j. Cannot delete already deleted
  r = await request('DELETE', `/users/${userId}`, null, adminAccessToken);
  log('Delete already-deleted → 400', r.status, r.status === 400);

  // 7k. Admin cannot self-delete
  r = await request('DELETE', `/users/${adminId}`, null, adminAccessToken);
  log('Admin self-delete → 400', r.status, r.status === 400);

  // 7l. Restore user
  r = await request('PATCH', `/users/${userId}/restore`, null, adminAccessToken);
  log('Restore user → 200', r.status, r.status === 200);
  if (r.status === 200) {
    log('  isDeleted=false', '', r.data.data.user.isDeleted === false);
    log('  isActive=true', '', r.data.data.user.isActive === true);
  }

  // 7m. Restored user can login
  r = await request('POST', '/auth/login', { email: 'viewer@test.com', password: 'NewViewer@123' });
  log('Restored user login → 200', r.status, r.status === 200);

  // 7n. Cannot restore non-deleted
  r = await request('PATCH', `/users/${userId}/restore`, null, adminAccessToken);
  log('Restore non-deleted → 400', r.status, r.status === 400);

  // ---- 8. 404 Handler ----
  console.log('\n--- 404 Handler ---');
  r = await request('GET', '/nonexistent');
  log('Non-existent route → 404', r.status, r.status === 404);

  // ---- Cleanup ----
  console.log('\n--- Cleanup ---');
  await prisma.user.deleteMany({ where: { email: { in: ['viewer@test.com', 'admin@test.com'] } } });
  console.log('   Cleaned up test users');
  await prisma.$disconnect();

  console.log('\n========== PHASE 2 TESTS COMPLETE ==========\n');
}

run().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
