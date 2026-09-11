import { Collection, MongoClient } from 'mongodb';
import { Pokemon, TeamPokemonInput } from '../domain/types';

export class PokemonRepository {
  private collection?: Collection<Pokemon>;

  /** Stores the MongoDB client and target database for this repository. */
  constructor(private readonly client: MongoClient, private readonly databaseName: string) {}

  /** Connects to MongoDB and selects the Pokemon collection. */
  async connect(): Promise<void> {
    await this.client.connect();
    this.collection = this.client.db(this.databaseName).collection<Pokemon>('pokemon');
  }

  /** Replaces all stored Pokemon with the supplied dataset. */
  async replaceAll(pokemon: Pokemon[]): Promise<void> {
    if (!this.collection) throw new Error('Repository is not connected');
    await this.collection.deleteMany({});
    if (pokemon.length) await this.collection.insertMany(pokemon);
  }

  /** Resolves input Pokemon IDs or names while preserving team order. */
  async findTeam(input: TeamPokemonInput[]): Promise<Pokemon[]> {
    if (!this.collection) throw new Error('Repository is not connected');

    const ids = input.flatMap((item) => (item.id ? [item.id] : []));
    const names = input.flatMap((item) => (item.name ? [item.name] : []));
    const records = await this.collection.find({
      $or: [{ id: { $in: ids } }, { name: { $in: names } }],
    }).toArray();
    const byKey = new Map(records.map((pokemon) => [pokemon.id, pokemon]));
    const byName = new Map(records.map((pokemon) => [pokemon.name.toLowerCase(), pokemon]));

    return input.map((item) => {
      const pokemon = item.id
        ? byKey.get(item.id)
        : item.name
          ? byName.get(item.name.toLowerCase())
          : undefined;

      if (!pokemon) throw new Error(`Pokemon not found: ${item.id ?? item.name ?? 'unknown'}`);
      return pokemon;
    });
  }

  /** Returns a filtered, paginated Pokemon list for browsing and search. */
  async listPokemon(
    name: string | undefined,
    type: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ items: Pokemon[]; total: number }> {
    if (!this.collection) throw new Error('Repository is not connected');

    const filter = {
      ...(name ? { name: { $regex: name, $options: 'i' } } : {}),
      ...(type ? { type: { $regex: `^${type}$`, $options: 'i' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  /** Finds one Pokemon by its numeric dataset ID. */
  async findById(id: number): Promise<Pokemon | null> {
    if (!this.collection) throw new Error('Repository is not connected');
    return this.collection.findOne({ id });
  }
}