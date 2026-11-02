import type { APIRequestContext, APIResponse } from '@playwright/test';

export type BookingRequest = {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: {
    checkin: string;
    checkout: string;
  };
  additionalneeds: string;
};

export class RestfulBookerApi {
  constructor(private readonly request: APIRequestContext) {}

  createToken(username: string, password: string): Promise<APIResponse> {
    return this.request.post('/auth', { data: { username, password } });
  }

  createBooking(booking: BookingRequest): Promise<APIResponse> {
    return this.request.post('/booking', { data: booking });
  }

  getBooking(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  updateBooking(id: number, booking: BookingRequest, token?: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data: booking,
      headers: token ? { Cookie: `token=${token}` } : {},
    });
  }

  updateBookingWithBasicAuth(
    id: number,
    booking: BookingRequest,
    username: string,
    password: string,
  ): Promise<APIResponse> {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return this.request.put(`/booking/${id}`, {
      data: booking,
      headers: { Authorization: `Basic ${credentials}` },
    });
  }

  patchBooking(
    id: number,
    booking: Partial<BookingRequest>,
    token?: string,
  ): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, {
      data: booking,
      headers: token ? { Cookie: `token=${token}` } : {},
    });
  }

  patchBookingWithBasicAuth(
    id: number,
    booking: Partial<BookingRequest>,
    username: string,
    password: string,
  ): Promise<APIResponse> {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return this.request.patch(`/booking/${id}`, {
      data: booking,
      headers: { Authorization: `Basic ${credentials}` },
    });
  }

  deleteBooking(id: number, token?: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: token ? { Cookie: `token=${token}` } : {},
    });
  }

  deleteBookingWithBasicAuth(
    id: number,
    username: string,
    password: string,
  ): Promise<APIResponse> {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return this.request.delete(`/booking/${id}`, {
      headers: { Authorization: `Basic ${credentials}` },
    });
  }
}
