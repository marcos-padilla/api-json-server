# mockserve

A mock API server driven by a JSON spec. It is designed for fast development, repeatable mock data, and clear documentation with OpenAPI output and Swagger UI.

## Highlights

- JSON spec defines endpoints, responses, and matching rules.
- Built-in templating for request params, query, and body.
- Faker-powered data generation with arrays and ranges.
- Variants with match rules for alternate responses.
- Error and latency simulation.
- OpenAPI JSON/YAML plus Swagger UI out of the box.

## Installation

```
npm install
```

## Quick Start

1) Create a spec file (example `mock.spec.json`):

```
{
  "version": 1,
  "settings": {
    "delayMs": 0,
    "errorRate": 0,
    "errorStatus": 500,
    "errorResponse": { "error": "Mock error" }
  },
  "endpoints": [
    {
      "method": "GET",
      "path": "/users/:id",
      "response": {
        "id": "{{params.id}}",
        "type": "{{query.type}}"
      }
    }
  ]
}
```

2) Start the server:

```
npm run dev -- serve --spec mock.spec.json
```

3) Test the endpoint:

```
curl "http://localhost:3000/users/42?type=basic"
```

## CLI

```
mockserve serve --spec mock.spec.json --port 3000 --watch
```

Options:

- `--spec <path>`: Path to the JSON spec (default `mock.spec.json`).
- `--port <number>`: Port to run on (default `3000`).
- `--watch` / `--no-watch`: Reload when spec changes (default: watch enabled).
- `--base-url <url>`: Base URL used in OpenAPI `servers[]`.

## Spec Reference

The spec is validated by `mockserve.spec.schema.json`. It is composed of:

```
{
  "version": 1,
  "settings": { ... },
  "endpoints": [ ... ]
}
```

### Settings

```
{
  "delayMs": 0,
  "errorRate": 0,
  "errorStatus": 500,
  "errorResponse": { "error": "Mock error" },
  "fakerSeed": 123
}
```

- `delayMs`: Adds artificial latency in milliseconds.
- `errorRate`: Probability of returning `errorResponse` (0.0 to 1.0).
- `errorStatus`: HTTP status code for errors.
- `errorResponse`: Response used when errors are triggered (supports templates).
- `fakerSeed`: Optional seed for deterministic faker output.

### Endpoints

```
{
  "method": "GET",
  "path": "/users/:id",
  "match": { "query": { "type": "premium" } },
  "status": 200,
  "response": { ... },
  "delayMs": 0,
  "errorRate": 0,
  "errorStatus": 500,
  "errorResponse": { "error": "Mock error" },
  "variants": [ ... ]
}
```

- `method`: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- `path`: Fastify style params (`/users/:id`).
- `match`: Optional match rules (query and body).
- `status`: Default status (default `200`).
- `response`: Response body template.
- `delayMs`, `errorRate`, `errorStatus`, `errorResponse`: Optional overrides per endpoint.
- `variants`: Optional array of alternative responses with their own match rules.

### Match Rules

```
"match": {
  "query": { "type": "premium" },
  "body": { "password": "secret" }
}
```

Matching is exact at the top level (strings, numbers, booleans). If a request does not satisfy match rules, the endpoint returns a `404` with `{ "error": "No matching mock for request" }`.

### Variants

Variants let you specify alternate responses based on match rules. The first matching variant wins.

```
"variants": [
  {
    "name": "invalid password",
    "match": { "body": { "password": "wrong" } },
    "status": 401,
    "response": { "ok": false, "error": "Invalid credentials" }
  }
]
```

### Response Templates

Responses support a mix of static values, request placeholders, faker directives, and repeat directives.

#### String placeholders

- `{{params.id}}`
- `{{query.type}}`
- `{{body.email}}`

```
{
  "id": "{{params.id}}",
  "type": "{{query.type}}",
  "email": "{{body.email}}"
}
```

#### Faker directives

Use any `@faker-js/faker` method via a dotted path:

```
{ "__faker": "person.firstName" }
{ "__faker": "internet.email" }
{ "__faker": { "method": "string.alpha", "args": [16] } }
```

#### Repeat directives

Repeat directives generate arrays of items:

```
{
  "__repeat": {
    "min": 10,
    "max": 15,
    "template": { "id": { "__faker": "string.uuid" } }
  }
}
```

You can also use a fixed `count`:

```
{
  "__repeat": {
    "count": 3,
    "template": { "name": { "__faker": "company.name" } }
  }
}
```

Notes:

- If `count` is provided, it is used as-is.
- If `min` is omitted, it defaults to `0`.
- If `max` is missing, `min` is used.
- If `max < min`, the server returns a `500` error.

## Example: Users List with Faker

```
{
  "method": "GET",
  "path": "/users",
  "response": {
    "users": {
      "__repeat": {
        "min": 10,
        "max": 15,
        "template": {
          "id": { "__faker": "string.uuid" },
          "firstName": { "__faker": "person.firstName" },
          "lastName": { "__faker": "person.lastName" },
          "avatarUrl": { "__faker": "image.avatar" },
          "phone": { "__faker": "phone.number" },
          "email": { "__faker": "internet.email" },
          "company": { "__faker": "company.name" },
          "joinedAt": { "__faker": { "method": "date.recent", "args": [30] } }
        }
      }
    }
  }
}
```

## OpenAPI and Swagger UI

Endpoints available:

- `GET /__openapi.json`
- `GET /__openapi.yaml`
- `GET /docs`
- `GET /__spec`
- `GET /health`

`/docs` serves Swagger UI backed by the generated OpenAPI document.

## Examples Folder

See `examples/` for ready-to-use specs:

- `examples/basic-crud.json`
- `examples/auth-variants.json`
- `examples/users-faker.json`
- `examples/companies-nested.json`
- `examples/orders-and-matches.json`

## Programmatic Usage

```
import { buildServer } from "./dist/server.js";
import { loadSpecFromFile } from "./dist/loadSpec.js";

const spec = await loadSpecFromFile("mock.spec.json");
const app = buildServer(spec, { specPath: "mock.spec.json", loadedAt: new Date().toISOString() });
await app.listen({ port: 3000 });
```

## Running Tests

```
npm test
```

## Tips

- Use `fakerSeed` for deterministic outputs in demos and tests.
- Combine placeholders with faker for realistic and contextual data.
- Keep variant rules specific; the first match wins.

## License

ISC
