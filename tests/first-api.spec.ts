import { test, expect } from '@playwright/test';

test('GET /posts/1 returns a post', async ({ request }) => {
  const response = await request.get('/posts/1');
  const body = await response.json();

  console.log(response.status(), JSON.stringify(body, null, 2));

  expect(response.status()).toBe(200);
  expect(body.id).toBe(1);
});
