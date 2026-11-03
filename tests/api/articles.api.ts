import type { APIRequestContext, APIResponse } from '@playwright/test';

export type CreateArticleRequest = {
  userId: number;
  title: string;
  body: string;
};

export type PatchArticleRequest = Partial<CreateArticleRequest>;

export class ArticlesApi {
  constructor(private readonly request: APIRequestContext) {}

  getById(id: number | string): Promise<APIResponse> {
    return this.request.get(`/articles/${id}`);
  }

  getByUserId(userId: number): Promise<APIResponse> {
    return this.request.get('/articles', { params: { userId } });
  }

  create(article: CreateArticleRequest): Promise<APIResponse> {
    return this.request.post('/articles', { data: article });
  }

  replace(id: number, article: CreateArticleRequest): Promise<APIResponse> {
    return this.request.put(`/articles/${id}`, { data: article });
  }

  updatePartial(id: number, article: PatchArticleRequest): Promise<APIResponse> {
    return this.request.patch(`/articles/${id}`, { data: article });
  }

  deleteById(id: number): Promise<APIResponse> {
    return this.request.delete(`/articles/${id}`);
  }
}
