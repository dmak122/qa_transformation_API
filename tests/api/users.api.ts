import type { APIRequestContext, APIResponse } from '@playwright/test';

export class UsersApi {
  constructor(private readonly request: APIRequestContext) {}

  getById(id: number): Promise<APIResponse> {
    return this.request.get(`/users/${id}`);
  }
}
