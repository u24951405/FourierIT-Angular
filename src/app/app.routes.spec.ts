import { routes } from './app.routes';

describe('app routes', () => {
  it('registers the reports module under /reports', () => {
    const layoutRoute = routes.find((route) => route.path === '');
    const reportsRoute = (layoutRoute?.children ?? []).find((child) => child.path === 'reports');

    expect(reportsRoute).toBeDefined();
  });

  it('registers the institution token requested route', () => {
    expect(routes.some((route) => route.path === 'institution/auth/token-requested')).toBeTrue();
  });

  it('registers the reports subroutes', () => {
    const layoutRoute = routes.find((route) => route.path === '');
    const reportsRoute = (layoutRoute?.children ?? []).find((child) => child.path === 'reports');

    expect(reportsRoute).toBeDefined();
  });
});
