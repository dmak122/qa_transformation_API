import { randomUUID } from 'node:crypto';
import { request as requestFactory, test, expect } from '@playwright/test';
import { RestfulBookerApi } from './restful-booker.api';

function getToken(data: unknown): string {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('token' in data) ||
    typeof data.token !== 'string' ||
    data.token.length === 0
  ) {
    throw new Error('POST /auth did not return a non-empty token.');
  }

  return data.token;
}

function getBookingId(data: unknown): number {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('bookingid' in data) ||
    typeof data.bookingid !== 'number'
  ) {
    throw new Error('POST /booking did not return a numeric bookingid.');
  }

  return data.bookingid;
}

test.describe('Restful Booker - authentication', () => {
  test('invalid credentials return a bad-credentials reason without a token', async ({ request }, testInfo) => {
    testInfo.annotations.push({
      type: 'description',
      description: 'Verifies that invalid credentials do not issue an authentication token.',
    });

    const api = new RestfulBookerApi(request);
    const response = await api.createToken('invalid-demo-user', 'invalid-demo-password');

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ reason: 'Bad credentials' });
  });

  test('PUT and DELETE require a valid token', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that PUT and DELETE without a token and PUT and DELETE with an invalid token are forbidden.',
    });

    const api = new RestfulBookerApi(request);
    const anonymousRequest = await requestFactory.newContext({
      baseURL:
        process.env.RESTFUL_BOOKER_BASE_URL ?? 'https://restful-booker.herokuapp.com',
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    const anonymousApi = new RestfulBookerApi(anonymousRequest);

    try {
      const authResponse = await api.createToken(username, password);
      expect(authResponse.status()).toBe(200);
      const token = getToken(await authResponse.json());

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const booking = {
        firstname: 'API test',
        lastname: randomUUID(),
        totalprice: 100,
        depositpaid: true,
        bookingdates: {
          checkin: tomorrow.toISOString().slice(0, 10),
          checkout: dayAfterTomorrow.toISOString().slice(0, 10),
        },
        additionalneeds: 'Automation test booking',
      };
      const createResponse = await api.createBooking(booking);
      const bookingId = getBookingId(await createResponse.json());
      let cleanupRequired = true;

      try {
        expect(createResponse.status()).toBe(200);

        const unauthorizedUpdateResponse = await anonymousApi.updateBooking(bookingId, {
          ...booking,
          firstname: 'Unauthorized update',
        });
        expect(unauthorizedUpdateResponse.status()).toBe(403);

        const bookingAfterUnauthorizedUpdate = await api.getBooking(bookingId);
        expect(bookingAfterUnauthorizedUpdate.status()).toBe(200);
        await expect(bookingAfterUnauthorizedUpdate.json()).resolves.toMatchObject(booking);

        const invalidTokenUpdateResponse = await anonymousApi.updateBooking(
          bookingId,
          {
            ...booking,
            firstname: 'Invalid-token update',
          },
          'invalid-demo-token',
        );
        expect(invalidTokenUpdateResponse.status()).toBe(403);

        const bookingAfterInvalidTokenUpdate = await api.getBooking(bookingId);
        expect(bookingAfterInvalidTokenUpdate.status()).toBe(200);
        await expect(bookingAfterInvalidTokenUpdate.json()).resolves.toMatchObject(booking);

        const invalidTokenDeleteResponse = await anonymousApi.deleteBooking(
          bookingId,
          'invalid-demo-token',
        );
        expect(invalidTokenDeleteResponse.status()).toBe(403);

        const bookingAfterInvalidTokenDelete = await api.getBooking(bookingId);
        expect(bookingAfterInvalidTokenDelete.status()).toBe(200);
        await expect(bookingAfterInvalidTokenDelete.json()).resolves.toMatchObject(booking);

        const unauthorizedDeleteResponse = await anonymousApi.deleteBooking(bookingId);
        expect(unauthorizedDeleteResponse.status()).toBe(403);

        const bookingAfterUnauthorizedDelete = await api.getBooking(bookingId);
        expect(bookingAfterUnauthorizedDelete.status()).toBe(200);
        await expect(bookingAfterUnauthorizedDelete.json()).resolves.toMatchObject(booking);

        const authorizedDeleteResponse = await api.deleteBooking(bookingId, token);
        expect(authorizedDeleteResponse.status()).toBe(201);

        const bookingAfterAuthorizedDelete = await api.getBooking(bookingId);
        expect(bookingAfterAuthorizedDelete.status()).toBe(404);
        cleanupRequired = false;
      } finally {
        if (cleanupRequired) {
          const remainingBooking = await api.getBooking(bookingId);

          if (remainingBooking.status() === 200) {
            const cleanupResponse = await api.deleteBooking(bookingId, token);
            expect(cleanupResponse.status()).toBe(201);

            const deletedBooking = await api.getBooking(bookingId);
            expect(deletedBooking.status()).toBe(404);
          } else {
            expect(remainingBooking.status()).toBe(404);
          }
        }
      }
    } finally {
      await anonymousRequest.dispose();
    }
  });

  test('DELETE accepts Basic Auth', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that Basic Auth can delete a test-owned booking as an alternative to the token cookie.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Basic Auth deletion test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const deleteResponse = await api.deleteBookingWithBasicAuth(
        bookingId,
        username,
        password,
      );
      expect(deleteResponse.status()).toBe(201);

      const deletedBookingResponse = await api.getBooking(bookingId);
      expect(deletedBookingResponse.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const cleanupResponse = await api.deleteBooking(bookingId, token);
          expect(cleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PUT updates a booking with a valid token', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that a valid token authorizes a booking update and that the update persists.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Authorized PUT test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updatedBooking = {
        ...booking,
        firstname: 'Updated API test',
      };
      const updateResponse = await api.updateBooking(bookingId, updatedBooking, token);
      expect(updateResponse.status()).toBe(200);

      const updatedBookingResponse = await api.getBooking(bookingId);
      expect(updatedBookingResponse.status()).toBe(200);
      await expect(updatedBookingResponse.json()).resolves.toMatchObject(updatedBooking);

      const deleteResponse = await api.deleteBooking(bookingId, token);
      expect(deleteResponse.status()).toBe(201);

      const deletedBookingResponse = await api.getBooking(bookingId);
      expect(deletedBookingResponse.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const cleanupResponse = await api.deleteBooking(bookingId, token);
          expect(cleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PUT updates a booking with Basic Auth', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that Basic Auth authorizes a booking update and that the update persists.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Basic Auth PUT test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updatedBooking = {
        ...booking,
        firstname: 'Updated Basic Auth test',
      };
      const updateResponse = await api.updateBookingWithBasicAuth(
        bookingId,
        updatedBooking,
        username,
        password,
      );
      expect(updateResponse.status()).toBe(200);

      const updatedBookingResponse = await api.getBooking(bookingId);
      expect(updatedBookingResponse.status()).toBe(200);
      await expect(updatedBookingResponse.json()).resolves.toMatchObject(updatedBooking);

      const deleteResponse = await api.deleteBooking(bookingId, token);
      expect(deleteResponse.status()).toBe(201);

      const deletedBookingResponse = await api.getBooking(bookingId);
      expect(deletedBookingResponse.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const cleanupResponse = await api.deleteBooking(bookingId, token);
          expect(cleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PUT rejects invalid Basic Auth credentials', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that invalid Basic Auth credentials cannot update a booking and that it remains unchanged.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Invalid Basic Auth PUT test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updateResponse = await api.updateBookingWithBasicAuth(
        bookingId,
        {
          ...booking,
          firstname: 'Unauthorized Basic Auth update',
        },
        'invalid-demo-user',
        'invalid-demo-password',
      );
      expect(updateResponse.status()).toBe(403);

      const bookingAfterRejectedUpdate = await api.getBooking(bookingId);
      expect(bookingAfterRejectedUpdate.status()).toBe(200);
      await expect(bookingAfterRejectedUpdate.json()).resolves.toMatchObject(booking);

      const cleanupResponse = await api.deleteBooking(bookingId, token);
      expect(cleanupResponse.status()).toBe(201);

      const deletedBooking = await api.getBooking(bookingId);
      expect(deletedBooking.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const fallbackCleanupResponse = await api.deleteBooking(bookingId, token);
          expect(fallbackCleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PATCH requires a valid token', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that PATCH without a token or with an invalid token is forbidden and leaves the booking unchanged.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Unauthorized PATCH test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const unauthorizedPatchResponse = await api.patchBooking(bookingId, {
        firstname: 'Unauthenticated PATCH',
      });
      expect(unauthorizedPatchResponse.status()).toBe(403);

      const bookingAfterUnauthorizedPatch = await api.getBooking(bookingId);
      expect(bookingAfterUnauthorizedPatch.status()).toBe(200);
      await expect(bookingAfterUnauthorizedPatch.json()).resolves.toMatchObject(booking);

      const invalidTokenPatchResponse = await api.patchBooking(
        bookingId,
        { firstname: 'Invalid-token PATCH' },
        'invalid-demo-token',
      );
      expect(invalidTokenPatchResponse.status()).toBe(403);

      const bookingAfterInvalidTokenPatch = await api.getBooking(bookingId);
      expect(bookingAfterInvalidTokenPatch.status()).toBe(200);
      await expect(bookingAfterInvalidTokenPatch.json()).resolves.toMatchObject(booking);

      const cleanupResponse = await api.deleteBooking(bookingId, token);
      expect(cleanupResponse.status()).toBe(201);

      const deletedBooking = await api.getBooking(bookingId);
      expect(deletedBooking.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const fallbackCleanupResponse = await api.deleteBooking(bookingId, token);
          expect(fallbackCleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PATCH updates only the supplied booking fields', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that PATCH with a valid token changes the supplied field while preserving the other booking fields.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Authorized PATCH test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updatedFields = { firstname: 'Updated API test' };
      const patchResponse = await api.patchBooking(bookingId, updatedFields, token);
      expect(patchResponse.status()).toBe(200);

      const updatedBookingResponse = await api.getBooking(bookingId);
      expect(updatedBookingResponse.status()).toBe(200);
      await expect(updatedBookingResponse.json()).resolves.toMatchObject({
        ...booking,
        ...updatedFields,
      });

      const deleteResponse = await api.deleteBooking(bookingId, token);
      expect(deleteResponse.status()).toBe(201);

      const deletedBookingResponse = await api.getBooking(bookingId);
      expect(deletedBookingResponse.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const cleanupResponse = await api.deleteBooking(bookingId, token);
          expect(cleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PATCH updates a booking with Basic Auth', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that Basic Auth authorizes a partial booking update and preserves fields not included in the request.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Basic Auth PATCH test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const updatedFields = { firstname: 'Updated Basic Auth test' };
      const patchResponse = await api.patchBookingWithBasicAuth(
        bookingId,
        updatedFields,
        username,
        password,
      );
      expect(patchResponse.status()).toBe(200);

      const updatedBookingResponse = await api.getBooking(bookingId);
      expect(updatedBookingResponse.status()).toBe(200);
      await expect(updatedBookingResponse.json()).resolves.toMatchObject({
        ...booking,
        ...updatedFields,
      });

      const deleteResponse = await api.deleteBooking(bookingId, token);
      expect(deleteResponse.status()).toBe(201);

      const deletedBookingResponse = await api.getBooking(bookingId);
      expect(deletedBookingResponse.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const cleanupResponse = await api.deleteBooking(bookingId, token);
          expect(cleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('PATCH rejects invalid Basic Auth credentials', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that invalid Basic Auth credentials cannot partially update a booking and that it remains unchanged.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Invalid Basic Auth PATCH test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const patchResponse = await api.patchBookingWithBasicAuth(
        bookingId,
        { firstname: 'Unauthorized Basic Auth PATCH' },
        'invalid-demo-user',
        'invalid-demo-password',
      );
      expect(patchResponse.status()).toBe(403);

      const bookingAfterRejectedPatch = await api.getBooking(bookingId);
      expect(bookingAfterRejectedPatch.status()).toBe(200);
      await expect(bookingAfterRejectedPatch.json()).resolves.toMatchObject(booking);

      const cleanupResponse = await api.deleteBooking(bookingId, token);
      expect(cleanupResponse.status()).toBe(201);

      const deletedBooking = await api.getBooking(bookingId);
      expect(deletedBooking.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const fallbackCleanupResponse = await api.deleteBooking(bookingId, token);
          expect(fallbackCleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });

  test('DELETE rejects invalid Basic Auth credentials', async ({ request }, testInfo) => {
    const username = process.env.RESTFUL_BOOKER_USERNAME;
    const password = process.env.RESTFUL_BOOKER_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Set RESTFUL_BOOKER_USERNAME and RESTFUL_BOOKER_PASSWORD to run external API tests.',
      );
    }

    testInfo.annotations.push({
      type: 'description',
      description:
        'Verifies that invalid Basic Auth credentials cannot delete a booking and that the owned booking is cleaned up.',
    });

    const api = new RestfulBookerApi(request);
    const authResponse = await api.createToken(username, password);
    expect(authResponse.status()).toBe(200);
    const token = getToken(await authResponse.json());

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const booking = {
      firstname: 'API test',
      lastname: randomUUID(),
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: tomorrow.toISOString().slice(0, 10),
        checkout: dayAfterTomorrow.toISOString().slice(0, 10),
      },
      additionalneeds: 'Invalid Basic Auth test',
    };
    const createResponse = await api.createBooking(booking);
    expect(createResponse.status()).toBe(200);
    const bookingId = getBookingId(await createResponse.json());
    let cleanupRequired = true;

    try {
      const deleteResponse = await api.deleteBookingWithBasicAuth(
        bookingId,
        'invalid-demo-user',
        'invalid-demo-password',
      );
      expect(deleteResponse.status()).toBe(403);

      const bookingAfterRejectedDelete = await api.getBooking(bookingId);
      expect(bookingAfterRejectedDelete.status()).toBe(200);
      await expect(bookingAfterRejectedDelete.json()).resolves.toMatchObject(booking);

      const cleanupResponse = await api.deleteBooking(bookingId, token);
      expect(cleanupResponse.status()).toBe(201);

      const deletedBooking = await api.getBooking(bookingId);
      expect(deletedBooking.status()).toBe(404);
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        const remainingBooking = await api.getBooking(bookingId);

        if (remainingBooking.status() === 200) {
          const fallbackCleanupResponse = await api.deleteBooking(bookingId, token);
          expect(fallbackCleanupResponse.status()).toBe(201);

          const deletedBooking = await api.getBooking(bookingId);
          expect(deletedBooking.status()).toBe(404);
        } else {
          expect(remainingBooking.status()).toBe(404);
        }
      }
    }
  });
});
