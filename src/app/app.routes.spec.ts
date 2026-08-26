import { routes } from './app.routes';

describe('app routes', () => {
  it('registers the reports module under /reports', () => {
    const layoutRoute = routes.find((route) => route.children);
    const reportsRoute = (layoutRoute?.children ?? []).find((child) => child.path === 'reports');

    expect(reportsRoute).toBeDefined();
  });

  it('registers the institution token requested route', () => {
    expect(routes.some((route) => route.path === 'institution/auth/token-requested')).toBe(true);
  });

  it('registers the help route', () => {
    const layoutRoute = routes.find((route) => route.children);
    const helpRoute = (layoutRoute?.children ?? []).find((child) => child.path === 'help');

    expect(helpRoute).toBeDefined();
  });

  it('registers the reports subroutes', () => {
    const layoutRoute = routes.find((route) => route.children);
    const reportsRoute = (layoutRoute?.children ?? []).find((child) => child.path === 'reports');

    expect(reportsRoute).toBeDefined();
  });
});
