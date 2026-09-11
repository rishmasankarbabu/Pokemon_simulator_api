# Pokemon Battle Simulator

## Project Overview

This project is a REST API that simulates a deterministic Pokemon battle between two teams. It reads Pokemon data from `input.json`, stores the data in MongoDB, and exposes endpoints for starting battles and browsing Pokemon details.

The simulator uses a custom battle system. It is not intended to reproduce the official Pokemon game mechanics. Instead, it demonstrates how a dataset can be loaded, queried, and used by application code to produce a repeatable result and a detailed event log.

The project is implemented in TypeScript and runs on Node.js. TypeScript interfaces define the structure of Pokemon records, battle requests, and battle responses, helping keep the API contracts clear and consistent. The application can be run directly in development with the TypeScript runner or compiled to JavaScript for production.

## Assignment Tasks

This assignment is intended to achieve the following:

- Create an API endpoint that simulates a Pokemon battle between two teams of Pokemon.
- Use factors such as type effectiveness and Pokemon statistics, including weight, height, and multipliers, to determine the winning team.
- Return a detailed battle log showing the flow of the battle.
- Design a custom battle system. The result does not need to follow the outcomes or mechanics of the official Pokemon games.

The project also includes supporting functionality for loading the dataset, looking up Pokemon by name or ID, validating requests, and testing invalid API calls.

## Technology Stack

- **TypeScript**: Adds static types and compiles the application source code.
- **Node.js**: Runs the server-side application.
- **Express**: Defines HTTP routes and handles JSON requests and responses.
- **MongoDB**: Stores the Pokemon dataset and supports Pokemon lookups and filtering.
- **MongoDB Node.js driver**: Connects the TypeScript application to MongoDB.
- **Vitest**: Runs unit and API validation tests.
- **Supertest**: Sends HTTP requests to the Express application during tests.
- **Docker and Docker Compose**: Run the API, MongoDB, and database seed process in containers.

## Project Structure

```text
src/
  server.ts                    Express application and API routes
  data/pokemonRepository.ts    MongoDB access and Pokemon queries
  domain/battleEngine.ts       Battle calculations and battle log creation
  domain/types.ts              TypeScript data contracts
  scripts/seed.ts              Loads input.json into MongoDB
tests/
  battleEngine.test.ts         Battle calculation tests
  server.test.ts               API validation and error-response tests
input.json                     Source Pokemon dataset
docker-compose.yml             Local MongoDB and API services
Dockerfile                     Multi-stage production container build
```

## How the Application Works

1. The seed script reads the Pokemon records from `input.json`.
2. The records are inserted into the MongoDB `pokemon` collection.
3. The API connects to the same database when the server starts.
4. A client sends two teams to `POST /api/battles` using Pokemon names or IDs.
5. The repository resolves those references to complete Pokemon records.
6. The battle engine creates fighters, calculates health and attack power, and alternates attacks between the teams.
7. The API returns the winner, loser, score, round count, and complete battle log.

## Custom Battle Rules

The battle engine intentionally uses simple, deterministic rules:

- **Pokemon power** is based on ID, numeric height, numeric weight, and the average value of the Pokemon's multipliers.
- **Starting health** is derived from the Pokemon's calculated power.
- **Type effectiveness** increases when an attacking type appears in the defender's weaknesses.
- **Shared types** apply a small resistance reduction.
- **Damage** is calculated from the attacker's power and type effectiveness, with a minimum damage of one.
- **Turns** alternate between Team A and Team B.
- **Fainting** removes the defeated Pokemon from the active position and allows the next Pokemon on that team to fight.
- **Winning** occurs when every Pokemon on one team has fainted.

Because the rules use no random values, the same two teams produce the same result each time.

## Security and Logging

### Security

The application applies the following security measures:

- Helmet adds standard HTTP security headers.
- The Express `X-Powered-By` header is disabled so the framework is not unnecessarily exposed.
- Battle team, Pokemon ID, and pagination input is validated before database lookups or battle simulation.
- Unexpected server errors return generic messages instead of database or internal error details.
- The application does not handle passwords, API keys, or user credentials. Database connection strings should be supplied through environment variables and must not be committed to source control.

Production deployments should additionally use HTTPS, restrict database access, and add authentication or rate limiting if required by the deployment environment.

### Logging

