import express from 'express';
import helmet from 'helmet';
import { simulateBattle } from './domain/battleEngine';
import { BattleRequest } from './domain/types';
import { PokemonRepository } from './data/pokemonRepository';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function logUnexpectedError(error: unknown, request?: express.Request, statusCode?: number): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;
  const route = request ? `${request.method} ${request.originalUrl}` : 'startup';
  const status = statusCode ? ` ${statusCode}` : '';

  console.error(`[error] ${route}${status}: ${message}`);
  if (stack) console.error(stack);
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function parsePagination(query: express.Request['query']): { page: number; limit: number } | null {
  const page = Number(query.page ?? DEFAULT_PAGE);
  const limit = Number(query.limit ?? DEFAULT_LIMIT);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return null;
  }

  return { page, limit };
}

function isValidTeamPokemon(value: unknown): boolean {
  return Array.isArray(value)
    && value.length > 0
    && value.every((pokemon) => {
      if (!pokemon || typeof pokemon !== 'object') return false;

      const candidate = pokemon as { id?: unknown; name?: unknown };
      const hasValidId = typeof candidate.id === 'number'
        && Number.isInteger(candidate.id)
        && candidate.id > 0;
      const hasValidName = typeof candidate.name === 'string' && candidate.name.trim().length > 0;

      return hasValidId || hasValidName;
    });
}

export function createApp(repository: PokemonRepository): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());

  app.use((request, response, next) => {
    const startedAt = Date.now();

    response.on('finish', () => {
      const outcome = response.statusCode >= 400 ? 'ERROR' : 'OK';
      console.log(
        `[request] ${outcome} ${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`,
      );
    });

    next();
  });

  app.use(express.json());

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));

  app.get('/api/pokemon', async (request, response) => {
    try {
      const pagination = parsePagination(request.query);

      if (!pagination) {
        return response.status(400).json({ error: 'page must be at least 1 and limit must be between 1 and 100' });
      }

      const result = await repository.listPokemon(
        queryString(request.query.name),
        queryString(request.query.type),
        pagination.page,
        pagination.limit,
      );
      return response.json({
        data: result.items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      });
    } catch (error) {
      logUnexpectedError(error, request, 500);
      return response.status(500).json({ error: 'Could not list Pokemon' });
    }
  });

  app.get('/api/pokemon/:id', async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return response.status(400).json({ error: 'Pokemon ID must be a positive integer' });
    }

    try {
      const pokemon = await repository.findById(id);
      return pokemon ? response.json(pokemon) : response.status(404).json({ error: `Pokemon not found: ${id}` });
    } catch (error) {
      logUnexpectedError(error, request, 500);
      return response.status(500).json({ error: 'Could not find Pokemon' });
    }
  });

  app.post('/api/battles', async (request, response) => {
    try {
      const body = request.body as BattleRequest;
      if (!body?.teamA?.pokemon || !body?.teamB?.pokemon) {
        return response.status(400).json({ error: 'teamA.pokemon and teamB.pokemon are required' });
      }
      if (!isValidTeamPokemon(body.teamA.pokemon) || !isValidTeamPokemon(body.teamB.pokemon)) {
        return response.status(400).json({ error: 'Each team must contain valid Pokemon names or IDs' });
      }

      const [teamA, teamB] = await Promise.all([
        repository.findTeam(body.teamA.pokemon),
        repository.findTeam(body.teamB.pokemon),
      ]);
      return response.json(simulateBattle(teamA, teamB, body.teamA.name, body.teamB.name));
    } catch (error) {
      const message = errorMessage(error, 'Battle failed');
      if (message.startsWith('Pokemon not found:')) {
        return response.status(400).json({ error: message });
      }

      logUnexpectedError(error, request, 500);
      return response.status(500).json({ error: 'Battle failed' });
    }
  });

  app.use((request, response) => {
    const message = `Route not found: ${request.method} ${request.originalUrl}`;
    console.error(`[error] ${message}`);
    return response.status(404).json({ error: message });
  });

  app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const isMalformedJson = error instanceof SyntaxError;
    const statusCode = isMalformedJson ? 400 : 500;
    const message = isMalformedJson ? 'Request body must contain valid JSON' : 'Internal server error';

    logUnexpectedError(error, request, statusCode);
    return response.status(statusCode).json({ error: message });
  });

  return app;
}