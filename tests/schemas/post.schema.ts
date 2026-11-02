import Ajv, { type JSONSchemaType } from 'ajv';

export type PostResponse = {
  id: number;
  userId: number;
  title: string;
  body: string;
};

export const postSchema: JSONSchemaType<PostResponse> = {
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
const validatePost = ajv.compile(postSchema);

export function parsePostResponse(data: unknown): PostResponse {
  if (!validatePost(data)) {
    throw new Error(`Invalid Post response: ${ajv.errorsText(validatePost.errors)}`);
  }

  return data;
}
