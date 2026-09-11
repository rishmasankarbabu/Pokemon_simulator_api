export interface Pokemon {
  id: number;
  num: string;
  name: string;
  img?: string;
  type: string[];
  height: string;
  weight: string;
  multipliers: number[] | null;
  weaknesses: string[];
  [key: string]: unknown;
}

/** Identifies a Pokemon supplied in a battle request. */
export interface TeamPokemonInput {
  id?: number;
  name?: string;
}

/** Defines a team's display name and selected Pokemon. */
export interface BattleTeamInput {
  name?: string;
  pokemon: TeamPokemonInput[];
}

/** Defines the two teams required to start a battle. */
export interface BattleRequest {
  teamA: BattleTeamInput;
  teamB: BattleTeamInput;
}

/** Describes one attack or fainting event in the battle log. */
export interface BattleLogEntry {
  round: number;
  attacker: string;
  defender: string;
  damage: number;
  effectiveness: number;
  defenderRemainingHealth: number;
  message: string;
}

/** Contains the summary and complete log returned after a battle. */
export interface BattleResult {
  winner: string;
  loser: string;
  score: { teamA: number; teamB: number };
  rounds: number;
  log: BattleLogEntry[];
}