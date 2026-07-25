import { HttpInterceptorFn } from '@angular/common/http';

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

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(cloned);
};