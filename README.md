# api-json-server

A powerful, feature-rich mock API server driven by a JSON spec. Designed for fast development, repeatable mock data, comprehensive testing, and clear API documentation.

## Highlights

- **JSON-driven spec** - Define endpoints, responses, and matching rules in a simple JSON file
- **Advanced matching** - Match requests by query params, body, headers, and cookies
- **Custom headers** - Set response headers with template support
- **CORS configuration** - Global and per-endpoint CORS settings
- **Faker integration** - Generate realistic fake data (names, emails, phone numbers, companies, dates, etc.)
- **Response templating** - Use request data (params, query, body) in responses
- **Variants** - Define alternate responses based on match rules
- **Request history** - Record and inspect all incoming requests for debugging
- **Variable delays** - Simulate realistic network latency with random delay ranges
- **Error simulation** - Control error rates and responses
- **OpenAPI/Swagger** - Auto-generated OpenAPI docs with built-in Swagger UI
- **Hot reload** - Auto-reload when spec file changes (with `--watch`)
- **Beautiful logging** - Color-coded, readable console output

## Installation

```bash
npm install
```

## Quick Start

1) Create a spec file (`mock.spec.json`):

```json
{
  "version": 1,
  "settings": {
    "delayMs": 0,
    "errorRate": 0
  },
  "endpoints": [
    {
      "method": "GET",
      "path": "/users/:id",
      "response": {
        "id": "{{params.id}}",
        "name": { "__faker": "person.fullName" },
        "email": { "__faker": "internet.email" },
        "avatar": { "__faker": "image.avatar" }
      }
    }
  ]
}
```

2) Start the server:

```bash
npm run dev -- serve --spec mock.spec.json
```

3) Test the endpoint:

```bash
curl "http://localhost:3000/users/42"
```

Response:
```json
{
  "id": "42",
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "avatar": "https://cloudflare-ipfs.com/ipfs/..."
}
```

## CLI

```bash
mockserve serve [options]
```

### Options

- `--spec <path>` - Path to the JSON spec file (default: `mock.spec.json`)
- `--port <number>` - Port to run the server on (default: `3000`)
- `--watch` / `--no-watch` - Auto-reload when spec changes (default: enabled)
- `--base-url <url>` - Public base URL for OpenAPI servers[] (e.g., `https://api.example.com`)
- `--log-format <format>` - Log format: `pretty` or `json` (default: `pretty`)
- `--log-level <level>` - Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `info`)

### Examples

```bash
# Start with custom port
mockserve serve --port 8080

# Use JSON logging format
mockserve serve --log-format json

# Disable auto-reload
mockserve serve --no-watch

# Set base URL for OpenAPI
mockserve serve --base-url https://api.mysite.com
```

## Spec Reference

The spec is validated by `mockserve.spec.schema.json`. It consists of:

```json
{
  "version": 1,
  "settings": { ... },
  "endpoints": [ ... ]
}
```

### Settings

Global settings that apply to all endpoints unless overridden:

```json
{
  "delayMs": 0,
  "errorRate": 0,
  "errorStatus": 500,
  "errorResponse": { "error": "Mock error" },
  "fakerSeed": 12345,
  "cors": {
    "origin": "*",
    "credentials": true
  }
}
```

#### Settings Fields

- **`delayMs`** (number): Fixed delay in milliseconds before responding
- **`errorRate`** (number): Probability (0.0-1.0) of returning an error response
- **`errorStatus`** (number): HTTP status code for simulated errors
- **`errorResponse`** (any): Response body when error is triggered (supports templates)
- **`fakerSeed`** (number, optional): Seed for deterministic faker data generation
- **`cors`** (object, optional): CORS configuration
  - `origin` (string | string[] | boolean): Allowed origins (`"*"`, `"https://example.com"`, or array)
  - `credentials` (boolean): Allow credentials
  - `methods` (string[]): Allowed HTTP methods
  - `allowedHeaders` (string[]): Allowed request headers
  - `exposedHeaders` (string[]): Exposed response headers
  - `maxAge` (number): Preflight cache duration in seconds

### Endpoints

Each endpoint defines a route with its matching rules and response behavior:

```json
{
  "method": "GET",
  "path": "/users/:id",
  "match": {
    "query": { "type": "premium" },
    "headers": { "Authorization": "Bearer token123" },
    "cookies": { "sessionId": "valid" }
  },
  "status": 200,
  "response": { ... },
  "headers": {
    "X-Custom-Header": "value",
    "Cache-Control": "no-cache"
  },
  "delay": { "min": 100, "max": 500 },
  "delayMs": 0,
  "errorRate": 0,
  "errorStatus": 500,
  "errorResponse": { "error": "Not found" },
  "variants": [ ... ]
}
```

#### Endpoint Fields

