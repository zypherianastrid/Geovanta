import { test, expect } from '@playwright/test';

test('infrastructure: verifies playwright runner and environment sanity', async () => {
  const isNode = typeof process !== 'undefined' && !!process.versions?.node;
  expect(isNode).toBe(true);
});
