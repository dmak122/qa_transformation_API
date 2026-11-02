import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/api.fixture';
import { addTestDescription } from '../helpers/add-test-description';
import { parsePostResponse } from '../schemas/post.schema';

test.describe('Posts API - CRUD flow', () => {
  test('creates, reads, updates, and deletes a post', async ({ postsApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies that a post can be created, retrieved, updated, and deleted independently.',
    );

    const newPost = {
      userId: 1,
      title: `CRUD test ${randomUUID()}`,
      body: 'Created during a CRUD flow test.',
    };
    const createResponse = await postsApi.createPost(newPost);

    expect(createResponse.status()).toBe(201);

    const createdPost = parsePostResponse(await createResponse.json());
    expect(createdPost).toMatchObject(newPost);

    const postId = createdPost.id;
    let cleanupRequired = true;

    try {
      const getResponse = await postsApi.getById(postId);
      expect(getResponse.status()).toBe(200);
      const retrievedPost = parsePostResponse(await getResponse.json());
      expect(retrievedPost).toMatchObject({
        ...newPost,
        id: postId,
      });

      const postsByUserResponse = await postsApi.getByUserId(newPost.userId);
      expect(postsByUserResponse.status()).toBe(200);
      const postsByUser: unknown = await postsByUserResponse.json();
      expect(Array.isArray(postsByUser)).toBe(true);
      if (!Array.isArray(postsByUser)) {
        throw new Error('Expected GET /posts?userId=1 to return an array.');
      }

      expect(postsByUser.map((post: unknown) => parsePostResponse(post))).toContainEqual(
        expect.objectContaining({ id: postId, ...newPost }),
      );

      const updatedPost = {
        ...newPost,
        title: `Updated ${newPost.title}`,
      };
      const updateResponse = await postsApi.updatePost(postId, updatedPost);
      expect(updateResponse.status()).toBe(200);
      const updateResponsePost = parsePostResponse(await updateResponse.json());
      expect(updateResponsePost).toMatchObject({
        ...updatedPost,
        id: postId,
      });

      const updatedGetResponse = await postsApi.getById(postId);
      expect(updatedGetResponse.status()).toBe(200);
      const updatedPostResponse = parsePostResponse(await updatedGetResponse.json());
      expect(updatedPostResponse).toMatchObject({
        ...updatedPost,
        id: postId,
      });

      const deleteResponse = await postsApi.deleteById(postId);
      cleanupRequired = deleteResponse.status() !== 200;
      expect(deleteResponse.status()).toBe(200);
      await expect(deleteResponse.json()).resolves.toEqual({});

      const deletedGetResponse = await postsApi.getById(postId);
      expect(deletedGetResponse.status()).toBe(404);

      const postsAfterDeleteResponse = await postsApi.getByUserId(newPost.userId);
      expect(postsAfterDeleteResponse.status()).toBe(200);
      const postsAfterDelete: unknown = await postsAfterDeleteResponse.json();
      expect(Array.isArray(postsAfterDelete)).toBe(true);
      if (!Array.isArray(postsAfterDelete)) {
        throw new Error('Expected GET /posts?userId=1 to return an array.');
      }

      expect(
        postsAfterDelete
          .map((post: unknown) => parsePostResponse(post))
          .some((post) => post.id === postId),
      ).toBe(false);
    } finally {
      if (cleanupRequired) {
        const remainingPostResponse = await postsApi.getById(postId);

        if (remainingPostResponse.status() === 200) {
          const cleanupResponse = await postsApi.deleteById(postId);
          expect(cleanupResponse.status()).toBe(200);

          const deletedPostResponse = await postsApi.getById(postId);
          expect(deletedPostResponse.status()).toBe(404);
        } else {
          expect(remainingPostResponse.status()).toBe(404);
        }
      }
    }
  });
});
