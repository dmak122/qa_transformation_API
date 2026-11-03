import Ajv, { type JSONSchemaType } from 'ajv';

export type UserResponse = {
  id: number;
  address: {
    street: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  company: {
    name: string;
  };
};

export const userSchema: JSONSchemaType<UserResponse> = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        geo: {
          type: 'object',
          properties: {
            lat: { type: 'string' },
            lng: { type: 'string' },
          },
          required: ['lat', 'lng'],
        },
      },
      required: ['street', 'geo'],
    },
    company: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
  },
  required: ['id', 'address', 'company'],
};

const ajv = new Ajv({ allErrors: true });
const validateUser = ajv.compile(userSchema);

export function parseUserResponse(data: unknown): UserResponse {
  if (!validateUser(data)) {
    throw new Error(`Invalid User response: ${ajv.errorsText(validateUser.errors)}`);
  }

  return data;
}
