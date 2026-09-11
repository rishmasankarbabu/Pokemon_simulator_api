import { MongoClient } from 'mongodb';
import { createApp } from './app';
import { PokemonRepository } from './data/pokemonRepository';

const mongoClient = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
const repository = new PokemonRepository(mongoClient, process.env.MONGODB_DB ?? 'pokemon_battle');
const app = createApp(repository);
const port = Number(process.env.PORT ?? 3000);

/** Connects to MongoDB and starts the HTTP server. */
async function startServer(): Promise<void> {
  try {
    await repository.connect();
    app.listen(port, () => console.log(`Pokemon battle API listening on port ${port}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[error] startup: ${message}`);
    if (error instanceof Error && error.stack) console.error(error.stack);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void startServer();
}

export { app };
