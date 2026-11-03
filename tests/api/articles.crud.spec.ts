import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/api.fixture';
import { addTestDescription } from '../helpers/add-test-description';
import { parseArticleResponse } from '../schemas/article.schema';

test.describe('Articles API - CRUD flow', () => {
  test('creates, reads, updates, and deletes an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that an article can be created, retrieved, updated, and deleted independently.',
    );

    const newArticle = {
      userId: 1,
      title: `CRUD test ${randomUUID()}`,
      body: 'Created during a CRUD flow test.',
    };
    const createResponse = await articlesApi.create(newArticle);

    expect(createResponse.status()).toBe(201);

    const createdArticle = parseArticleResponse(await createResponse.json());
    expect(createdArticle).toMatchObject(newArticle);

    const articleId = createdArticle.id;
    let cleanupRequired = true;

    try {
      const getResponse = await articlesApi.getById(articleId);
      expect(getResponse.status()).toBe(200);
      const retrievedArticle = parseArticleResponse(await getResponse.json());
      expect(retrievedArticle).toMatchObject({
        ...newArticle,
        id: articleId,
      });

      const articlesByUserResponse = await articlesApi.getByUserId(newArticle.userId);
      expect(articlesByUserResponse.status()).toBe(200);
      const articlesByUser: unknown = await articlesByUserResponse.json();
      expect(Array.isArray(articlesByUser)).toBe(true);
      if (!Array.isArray(articlesByUser)) {
        throw new Error('Expected GET /articles?userId=1 to return an array.');
      }

      expect(articlesByUser.map((article: unknown) => parseArticleResponse(article))).toContainEqual(
        expect.objectContaining({ id: articleId, ...newArticle }),
      );

      const updatedArticle = {
        ...newArticle,
        title: `Updated ${newArticle.title}`,
      };
      const updateResponse = await articlesApi.replace(articleId, updatedArticle);
      expect(updateResponse.status()).toBe(200);
      const updateResponseArticle = parseArticleResponse(await updateResponse.json());
      expect(updateResponseArticle).toMatchObject({
        ...updatedArticle,
        id: articleId,
      });

      const updatedGetResponse = await articlesApi.getById(articleId);
      expect(updatedGetResponse.status()).toBe(200);
      const updatedArticleResponse = parseArticleResponse(await updatedGetResponse.json());
      expect(updatedArticleResponse).toMatchObject({
        ...updatedArticle,
        id: articleId,
      });

      const deleteResponse = await articlesApi.deleteById(articleId);
      cleanupRequired = deleteResponse.status() !== 200;
      expect(deleteResponse.status()).toBe(200);
      await expect(deleteResponse.json()).resolves.toEqual({});

      const deletedGetResponse = await articlesApi.getById(articleId);
      expect(deletedGetResponse.status()).toBe(404);

      const articlesAfterDeleteResponse = await articlesApi.getByUserId(newArticle.userId);
      expect(articlesAfterDeleteResponse.status()).toBe(200);
      const articlesAfterDelete: unknown = await articlesAfterDeleteResponse.json();
      expect(Array.isArray(articlesAfterDelete)).toBe(true);
      if (!Array.isArray(articlesAfterDelete)) {
        throw new Error('Expected GET /articles?userId=1 to return an array.');
      }

      expect(
        articlesAfterDelete
          .map((article: unknown) => parseArticleResponse(article))
          .some((article) => article.id === articleId),
      ).toBe(false);
    } finally {
      if (cleanupRequired) {
        const remainingArticleResponse = await articlesApi.getById(articleId);

        if (remainingArticleResponse.status() === 200) {
          const cleanupResponse = await articlesApi.deleteById(articleId);
          expect(cleanupResponse.status()).toBe(200);

          const deletedArticleResponse = await articlesApi.getById(articleId);
          expect(deletedArticleResponse.status()).toBe(404);
        } else {
          expect(remainingArticleResponse.status()).toBe(404);
        }
      }
    }
  });
});