- **`method`** (string): HTTP method - `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- **`path`** (string): Route path with Fastify-style params (e.g., `/users/:id`)
- **`match`** (object, optional): Request matching rules (see [Match Rules](#match-rules))
- **`status`** (number): Default HTTP status code (default: `200`)
- **`response`** (any): Response body (supports templates)
- **`headers`** (object, optional): Custom response headers (supports templates in values)
- **`delay`** (object, optional): Variable delay range - `{ "min": 100, "max": 500 }`
- **`delayMs`** (number, optional): Fixed delay in milliseconds
- **`errorRate`** (number, optional): Error probability override
- **`errorStatus`** (number, optional): Error status override
- **`errorResponse`** (any, optional): Error response override
- **`variants`** (array, optional): Alternative responses with their own match rules

### Match Rules

Match rules determine if a request should be handled by an endpoint or variant. All specified match conditions must be satisfied.

```json
"match": {
  "query": { "type": "premium", "status": "active" },
  "body": { "email": "test@example.com" },
  "headers": { "Authorization": "Bearer secret" },
  "cookies": { "sessionId": "abc123" }
}
```

#### Match Fields

- **`query`** (object): Exact match for query parameters (strings, numbers, booleans)
- **`body`** (object): Exact match for top-level body fields
- **`headers`** (object): Case-insensitive exact match for headers
- **`cookies`** (object): Exact match for cookies

If a request doesn't satisfy the match rules, the server returns `404` with:
```json
{ "error": "No matching mock for request" }
```

### Variants

Variants provide alternative responses based on match rules. The **first matching variant wins**. If no variant matches, the endpoint's base response is used.

```json
"variants": [
  {
    "name": "admin user",
    "match": { "body": { "role": "admin" } },
    "status": 200,
    "response": { "ok": true, "role": "admin", "permissions": ["*"] },
    "headers": { "X-User-Role": "admin" }
  },
  {
    "name": "invalid credentials",
    "match": { "body": { "password": "wrong" } },
    "status": 401,
    "response": { "ok": false, "error": "Invalid credentials" }
  }
]
```

#### Variant Fields

- **`name`** (string, optional): Descriptive name for the variant
- **`match`** (object, optional): Match rules (same as endpoint-level)
- **`status`** (number, optional): HTTP status code
- **`response`** (any): Response body (supports templates)
- **`headers`** (object, optional): Custom response headers (overrides endpoint headers)
- **`delay`** / **`delayMs`** (optional): Delay overrides
- **`errorRate`**, **`errorStatus`**, **`errorResponse`** (optional): Error simulation overrides

### Response Templates

Responses support a powerful templating system combining static values, request data, faker directives, and array generation.

#### String Placeholders

Access request data using mustache-style placeholders:

```json
{
  "userId": "{{params.id}}",
  "searchType": "{{query.type}}",
  "userEmail": "{{body.email}}"
}
```

**Available contexts:**
- `{{params.name}}` - Path parameters
- `{{query.key}}` - Query string parameters
- `{{body.field}}` - Request body fields (supports nested paths like `{{body.user.name}}`)

#### Faker Directives

Generate realistic fake data using any `@faker-js/faker` method:

**Simple syntax:**
```json
{
  "name": { "__faker": "person.fullName" },
  "email": { "__faker": "internet.email" },
  "phone": { "__faker": "phone.number" },
  "company": { "__faker": "company.name" },
  "avatar": { "__faker": "image.avatar" },
  "birthdate": { "__faker": "date.birthdate" },
  "city": { "__faker": "location.city" }
}
```

**With arguments:**
```json
{
  "randomString": { "__faker": { "method": "string.alpha", "args": [16] } },
  "price": { "__faker": { "method": "number.float", "args": [{ "min": 10, "max": 100, "precision": 0.01 }] } }
}
```

**Deterministic output:**
Set `fakerSeed` in settings for consistent data across requests:
```json
{
  "settings": {
    "fakerSeed": 12345
  }
}
```

#### Repeat Directives

Generate arrays of items with random or fixed counts:

**Random count (min/max range):**
```json
{
  "users": {
    "__repeat": {
      "min": 10,
      "max": 15,
      "template": {
        "id": { "__faker": "string.uuid" },
        "name": { "__faker": "person.fullName" },
        "email": { "__faker": "internet.email" }
      }
    }
  }
}
```

**Fixed count:**
```json
{
  "tags": {
    "__repeat": {
      "count": 3,
      "template": { "__faker": "lorem.word" }
    }
  }
}
```

**Combining templates:**
```json
{
  "userId": "{{params.id}}",
  "orders": {
    "__repeat": {
      "min": 5,
      "max": 10,
      "template": {
        "orderId": { "__faker": "string.uuid" },
        "amount": { "__faker": { "method": "number.float", "args": [{ "min": 10, "max": 1000, "precision": 0.01 }] } },
        "status": { "__faker": { "method": "helpers.arrayElement", "args": [["pending", "shipped", "delivered"]] } }
      }
    }
  }
}
```

## Advanced Features

### Custom Response Headers

Set custom headers on responses, with support for templating:

```json
{
  "method": "GET",
  "path": "/api/data/:id",
  "response": { "data": "value" },
  "headers": {
    "X-Resource-ID": "{{params.id}}",
    "X-Request-Type": "{{query.type}}",
    "Cache-Control": "max-age=3600",
    "X-Custom-Header": "static-value"
  }
}
```

Variant headers override endpoint headers:

```json
{
  "method": "GET",
  "path": "/api/data",
  "headers": { "X-Source": "base" },
  "variants": [
    {
      "match": { "query": { "premium": "true" } },
      "response": { "data": "premium" },
      "headers": { "X-Source": "premium", "X-Tier": "gold" }
    }
  ]
}
```

### Variable Delays

Simulate realistic network latency with random delay ranges:

```json
{
  "method": "GET",
  "path": "/api/slow",
  "delay": { "min": 100, "max": 500 },
  "response": { "ok": true }
}
```

The server will wait a random duration between 100ms and 500ms before responding.

### Request History

All requests are automatically recorded and can be inspected via the history endpoint:

**View all requests:**
```bash
GET /__history
```

**Filter by endpoint:**
```bash
GET /__history?endpoint=/api/users
```

**Filter by method:**
```bash
GET /__history?method=POST
```

**Limit results:**
```bash
GET /__history?limit=10
```

**Clear history:**
```bash
DELETE /__history
```

**History entry format:**
```json
{
  "entries": [
    {
      "id": "uuid",
      "timestamp": "2026-01-18T14:30:00.000Z",
      "method": "POST",
      "url": "/api/users",
      "path": "/api/users",
      "query": {},
      "headers": { "content-type": "application/json" },
      "body": { "name": "John" },
      "statusCode": 201,
      "responseTime": 45
    }
  ],
  "total": 1
}
```

### CORS Configuration

Enable CORS globally or per-endpoint:

**Global CORS:**
```json
{
  "settings": {
    "cors": {
      "origin": "*",
      "credentials": true,
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "allowedHeaders": ["Content-Type", "Authorization"]
    }
  }
}
```

**Per-endpoint CORS:**
```json
{
  "method": "GET",
  "path": "/api/public",
  "cors": { "origin": "https://example.com" },
  "response": { "data": "public" }
}
```

### Error Simulation

Simulate random errors for reliability testing:

**Global error rate:**
```json
{
  "settings": {
    "errorRate": 0.1,
    "errorStatus": 503,
    "errorResponse": { "error": "Service temporarily unavailable" }
  }
}
```

**Per-endpoint error rate:**
```json
{
  "method": "GET",
  "path": "/api/unstable",
  "errorRate": 0.5,
  "errorStatus": 500,
  "errorResponse": { "error": "Internal server error" },
  "response": { "ok": true }
}
```

10% of requests will return the error response with the specified status code.

## Built-in Endpoints

mockserve provides several special endpoints for inspection and debugging:

- **`GET /health`** - Health check endpoint (returns `{ "ok": true }`)
- **`GET /__spec`** - View the loaded spec and metadata
- **`GET /__openapi.json`** - OpenAPI 3.0 specification in JSON format
- **`GET /__openapi.yaml`** - OpenAPI 3.0 specification in YAML format
- **`GET /docs`** - Interactive Swagger UI documentation
- **`GET /__history`** - View request history (supports filtering)
- **`DELETE /__history`** - Clear request history

## Examples

The `examples/` folder contains ready-to-use spec files demonstrating various features:

1. **`basic-crud.json`** - Simple CRUD operations with templating
2. **`auth-variants.json`** - Authentication with variants for different scenarios
3. **`users-faker.json`** - User list with faker-generated data and array ranges
4. **`companies-nested.json`** - Nested data structures with companies and employees
5. **`orders-and-matches.json`** - Complex matching with headers, cookies, and query params

Run any example:
```bash
mockserve serve --spec examples/users-faker.json
```

## Use Cases

### Development

Replace real backends during frontend development:
- No backend dependencies
- Instant API responses
- Test edge cases easily with variants
- Simulate network conditions with delays

### Testing

Create reliable, repeatable test environments:
- Deterministic data with `fakerSeed`
- Test error scenarios with `errorRate`
- Validate request/response flow with history
- Multiple test scenarios with variants

### Documentation

Auto-generated interactive API docs:
- OpenAPI/Swagger UI out of the box
- View all endpoints and response examples
- Test endpoints directly in the browser
- Export OpenAPI spec for tooling

### Demos & Prototypes

Quickly mock APIs for demos and prototypes:
- No coding required - just JSON
- Realistic data with faker
- Professional-looking APIs
- Easy to modify and iterate

## Schema Validation

Your spec file is validated against `mockserve.spec.schema.json`. Use JSON schema validation in your editor (VS Code, WebStorm, etc.) for autocomplete and error checking.

Add this to your spec file:
```json
{
  "$schema": "./mockserve.spec.schema.json",
  "version": 1,
  ...
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Watch tests
npm run test:watch

# Generate JSON schema from Zod spec
npm run schema:build
```

## Architecture

- **TypeScript** - Fully typed codebase with strict mode
- **Fastify** - Fast, low-overhead web framework
- **Zod** - Runtime schema validation
- **Faker** - Realistic fake data generation
- **Pino** - High-performance logging
- **Vitest** - Fast unit testing

## License

ISC

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code is properly typed (no `any`)
- Functions have JSDoc comments
- New features include tests and documentation

---

**Made with ❤️ for developers who need reliable mock APIs**
