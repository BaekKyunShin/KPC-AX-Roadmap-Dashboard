// e2e/fixtures/test-data.ts

export const TEST_ACCOUNTS = {
  opsAdmin: {
    email: process.env.E2E_OPS_ADMIN_EMAIL!,
    password: process.env.E2E_OPS_ADMIN_PASSWORD!,
  },
  consultant: {
    email: process.env.E2E_CONSULTANT_EMAIL!,
    password: process.env.E2E_CONSULTANT_PASSWORD!,
  },
  systemAdmin: {
    email: process.env.E2E_SYSTEM_ADMIN_EMAIL ?? '',
    password: process.env.E2E_SYSTEM_ADMIN_PASSWORD ?? '',
  },
};

/** SYSTEM_ADMIN 테스트 계정이 설정되어 있는지 확인 */
export const HAS_SYSTEM_ADMIN =
  !!process.env.E2E_SYSTEM_ADMIN_EMAIL && !!process.env.E2E_SYSTEM_ADMIN_PASSWORD;

/** 자주 사용하는 테스트 URL */
export const URLS = {
  landing: '/',
  demo: '/demo',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  // OPS
  opsProjects: '/ops/projects',
  opsProjectNew: '/ops/projects/new',
  opsUsers: '/ops/users',
  opsTemplates: '/ops/templates',
  opsTemplateNew: '/ops/templates/new',
  opsAudit: '/ops/audit',
  opsQuota: '/ops/quota',
  // Consultant
  consultantHome: '/consultant/home',
  consultantProjects: '/consultant/projects',
  consultantProfile: '/consultant/profile',
  // Shared
  messages: '/dashboard/messages',
  settings: '/dashboard/settings',
  gallery: '/gallery',
  testRoadmap: '/test-roadmap',
} as const;
