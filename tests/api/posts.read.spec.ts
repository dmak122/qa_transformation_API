import { expect, test } from '../fixtures/api.fixture';
import { postsByUserCases } from '../data/posts-by-user.cases';
import { addTestDescription } from '../helpers/add-test-description';
import { parsePostResponse } from '../schemas/post.schema';

test.describe('Posts API - read operations', () => {
  test('GET /posts/1 returns a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that retrieving an existing post returns its ID and required fields.',
    );

    const response = await postsApi.getById(1);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/application\/json/i);

    const post = parsePostResponse(await response.json());
    expect(post).toMatchObject({ id: 1 });
  });

  test('GET /posts/999999 returns 404', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that requesting a post that does not exist returns 404 Not Found.',
    );

    const response = await postsApi.getById(999999);

    expect(response.status()).toBe(404);
  });

  test('GET /posts/not-a-number returns 404', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that a malformed post ID returns 404 Not Found.',
    );

    const response = await postsApi.getById('not-a-number');

    expect(response.status()).toBe(404);
  });

  for (const { userId, minimumPostCount } of postsByUserCases) {
    test(`GET /posts?userId=${userId} returns posts for that user`, async ({ postsApi }, testInfo) => {
      addTestDescription(
        testInfo,
        `Verifies that the userId query parameter filters posts for user ${userId}.`,
      );

      const response = await postsApi.getByUserId(userId);

      expect(response.status()).toBe(200);

      const posts: unknown = await response.json();
      expect(Array.isArray(posts)).toBe(true);
      if (!Array.isArray(posts)) {
        throw new Error(`Expected GET /posts?userId=${userId} to return an array.`);
      }

      expect(posts.length).toBeGreaterThanOrEqual(minimumPostCount);
      expect(
        posts.every(
          (post: unknown) =>
            typeof post === 'object' &&
            post !== null &&
            'userId' in post &&
            post.userId === userId,
        ),
      ).toBe(true);
    });
  }

  test('GET /posts?userId=999999 returns an empty array', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that a collection query with no matching posts returns 200 and an empty array.',
    );

    const response = await postsApi.getByUserId(999999);

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });
});
