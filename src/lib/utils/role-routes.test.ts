import { describe, it, expect } from 'vitest';
import { getDefaultRouteForRole } from './role-routes';

describe('getDefaultRouteForRole', () => {
  it('OPS_ADMIN → /ops/projects', () => {
    expect(getDefaultRouteForRole('OPS_ADMIN')).toBe('/ops/projects');
  });
  it('SYSTEM_ADMIN → /ops/projects', () => {
    expect(getDefaultRouteForRole('SYSTEM_ADMIN')).toBe('/ops/projects');
  });
  it('CONSULTANT_APPROVED → /consultant/home', () => {
    expect(getDefaultRouteForRole('CONSULTANT_APPROVED')).toBe('/consultant/home');
  });
  it('USER_PENDING → /dashboard', () => {
    expect(getDefaultRouteForRole('USER_PENDING')).toBe('/dashboard');
  });
  it('OPS_ADMIN_PENDING → /dashboard', () => {
    expect(getDefaultRouteForRole('OPS_ADMIN_PENDING')).toBe('/dashboard');
  });
  it('undefined → /dashboard', () => {
    expect(getDefaultRouteForRole(undefined)).toBe('/dashboard');
    expect(getDefaultRouteForRole(null)).toBe('/dashboard');
  });
});
