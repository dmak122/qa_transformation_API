import { expect, test } from '../fixtures/api.fixture';
import { addTestDescription } from '../helpers/add-test-description';
import { parseUserResponse } from '../schemas/user.schema';

test.describe('Users API', () => {
  test('GET /users/1 returns nested user details', async ({ usersApi }, testInfo) => {
    addTestDescription(
      testInfo,
      'Verifies the user response includes address and company data in nested objects.',
    );

    const response = await usersApi.getById(1);

    expect(response.status()).toBe(200);

    const user = parseUserResponse(await response.json());
    expect(user).toMatchObject({
      id: 1,
      address: {
        street: expect.any(String),
        geo: {
          lat: expect.any(String),
          lng: expect.any(String),
        },
      },
      company: {
        name: expect.any(String),
      },
    });
  });
});
