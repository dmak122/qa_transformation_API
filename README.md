# sb-API

Учебный проект для API-автоматизации на TypeScript и Playwright. Тесты работают с локальным JSON Server.

## Запуск

```bash
npm ci
npm test
npx tsc --noEmit
```

`npm test` запускает Playwright. Fixture автоматически поднимает локальный API для каждого worker и останавливает его после тестов. При параллельном запуске у каждого worker свой порт и временная копия начальных данных из `data/db.json`, поэтому изменения одного worker не влияют на тесты другого.

## Структура

```text
data/
  db.json                    Начальные данные локального API
tests/
  api/
    posts.api.ts             HTTP-методы ресурса Posts
    posts.read.spec.ts       Проверки чтения Posts
    posts.write.spec.ts      Проверки POST, PUT, PATCH и DELETE
    posts.crud.spec.ts       Независимый сквозной CRUD-сценарий
    users.api.ts             HTTP-методы ресурса Users
    users.spec.ts            Проверки Users
  data/
    posts-by-user.cases.ts   Набор данных для параметризованных GET-проверок
  fixtures/
    api.fixture.ts           Worker-серверы и тестовые API-клиенты
  helpers/
    add-test-description.ts  Описание теста в Playwright-отчёте
    api-request-options.ts   Общие baseURL и HTTP-заголовки
  schemas/
    post.schema.ts           JSON Schema и проверка ответа Post через Ajv
    user.schema.ts           JSON Schema и проверка вложенного ответа User через Ajv
playwright.config.ts         Конфигурация Playwright
```

## Как устроен API-слой

1. Worker-scoped fixture создаёт временную копию seed-данных и запускает JSON Server на свободном порту.
2. `apiRequest` создаёт `APIRequestContext` с URL этого worker и заголовком `Accept: application/json`.
3. API-клиенты инкапсулируют маршруты и HTTP-вызовы. Тесты проверяют статусы и содержимое ответов.
4. `parsePostResponse` проверяет контракт Post по JSON Schema и возвращает типизированный объект.

API локальный и предназначен для обучения; это не production-сервис. Изменения тестов не затрагивают исходный `data/db.json`.

## CI

GitHub Actions workflow `.github/workflows/api-tests.yml` запускает `npm ci` и `npm test` для push и pull request в `main`.

## Покрытие и ограничения

| Область | Проверки |
|---|---|
| `GET /posts/:id` | Существующий пост, JSON-заголовок и Post schema; отсутствующий или некорректный ID — `404` |
| `GET /posts?userId=...` | Data-driven фильтрация для двух пользователей из отдельного dataset; неизвестный пользователь — пустой массив |
| `POST /posts` | Создание и проверка ответа по Post schema |
| `PUT /posts/:id` | Полное обновление и проверка ответа по Post schema; отсутствующий ID — `404` и ресурс не создаётся |
| `PATCH /posts/:id` | Частичное обновление; проверка сохранения остальных полей после повторного GET; отсутствующий ID — `404` и ресурс не создаётся |
| `DELETE /posts/:id` | Успешный ответ и удаление ресурса |
| CRUD workflow | Создание, чтение по ID и через коллекцию, обновление, повторное чтение, удаление и проверка отсутствия в обоих endpoints |
| `GET /users/:id` | User schema для `id`, вложенных `address.geo` и `company` |

Тесты запускаются параллельно с изолированной базой на worker. Создаваемые сценариями записи используют уникальные данные и удаляются после проверок.

Текущий локальный JSON Server предназначен для обучения и не реализует бизнес-валидацию, аутентификацию или авторизацию. Поэтому проверки неверных бизнес-данных и ответов `401`/`403` пока не покрыты; для них нужен API с соответствующими правилами и доступом.
