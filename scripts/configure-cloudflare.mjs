import { readFile, writeFile } from 'node:fs/promises';

const databaseId = process.env.LOTTO_D1_ID;
if (!databaseId || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(databaseId) ||
    databaseId === '00000000-0000-4000-8000-000000000000') {
  throw new Error('Set LOTTO_D1_ID to the UUID of the Cloudflare D1 database.');
}

const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
const database = config.d1_databases?.find(binding => binding.binding === 'DB');
if (!database) throw new Error('The build does not have the required DB binding.');

config.name = 'thai-lotto-insight';
config.workers_dev = true;
config.vars = { ...config.vars, THAI_LOTTO_DIRECT_CLOUDFLARE: 'true' };
Object.assign(database, { database_name: 'thai-lotto-insight', database_id: databaseId, migrations_dir: '../../drizzle' });
await writeFile('dist/server/wrangler.production.json', JSON.stringify(config, null, 2) + '\n');
