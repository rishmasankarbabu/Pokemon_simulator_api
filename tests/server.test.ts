import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/server';

describe('API validation', () => {
  it('applies security headers without exposing the framework', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('returns the health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('rejects a battle request with no body', async () => {
    const response = await request(app).post('/api/battles');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('teamA.pokemon and teamB.pokemon are required');
  });

  it('rejects a battle request with only one team', async () => {
    const response = await request(app)
      .post('/api/battles')
      .send({ teamA: { pokemon: [{ name: 'Pikachu' }] } });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('teamA.pokemon and teamB.pokemon are required');
  });

  it('rejects malformed team input', async () => {
    const response = await request(app)
      .post('/api/battles')
      .send({
        teamA: { pokemon: 'Pikachu' },
        teamB: { pokemon: [{ name: 'Charizard' }] },
      });

    expect(response.status).toBe(400);
  });

  it('rejects invalid pagination values', async () => {
    const response = await request(app).get('/api/pokemon?page=0&limit=101');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('limit must be between 1 and 100');
  });

  it('rejects an invalid Pokemon ID', async () => {
    const response = await request(app).get('/api/pokemon/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Pokemon ID must be a positive integer');
  });

  it('returns not found for an unsupported API route', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Route not found: GET /api/does-not-exist');
  });
});