import { describe, expect, it } from 'vitest';
import { simulateBattle, typeEffectiveness } from '../src/domain/battleEngine';
import { Pokemon } from '../src/domain/types';

const pokemon = (overrides: Partial<Pokemon>): Pokemon => ({
  id: 1,
  num: '001',
  name: 'Testmon',
  type: ['Normal'],
  height: '1 m',
  weight: '10 kg',
  multipliers: [1],
  weaknesses: [],
  ...overrides,
});

describe('battle engine', () => {
  it('rewards type advantages', () => {
    const attacker = pokemon({ type: ['Fire'] });
    const defender = pokemon({ type: ['Grass'], weaknesses: ['Fire'] });

    expect(typeEffectiveness(attacker, defender)).toBe(1.5);
  });

  it('returns a detailed deterministic result', () => {
    const fireTeam = [pokemon({ name: 'Firemon', type: ['Fire'], id: 10 })];
    const grassTeam = [pokemon({ name: 'Grassmon', type: ['Grass'], weaknesses: ['Fire'], id: 11 })];

    const result = simulateBattle(fireTeam, grassTeam);
    expect(result.winner).toBe('Team A');
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0]).toHaveProperty('message');
  });
});