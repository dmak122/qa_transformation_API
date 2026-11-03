import Ajv, { type JSONSchemaType } from 'ajv';

export type ArticleResponse = {
  id: number;
  userId: number;
  title: string;
  body: string;
};

export const articleSchema: JSONSchemaType<ArticleResponse> = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    userId: { type: 'integer' },
    title: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['id', 'userId', 'title', 'body'],
};

const ajv = new Ajv({ allErrors: true });
const validateArticle = ajv.compile(articleSchema);

export function parseArticleResponse(data: unknown): ArticleResponse {
  if (!validateArticle(data)) {
    throw new Error(`Invalid Article response: ${ajv.errorsText(validateArticle.errors)}`);
  }

  return data;
}
