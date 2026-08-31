import { isSwaggerEnabled } from './configure-app';

describe('configureApp', () => {
  it('disables Swagger in production', () => {
    expect(isSwaggerEnabled('production')).toBe(false);
    expect(isSwaggerEnabled('development')).toBe(true);
    expect(isSwaggerEnabled('test')).toBe(true);
  });
});
