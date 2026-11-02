import type { APIRequestContext, APIResponse } from '@playwright/test';

export class PostsApi {
  constructor(private readonly request: APIRequestContext) {}

  getById(id: number): Promise<APIResponse> {
    return this.request.get(`/posts/${id}`);
  }
}
