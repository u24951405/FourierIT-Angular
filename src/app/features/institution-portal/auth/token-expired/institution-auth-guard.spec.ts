import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { institutionAuthGuard } from './institution-auth-guard';

describe('institutionAuthGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => institutionAuthGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
