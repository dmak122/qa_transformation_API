import { test as base, expect } from '@playwright/test';
import { PostsApi } from '../api/posts.api';

type ApiFixtures = {
  postsApi: PostsApi;
};

export const test = base.extend<ApiFixtures>({
  postsApi: async ({ request }, use) => {
    await use(new PostsApi(request));
  },
});

export { expect };
