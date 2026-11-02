import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/api.fixture';
import { addTestDescription } from '../helpers/add-test-description';
import { parsePostResponse } from '../schemas/post.schema';

test.describe('Posts API - write operations', () => {
  test('POST /posts creates a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that creating a post returns status 201 and the submitted fields.',
    );

    const newPost = {
      userId: 1,
      title: 'API test post',
      body: 'Created by the API test suite.',
    };
    const response = await postsApi.createPost(newPost);

    expect(response.status()).toBe(201);

    const post = parsePostResponse(await response.json());
    expect(post).toMatchObject(newPost);
  });

  test('PUT /posts/1 replaces a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that replacing a post returns status 200 and the submitted fields.',
    );

    const updatedPost = {
      userId: 1,
      title: 'Updated API test post',
      body: 'Replaced by the API test suite.',
    };
    const response = await postsApi.updatePost(1, updatedPost);

    expect(response.status()).toBe(200);

    const post = parsePostResponse(await response.json());
    expect(post).toMatchObject({
      ...updatedPost,
      id: 1,
    });
  });

  test('PUT /posts/999999 returns 404 and does not create a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that updating a post that does not exist returns 404 and leaves it absent.',
    );

    const response = await postsApi.updatePost(999999, {
      userId: 1,
      title: 'Post must not be created',
      body: 'The update target does not exist.',
    });

    expect(response.status()).toBe(404);

    const getResponse = await postsApi.getById(999999);
    expect(getResponse.status()).toBe(404);
  });

  test('PATCH /posts/1 updates the post title', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that PATCH updates only the submitted title and returns the post ID.',
    );

    const updatedFields = { title: 'Patched API test post' };
    const response = await postsApi.patchPost(1, updatedFields);

    expect(response.status()).toBe(200);

    const post = parsePostResponse(await response.json());
    expect(post).toMatchObject({
      ...updatedFields,
      id: 1,
    });
  });

  test('PATCH /posts/999999 returns 404 and does not create a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that partially updating a post that does not exist returns 404 and leaves it absent.',
    );

    const response = await postsApi.patchPost(999999, { title: 'Post must not be created' });

    expect(response.status()).toBe(404);

    const getResponse = await postsApi.getById(999999);
    expect(getResponse.status()).toBe(404);
  });

  test('PATCH preserves fields that are not included in the request', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that PATCH changes the title while preserving other fields in the stored post.',
    );

    const newPost = {
      userId: 1,
      title: `PATCH test ${randomUUID()}`,
      body: 'This body should remain unchanged.',
    };
    const createResponse = await postsApi.createPost(newPost);

    expect(createResponse.status()).toBe(201);
    const createdPost = parsePostResponse(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updatedTitle = `Updated ${newPost.title}`;
      const patchResponse = await postsApi.patchPost(createdPost.id, { title: updatedTitle });

      expect(patchResponse.status()).toBe(200);
      expect(parsePostResponse(await patchResponse.json())).toEqual({
        ...newPost,
        id: createdPost.id,
        title: updatedTitle,
      });

      const getResponse = await postsApi.getById(createdPost.id);
      expect(getResponse.status()).toBe(200);
      expect(parsePostResponse(await getResponse.json())).toEqual({
        ...newPost,
        id: createdPost.id,
        title: updatedTitle,
      });

      const deleteResponse = await postsApi.deleteById(createdPost.id);
      cleanupRequired = deleteResponse.status() !== 200;
      expect(deleteResponse.status()).toBe(200);

      const deletedPostResponse = await postsApi.getById(createdPost.id);
      expect(deletedPostResponse.status()).toBe(404);
    } finally {
      if (cleanupRequired) {
        const remainingPostResponse = await postsApi.getById(createdPost.id);

        if (remainingPostResponse.status() === 200) {
          const cleanupResponse = await postsApi.deleteById(createdPost.id);
          expect(cleanupResponse.status()).toBe(200);

          const deletedPostResponse = await postsApi.getById(createdPost.id);
          expect(deletedPostResponse.status()).toBe(404);
        } else {
          expect(remainingPostResponse.status()).toBe(404);
        }
      }
    }
  });

  test('DELETE /posts/1 deletes a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that deleting a post returns status 200 and an empty object.',
    );

    const response = await postsApi.deleteById(1);

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({});
  });
});
