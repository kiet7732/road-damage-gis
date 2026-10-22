const test = require('node:test');
const assert = require('node:assert/strict');

// Import logic directly
const {
  resolveAppRole,
  isEngineerRole,
  isAdminRole,
  isReporterRole,
  getRoleDisplayName,
} = require('../packages/mobile-shared/src/roleRouting.ts');

test('TDD: Role routing - Engineer roles', () => {
  assert.equal(resolveAppRole('field_engineer'), 'engineer');
  assert.equal(resolveAppRole('engineer'), 'engineer');
  assert.equal(resolveAppRole('engineer_staff'), 'engineer');
  assert.equal(resolveAppRole(' FIELD_ENGINEER '), 'engineer');

  assert.equal(isEngineerRole('field_engineer'), true);
  assert.equal(isEngineerRole('reporter'), false);
  assert.equal(getRoleDisplayName('field_engineer'), 'Kỹ sư hiện trường');
});

test('TDD: Role routing - Admin roles', () => {
  assert.equal(resolveAppRole('admin'), 'admin');
  assert.equal(resolveAppRole('manager'), 'admin');
  assert.equal(resolveAppRole('staff'), 'admin');
  assert.equal(resolveAppRole('officer'), 'admin');
  assert.equal(resolveAppRole('can_bo'), 'admin');
  assert.equal(resolveAppRole(' ADMIN '), 'admin');

  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('manager'), true);
  assert.equal(isAdminRole('reporter'), false);
  assert.equal(getRoleDisplayName('admin'), 'Cán bộ quản lý');
});

test('TDD: Role routing - Reporter & fallback roles', () => {
  assert.equal(resolveAppRole('reporter'), 'reporter');
  assert.equal(resolveAppRole('citizen'), 'reporter');
  assert.equal(resolveAppRole('user'), 'reporter');
  assert.equal(resolveAppRole(''), 'reporter');
  assert.equal(resolveAppRole(null), 'reporter');
  assert.equal(resolveAppRole(undefined), 'reporter');
  assert.equal(resolveAppRole('unknown_role'), 'reporter');

  assert.equal(isReporterRole('reporter'), true);
  assert.equal(isReporterRole('citizen'), true);
  assert.equal(isReporterRole('field_engineer'), false);
  assert.equal(getRoleDisplayName('reporter'), 'Người dân phản ánh');
});
