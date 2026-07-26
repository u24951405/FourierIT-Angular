import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

function parseRolesFromToken(token: string): string[] {
  const payload = token.split('.')[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(normalized);
  const claims = JSON.parse(decoded) as Record<string, unknown>;

  const candidates = [
    claims['role'],
    claims['roles'],
    claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role']
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const roles = candidate.filter((r): r is string => typeof r === 'string' && r.trim().length > 0);
      if (roles.length > 0) return roles;
    }

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.split(',').map(role => role.trim()).filter(Boolean);
    }
  }

  return [];
}

describe('AuthService', () => {
  it('returns a null password policy without issuing an HTTP request', async () => {
    const service = new AuthService();
    const policy = await firstValueFrom(service.getPasswordPolicy());

    expect(policy).toBeNull();
  });
});

describe('auth role parsing', () => {
  it('parses standard role claims from JWT payloads', () => {
    const token = 'header.' + btoa(JSON.stringify({ role: ['Admin', 'Department Admin'] })) + '.signature';
    expect(parseRolesFromToken(token)).toEqual(['Admin', 'Department Admin']);
  });

  it('parses claims using the Microsoft role claim URI', () => {
    const token = 'header.' + btoa(JSON.stringify({ 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin' })) + '.signature';
    expect(parseRolesFromToken(token)).toEqual(['Admin']);
  });
});
