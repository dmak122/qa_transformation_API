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
    articles.api.ts          HTTP methods for the Articles resource
    articles.read.spec.ts    Articles read tests
    articles.write.spec.ts   POST, PUT, PATCH, and DELETE tests
    articles.crud.spec.ts    Independent end-to-end CRUD scenario
    users.api.ts             HTTP methods for the Users resource
    users.spec.ts             Users tests
  external/
    restful-booker.api.ts    Client for the external Restful Booker API
    restful-booker.auth.spec.ts Authentication and authorization scenarios
  data/
    articles-by-user.cases.ts Dataset for parameterized GET tests
  fixtures/
    api.fixture.ts           Worker servers and test API clients
  helpers/
    add-test-description.ts  Adds descriptions to the Playwright report
    api-request-options.ts   Shared base URL and HTTP headers
  schemas/
    article.schema.ts        Article JSON Schema and Ajv validation
    user.schema.ts           User JSON Schema and nested-response validation
playwright.config.ts         Playwright configuration
playwright.external.config.ts Separate configuration for external API tests
```

## API Layer

1. A worker-scoped fixture creates a temporary copy of the seed data and starts JSON Server on an available port.
2. `apiRequest` creates an `APIRequestContext` with the worker's URL and the `Accept: application/json` header.
3. API clients encapsulate routes and HTTP requests. Tests verify response status codes and content.
4. `parseArticleResponse` validates an Article response against its JSON Schema and returns a typed object.

### Resource Path vs. HTTP Request

`/articles` is a resource path, not a complete request. A request combines an HTTP method with a URL and may also include headers and a body. For example:

```http
GET http://127.0.0.1:<worker-port>/articles/1
Accept: application/json
```

Here, `GET` is the method, `/articles/1` is the path to one article, and `Accept` is a header describing the desired response format. The query URL `GET /articles?userId=1` addresses the Articles collection and adds a filter. The local API client sends these requests; the `.spec.ts` test checks the responses.

The local API is for learning purposes and is not a production service. Test changes do not modify the original `data/db.json`.

## CI

The GitHub Actions workflow at `.github/workflows/api-tests.yml` runs `npm ci`, `npm run typecheck`, and `npm test` on pushes and pull requests targeting `main`. External API tests are intentionally excluded from CI because the public practice service may be unavailable or rate-limited.

## Coverage and Limitations

| Area | Coverage |
|---|---|
| `GET /articles/:id` | Existing article, JSON response header, and Article schema; missing or malformed ID returns `404` |
| `GET /articles?userId=...` | Data-driven filtering for two users from a separate dataset; an unknown user returns an empty array |
| `POST /articles` | Creates an article and validates the response against the Article schema |
| `PUT /articles/:id` | Replaces an article and validates the response against the Article schema; a missing ID returns `404` and does not create a resource |
| `PATCH /articles/:id` | Partially updates an article; verifies other fields persist after a follow-up GET; a missing ID returns `404` and does not create a resource |
| `DELETE /articles/:id` | Successful response and resource deletion |
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
