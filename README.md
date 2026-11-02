# sb-API

An API automation learning project built with TypeScript and Playwright. Tests run against a local JSON Server.

## Getting Started

```bash
npm ci
npm test
npm run typecheck
```

`npm test` runs Playwright. A fixture automatically starts a local API server for each worker and stops it after the tests finish. Each worker gets its own port and a temporary copy of the seed data from `data/db.json`, so changes made by one worker do not affect another.

## Project Structure

```text
data/
  db.json                    Seed data for the local API
tests/
  api/
    posts.api.ts             HTTP methods for the Posts resource
    posts.read.spec.ts       Posts read tests
    posts.write.spec.ts      POST, PUT, PATCH, and DELETE tests
    posts.crud.spec.ts       Independent end-to-end CRUD scenario
    users.api.ts             HTTP methods for the Users resource
    users.spec.ts            Users tests
  external/
    restful-booker.api.ts    Client for the external Restful Booker API
    restful-booker.auth.spec.ts Authentication and authorization scenarios
  data/
    posts-by-user.cases.ts   Dataset for parameterized GET tests
  fixtures/
    api.fixture.ts           Worker servers and test API clients
  helpers/
    add-test-description.ts  Adds descriptions to the Playwright report
    api-request-options.ts   Shared base URL and HTTP headers
  schemas/
    post.schema.ts           Post JSON Schema and Ajv validation
    user.schema.ts           User JSON Schema and nested-response validation
playwright.config.ts         Playwright configuration
playwright.external.config.ts Separate configuration for external API tests
```

## API Layer

1. A worker-scoped fixture creates a temporary copy of the seed data and starts JSON Server on an available port.
2. `apiRequest` creates an `APIRequestContext` with the worker's URL and the `Accept: application/json` header.
3. API clients encapsulate routes and HTTP requests. Tests verify response status codes and content.
4. `parsePostResponse` validates a Post response against its JSON Schema and returns a typed object.

The local API is for learning purposes and is not a production service. Test changes do not modify the original `data/db.json`.

## CI

The GitHub Actions workflow at `.github/workflows/api-tests.yml` runs `npm ci`, `npm run typecheck`, and `npm test` on pushes and pull requests targeting `main`. External API tests are intentionally excluded from CI because the public practice service may be unavailable or rate-limited.

## Coverage and Limitations

| Area | Coverage |
|---|---|
| `GET /posts/:id` | Existing post, JSON response header, and Post schema; missing or malformed ID returns `404` |
| `GET /posts?userId=...` | Data-driven filtering for two users from a separate dataset; an unknown user returns an empty array |
| `POST /posts` | Creates a post and validates the response against the Post schema |
| `PUT /posts/:id` | Replaces a post and validates the response against the Post schema; a missing ID returns `404` and does not create a resource |
| `PATCH /posts/:id` | Partially updates a post; verifies other fields persist after a follow-up GET; a missing ID returns `404` and does not create a resource |
| `DELETE /posts/:id` | Successful response and resource deletion |
| CRUD workflow | Creates, reads by ID and from the collection, updates, reads again, deletes, and verifies absence from both endpoints |
| `GET /users/:id` | User schema for `id`, nested `address.geo`, and `company` |

Tests run in parallel with a separate database for each worker. Scenarios that create records use unique data and remove those records after verification.

The local JSON Server does not implement business validation, authentication, or authorization. Invalid business data and `401`/`403` responses are therefore not covered; those scenarios require an API that implements the corresponding rules and access controls.

## External API Practice

The optional Restful Booker authentication tests are kept separate from the local suite. They verify that invalid credentials return `{"reason":"Bad credentials"}` without a token, that PUT, PATCH, and DELETE reject missing or invalid token credentials, that PUT, PATCH, and DELETE accept valid Basic Auth, and that PUT, PATCH, and DELETE reject invalid Basic Auth. PUT/PATCH updates are verified with a follow-up GET. Tests use unique bookings and clean up only the bookings they create.

Set `RESTFUL_BOOKER_USERNAME` and `RESTFUL_BOOKER_PASSWORD` before running the external test. The API's documented demo credentials may be used for practice; do not put credentials in source code.

```powershell
$env:RESTFUL_BOOKER_USERNAME = "your-demo-username"
$env:RESTFUL_BOOKER_PASSWORD = "your-demo-password"
npm run test:external
```

External API availability and rate limits may vary. These tests are not included in `npm test` or the regular CI workflow.
