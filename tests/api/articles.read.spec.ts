import { expect, test } from '../fixtures/api.fixture';
import { articlesByUserCases } from '../data/articles-by-user.cases';
import { addTestDescription } from '../helpers/add-test-description';
import { parseArticleResponse } from '../schemas/article.schema';

test.describe('Articles API - read operations', () => {
  test('GET /articles/1 returns an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that retrieving an existing article returns its ID and required fields.',
    );

    const response = await articlesApi.getById(1);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/application\/json/i);

    const article = parseArticleResponse(await response.json());
    expect(article).toMatchObject({ id: 1 });
  });

  test('GET /articles/999999 returns 404', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that requesting an article that does not exist returns 404 Not Found.',
    );

    const response = await articlesApi.getById(999999);

    expect(response.status()).toBe(404);
  });

  test('GET /articles/not-a-number returns 404', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that a malformed article ID returns 404 Not Found.',
    );

    const response = await articlesApi.getById('not-a-number');

    expect(response.status()).toBe(404);
  });

  for (const { userId, minimumArticleCount } of articlesByUserCases) {
    test(`GET /articles?userId=${userId} returns articles for that user`, async ({ articlesApi }, testInfo) => {
      addTestDescription(
        testInfo,
        `Verifies that the userId query parameter filters articles for user ${userId}.`,
      );

      const response = await articlesApi.getByUserId(userId);

      expect(response.status()).toBe(200);

      const articles: unknown = await response.json();
      expect(Array.isArray(articles)).toBe(true);
      if (!Array.isArray(articles)) {
        throw new Error(`Expected GET /articles?userId=${userId} to return an array.`);
      }

      expect(articles.length).toBeGreaterThanOrEqual(minimumArticleCount);
      expect(
        articles.every(
          (article: unknown) =>
            typeof article === 'object' &&
            article !== null &&
            'userId' in article &&
            article.userId === userId,
        ),
      ).toBe(true);
    });
  }

  test('GET /articles?userId=999999 returns an empty array', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that a collection query with no matching articles returns 200 and an empty array.',
    );

    const response = await articlesApi.getByUserId(999999);

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });
});