Every HTTP request is logged when it completes. Each request log includes:

- Request method, URL, response status, and request duration.
- An `OK` or `ERROR` outcome, based on whether the response status is below or above `400`.

For example:

```text
[request] OK GET /health 200 7ms
[request] ERROR POST /api/battles 400 2ms
```

The application also logs API startup failures and the number of Pokemon loaded by the seed script. Request bodies, passwords, tokens, connection strings, and other sensitive values are not logged.

Unexpected API, JSON parsing, and startup errors are also written to the terminal with the route or startup context, status code, error message, and stack trace. Clients receive a safe error response while the detailed diagnostic remains in the server logs.

## API Endpoints

### `GET /health`

Checks whether the API is available.

Response:

```json
{
  "status": "ok"
}
```

### `POST /api/battles`

Starts a battle between two teams. Each Pokemon can be identified by `name` or `id`.

Request:

```json
{
  "teamA": {
    "name": "Sun Team",
    "pokemon": [
      { "name": "Charizard" },
      { "name": "Arcanine" }
    ]
  },
  "teamB": {
    "name": "Garden Team",
    "pokemon": [
      { "name": "Venusaur" },
      { "name": "Exeggutor" }
    ]
  }
}
```

The response contains `winner`, `loser`, `score`, `rounds`, and `log`. Each log entry records the round, attacker, defender, damage, effectiveness, remaining health, and a readable message.

This endpoint must be called with `POST`. A `GET /api/battles` request returns `404` because there is no GET battle route.

### `GET /api/pokemon`

Lists Pokemon with optional filtering and pagination.

Query parameters:

- `name`: Case-insensitive partial name search.
- `type`: Case-insensitive type filter.
- `page`: Page number, starting at `1`. Defaults to `1`.
- `limit`: Number of records per page, from `1` to `100`. Defaults to `20`.

Examples:

```text
GET http://localhost:3000/api/pokemon?page=1&limit=10
GET http://localhost:3000/api/pokemon?name=char&limit=5
GET http://localhost:3000/api/pokemon?type=fire&page=1&limit=10
```

The response contains matching records in `data` and page information in `pagination`.

### `GET /api/pokemon/:id`

Returns complete details for one Pokemon by numeric dataset ID.

```text
GET http://localhost:3000/api/pokemon/6
```

An invalid ID returns `400`; a valid but unknown ID returns `404`.

## Run with Docker

```sh
docker compose up --build -d mongodb
docker compose run --rm seed
docker compose up -d api
```

The API is available at `http://localhost:3000`.

## Run locally

Start MongoDB, then run:

```sh
npm install
npm run seed
npm run dev
```

## Test with Postman

Start the API, then create the following requests in Postman.

### Check API health

- Method: `GET`
- URL: `http://localhost:3000/health`

Expected response:

```json
{
  "status": "ok"
}
```

### Simulate a battle by name

- Method: `POST`
- URL: `http://localhost:3000/api/battles`
- Header: `Content-Type: application/json`
- Body: `raw` -> `JSON`

```json
{
  "teamA": {
    "name": "Sun Team",
    "pokemon": [
      { "name": "Charizard" },
      { "name": "Arcanine" }
    ]
  },
  "teamB": {
    "name": "Garden Team",
    "pokemon": [
      { "name": "Venusaur" },
      { "name": "Exeggutor" }
    ]
  }
}
```

### Simulate a battle by ID

The API also accepts Pokemon IDs instead of names:

```json
{
  "teamA": {
    "name": "Team A",
    "pokemon": [{ "id": 6 }]
  },
  "teamB": {
    "name": "Team B",
    "pokemon": [{ "id": 3 }]
  }
}
```

The battle response contains the winning team, losing team, score, number of rounds, and battle log. Missing or invalid Pokemon return HTTP `400` with an error message.

## Future Improvements

If I had more time, I would add the following functionality:

- Support configurable battle rules, such as speed, critical hits, status effects, and special abilities.
- Add battle history so completed battles can be stored and retrieved later.
- Add user-created teams and team validation before starting a battle.
- Add request validation with clearer error messages for empty or duplicate teams.
- Add integration tests for the API, MongoDB repository, and Postman request scenarios.
- Add API documentation with an OpenAPI or Swagger specification.

## Checks

```sh
npm test
npm run build
```