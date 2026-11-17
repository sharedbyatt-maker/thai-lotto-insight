import { getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "../db/schema";

const order = [
  "lotteryDraws", "rejectedDraws", "importQueue", "engineVersions", "predictionRuns", "predictions",
  "predictionResults", "numberStatistics", "backtestRuns", "backtestResults", "optimizerRuns",
  "mlRuns", "syncRuns", "sourceVerifications", "providerHealthEvents", "dataAuditRuns", "systemEvents",
  "communityUsers", "communitySubmissions", "communitySubmissionRevisions", "communitySettlements",
  "communityFavorites", "communityNotifications", "communityRateLimits", "fullPrizeDraws",
  "fullPrizeEntries", "fullPrizeBackfill",
] as const;
type TableName = typeof order[number];
type BackupRow = Record<string, unknown>;
type BackupTables = Partial<Record<TableName, BackupRow[]>>;

const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const encoder = new TextEncoder();
const MAX_BATCH_PARAMETER_BYTES = 1_500_000;

function isRecord(value: unknown): value is BackupRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBackup(backup: unknown): BackupTables | null {
  if (!isRecord(backup) || (backup.schemaVersion !== "v3.2" && backup.schemaVersion !== "v3.3") ||
    !isRecord(backup.tables) || !Array.isArray(backup.tables.lotteryDraws)) return null;
  const tables = backup.tables;
  for (const key of order) {
    const rows = tables[key];
    if (rows !== undefined && (!Array.isArray(rows) || !rows.every(isRecord))) return null;
  }
  return tables as BackupTables;
}

function insertStatements(database: D1Database, key: TableName, rows: BackupRow[]) {
  const table = schema[key];
  const columns = Object.entries(getTableColumns(table));
  const names = columns.map(([, column]) => quote(column.name)).join(",");
  const values = columns.map(([property]) => `json_extract(value,'$.${property}')`).join(",");
  const sql = `INSERT INTO ${quote(getTableName(table))}(${names}) SELECT ${values} FROM json_each(?)`;
  const statements: D1PreparedStatement[] = [];
  let chunk: string[] = [], size = 2;
  for (const row of rows) {
    const json = JSON.stringify(row), bytes = encoder.encode(json).byteLength + 1;
    if (bytes + 2 > MAX_BATCH_PARAMETER_BYTES) throw new Error("Backup contains an oversized row");
    if (size + bytes > MAX_BATCH_PARAMETER_BYTES) {
      statements.push(database.prepare(sql).bind(`[${chunk.join(",")}]`));
      chunk = [];
      size = 2;
    }
    chunk.push(json);
    size += bytes;
  }
  if (chunk.length) statements.push(database.prepare(sql).bind(`[${chunk.join(",")}]`));
  return statements;
}

export async function restoreBackup(database: D1Database, tables: BackupTables) {
  const occupied = order.map(key => `EXISTS(SELECT 1 FROM ${quote(getTableName(schema[key]))})`).join(" OR ");
  // Repeat the empty-target check inside the transaction. The overflow is a
  // deliberate SQLite abort so a concurrent writer cannot create a mixed DB.
  const guard = database.prepare(`SELECT CASE WHEN ${occupied} THEN abs(-9223372036854775808) ELSE 1 END`);
  const statements = [guard];
  const triggerNames = [
    ...(tables.predictions?.length ? ["trg_v3_locked_pick_insert"] : []),
    ...(tables.communitySubmissions?.length ? ["trg_v3_community_expired_insert"] : []),
  ];
  const triggers: string[] = [];
  for (const name of triggerNames) {
    const trigger = await database.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?")
      .bind(name).first<{sql: string}>();
    if (!trigger?.sql) throw new Error(`Recovery database is missing trigger ${name}`);
    statements.push(database.prepare(`DROP TRIGGER ${quote(name)}`));
    triggers.push(trigger.sql);
  }
  const restored = Object.fromEntries(order.map(key => [key, tables[key]?.length ?? 0]));
  for (const key of order) {
    statements.push(...insertStatements(database, key, tables[key] ?? []));
  }
  statements.push(...triggers.map(sql => database.prepare(sql)));
  // The original triggers and all data are committed or rolled back together.
  try {
    await database.batch(statements);
  } catch (error) {
    if (error instanceof Error && error.message.includes("integer overflow")) return null;
    throw error;
  }
  return restored;
}
