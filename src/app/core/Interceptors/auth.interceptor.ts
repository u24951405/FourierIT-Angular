import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'docuvault_token';

/** Do not send JWT on public endpoints — a stale/expired token breaks anonymous API calls. */
function shouldSendAuth(req: { url: string; method: string }): boolean {
  const u = req.url.toLowerCase();
  if (u.includes('/user/login') || u.includes('/user/register')) return false;
  if (u.includes('/user/verify-entity')) return false;
  if (req.method === 'GET' && u.includes('/roles')) return false;
  return true;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token || !shouldSendAuth(req)) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(cloned);
};