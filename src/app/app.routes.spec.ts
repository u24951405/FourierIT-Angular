import { routes } from './app.routes';

// The internal app and the institution portal each have a layout route, so look through all of them.
const layoutChildren = routes.flatMap((route) => route.children ?? []);

describe('app routes', () => {
  it('registers the reports module under /reports', () => {
    const reportsRoute = layoutChildren.find((child) => child.path === 'reports');

    expect(reportsRoute).toBeDefined();
  });

  it('registers the institution token requested route', () => {
    expect(routes.some((route) => route.path === 'institution/auth/token-requested')).toBe(true);
  });

  it('registers the help route', () => {
    const helpRoute = layoutChildren.find((child) => child.path === 'help');

    expect(helpRoute).toBeDefined();
  });

  it('registers the reports subroutes', () => {
    const reportsRoute = layoutChildren.find((child) => child.path === 'reports');

    expect(reportsRoute?.loadChildren).toBeDefined();
  });
});
