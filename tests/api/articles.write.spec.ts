import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/api.fixture';
import { addTestDescription } from '../helpers/add-test-description';
import { parseArticleResponse } from '../schemas/article.schema';

test.describe('Articles API - write operations', () => {
  test('POST /articles creates an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that creating an article returns status 201 and the submitted fields.',
    );

    const newArticle = {
      userId: 1,
      title: 'API test article',
      body: 'Created by the API test suite.',
    };
    const response = await articlesApi.create(newArticle);

    expect(response.status()).toBe(201);

    const article = parseArticleResponse(await response.json());
    expect(article).toMatchObject(newArticle);
  });

  test('PUT /articles/1 replaces an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that replacing an article returns status 200 and the submitted fields.',
    );

    const updatedArticle = {
      userId: 1,
      title: 'Updated API test article',
      body: 'Replaced by the API test suite.',
    };
    const response = await articlesApi.replace(1, updatedArticle);

    expect(response.status()).toBe(200);

    const article = parseArticleResponse(await response.json());
    expect(article).toMatchObject({
      ...updatedArticle,
      id: 1,
    });
  });

  test('PUT /articles/999999 returns 404 and does not create an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that updating an article that does not exist returns 404 and leaves it absent.',
    );

    const response = await articlesApi.replace(999999, {
      userId: 1,
      title: 'Article must not be created',
      body: 'The update target does not exist.',
    });

    expect(response.status()).toBe(404);

    const getResponse = await articlesApi.getById(999999);
    expect(getResponse.status()).toBe(404);
  });

  test('PATCH /articles/1 updates the article title', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that PATCH updates only the submitted title and returns the article ID.',
    );

    const updatedFields = { title: 'Patched API test article' };
    const response = await articlesApi.updatePartial(1, updatedFields);

    expect(response.status()).toBe(200);

    const article = parseArticleResponse(await response.json());
    expect(article).toMatchObject({
      ...updatedFields,
      id: 1,
    });
  });

  test('PATCH /articles/999999 returns 404 and does not create an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that partially updating an article that does not exist returns 404 and leaves it absent.',
    );

    const response = await articlesApi.updatePartial(999999, { title: 'Article must not be created' });

    expect(response.status()).toBe(404);

    const getResponse = await articlesApi.getById(999999);
    expect(getResponse.status()).toBe(404);
  });

  test('PATCH preserves fields that are not included in the request', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that PATCH changes the title while preserving other fields in the stored article.',
    );

    const newArticle = {
      userId: 1,
      title: `PATCH test ${randomUUID()}`,
      body: 'This body should remain unchanged.',
    };
    const createResponse = await articlesApi.create(newArticle);

    expect(createResponse.status()).toBe(201);
    const createdArticle = parseArticleResponse(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updatedTitle = `Updated ${newArticle.title}`;
      const patchResponse = await articlesApi.updatePartial(createdArticle.id, { title: updatedTitle });

      expect(patchResponse.status()).toBe(200);
      expect(parseArticleResponse(await patchResponse.json())).toEqual({
        ...newArticle,
        id: createdArticle.id,
        title: updatedTitle,
      });

      const getResponse = await articlesApi.getById(createdArticle.id);
      expect(getResponse.status()).toBe(200);
      expect(parseArticleResponse(await getResponse.json())).toEqual({
        ...newArticle,
        id: createdArticle.id,
        title: updatedTitle,
      });

      const deleteResponse = await articlesApi.deleteById(createdArticle.id);
      cleanupRequired = deleteResponse.status() !== 200;
      expect(deleteResponse.status()).toBe(200);

      const deletedArticleResponse = await articlesApi.getById(createdArticle.id);
      expect(deletedArticleResponse.status()).toBe(404);
    } finally {
      if (cleanupRequired) {
        const remainingArticleResponse = await articlesApi.getById(createdArticle.id);

        if (remainingArticleResponse.status() === 200) {
          const cleanupResponse = await articlesApi.deleteById(createdArticle.id);
          expect(cleanupResponse.status()).toBe(200);

          const deletedArticleResponse = await articlesApi.getById(createdArticle.id);
          expect(deletedArticleResponse.status()).toBe(404);
        } else {
          expect(remainingArticleResponse.status()).toBe(404);
        }
      }
    }
  });

  test('DELETE /articles/1 deletes an article', async ({ articlesApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that deleting an article returns status 200 and an empty object.',
    );

    const response = await articlesApi.deleteById(1);

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({});
  });
});
