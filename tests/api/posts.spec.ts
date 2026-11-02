import { expect, test } from '../fixtures/api.fixture';

test.describe('Posts API', () => {
  test('GET /posts/1 returns a post', async ({ postsApi }, testInfo) => {
    testInfo.annotations.push({
      type: 'description',
      description: 'Verifies that retrieving an existing post returns its ID and required fields.',
    });

    const response = await postsApi.getById(1);

    expect(response.status()).toBe(200);

    const post: unknown = await response.json();
    expect(post).toMatchObject({
      userId: expect.any(Number),
      id: 1,
      title: expect.any(String),
      body: expect.any(String),
    });
  });
});
