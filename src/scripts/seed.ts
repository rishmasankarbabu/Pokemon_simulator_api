import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { Pokemon } from '../domain/types';
import { PokemonRepository } from '../data/pokemonRepository';

/** Loads input.json into MongoDB so the API can resolve Pokemon teams. */
async function main(): Promise<void> {
	const dataset = JSON.parse(await readFile('input.json', 'utf8')) as { pokemon: Pokemon[] };
	const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
	const repository = new PokemonRepository(client, process.env.MONGODB_DB ?? 'pokemon_battle');

  try {
    await repository.connect();
    await repository.replaceAll(dataset.pokemon);
    console.log(`Loaded ${dataset.pokemon.length} Pokemon into MongoDB.`);
  } finally {
    await client.close();
  }
}

// Report seeding failures through the process exit code for Docker and scripts.
main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});