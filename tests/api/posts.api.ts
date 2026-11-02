import type { APIRequestContext, APIResponse } from '@playwright/test';

export type CreatePostRequest = {
  userId: number;
  title: string;
  body: string;
};

export type PatchPostRequest = Partial<CreatePostRequest>;

export class PostsApi {
  constructor(private readonly request: APIRequestContext) {}

  getById(id: number | string): Promise<APIResponse> {
    return this.request.get(`/posts/${id}`);
  }

  getByUserId(userId: number): Promise<APIResponse> {
    return this.request.get('/posts', { params: { userId } });
  }

  createPost(post: CreatePostRequest): Promise<APIResponse> {
    return this.request.post('/posts', { data: post });
  }

  updatePost(id: number, post: CreatePostRequest): Promise<APIResponse> {
    return this.request.put(`/posts/${id}`, { data: post });
  }

  patchPost(id: number, post: PatchPostRequest): Promise<APIResponse> {
    return this.request.patch(`/posts/${id}`, { data: post });
  }

  deleteById(id: number): Promise<APIResponse> {
    return this.request.delete(`/posts/${id}`);
  }
}
