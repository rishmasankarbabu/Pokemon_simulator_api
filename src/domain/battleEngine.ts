import { BattleResult, Pokemon } from './types';

interface Fighter {
  pokemon: Pokemon;
  health: number;
}

// Keep calculated values inside the supported effectiveness range.
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

// Extract the numeric part of values such as "1.7 m" or "69 kg".
const numericValue = (value: string): number => Number.parseFloat(value) || 0;

/** Calculates attack effectiveness from weaknesses and shared types. */
export function typeEffectiveness(attacker: Pokemon, defender: Pokemon): number {
  const advantages = attacker.type.filter((type) =>
    defender.weaknesses.some((weakness) => weakness.toLowerCase() === type.toLowerCase()),
  ).length;

  const resistance = attacker.type.some((type) =>
    defender.type.some((defenderType) => defenderType.toLowerCase() === type.toLowerCase()),
  );

  return clamp(1 + advantages * 0.5 - (resistance ? 0.25 : 0), 0.5, 2.5);
}

/** Calculates a Pokemon's base power from its dataset statistics. */
export function pokemonPower(pokemon: Pokemon): number {
  const height = numericValue(pokemon.height);
  const weight = numericValue(pokemon.weight);
  const multiplier = pokemon.multipliers?.length
    ? pokemon.multipliers.reduce((sum, value) => sum + value, 0) / pokemon.multipliers.length
    : 1;

  return 20 + pokemon.id * 0.2 + height * 5 + Math.sqrt(weight) * 2 + multiplier * 10;
}

/** Creates a fighter with health derived from the Pokemon's power. */
function createFighter(pokemon: Pokemon): Fighter {
  return { pokemon, health: Math.round(70 + pokemonPower(pokemon) * 1.5) };
}

/** Runs the deterministic, turn-based battle and builds its event log. */
export function simulateBattle(
  teamA: Pokemon[],
  teamB: Pokemon[],
  teamAName = 'Team A',
  teamBName = 'Team B',
): BattleResult {
  if (!teamA.length || !teamB.length) throw new Error('Both teams must contain at least one Pokemon');

  const fighters = [teamA.map(createFighter), teamB.map(createFighter)];
  const indexes = [0, 0];
  const score = { teamA: 0, teamB: 0 };
  const log = [] as BattleResult['log'];
  let round = 0;

  while (indexes[0] < fighters[0].length && indexes[1] < fighters[1].length) {
    const attackerTeam = round % 2;
    const defenderTeam = attackerTeam === 0 ? 1 : 0;
    const attacker = fighters[attackerTeam][indexes[attackerTeam]];
    const defender = fighters[defenderTeam][indexes[defenderTeam]];
    const effectiveness = typeEffectiveness(attacker.pokemon, defender.pokemon);
    const damage = Math.max(1, Math.round(pokemonPower(attacker.pokemon) * effectiveness * 0.18));

    defender.health = Math.max(0, defender.health - damage);
    round += 1;
    log.push({
      round,
      attacker: attacker.pokemon.name,
      defender: defender.pokemon.name,
      damage,
      effectiveness,
      defenderRemainingHealth: defender.health,
      message: `${attacker.pokemon.name} dealt ${damage} damage to ${defender.pokemon.name} (${effectiveness}x effectiveness).`,
    });

    if (defender.health === 0) {
      score[attackerTeam === 0 ? 'teamA' : 'teamB'] += 1;
      log.push({
        round,
        attacker: attacker.pokemon.name,
        defender: defender.pokemon.name,
        damage: 0,
        effectiveness,
        defenderRemainingHealth: 0,
        message: `${defender.pokemon.name} fainted.`,
      });
      indexes[defenderTeam] += 1;
    }
  }

  const teamAWon = indexes[1] >= fighters[1].length;
  return {
    winner: teamAWon ? teamAName : teamBName,
    loser: teamAWon ? teamBName : teamAName,
    score,
    rounds: round,
    log,
  };
}