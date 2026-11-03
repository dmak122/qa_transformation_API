export type ApiRequestOptions = {
  baseURL: string;
  extraHTTPHeaders: Record<string, string>;
};

export function createApiRequestOptions(baseURL: string): ApiRequestOptions {
  return {
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  };
}
