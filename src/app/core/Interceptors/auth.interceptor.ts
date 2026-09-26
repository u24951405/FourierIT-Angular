import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'docuvault_token';

/** Do not send JWT on public endpoints unless the client is already authenticated. */
function shouldSendAuth(req: { url: string; method: string }, token: string | null): boolean {
  const u = req.url.toLowerCase();
  if (!token) return false;
  if (u.includes('/user/login')) return false;
  if (u.includes('/user/verify-entity')) return false;
  if (req.method === 'GET' && u.includes('/roles')) return false;
  return true;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!shouldSendAuth(req, token)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(cloned).pipe(
    catchError((error: unknown) => {
      // A 401 on a signed-in request means the session has ended (e.g. the staff session timer ran out).
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.expireSession();
      }
      return throwError(() => error);
    })
  );
};