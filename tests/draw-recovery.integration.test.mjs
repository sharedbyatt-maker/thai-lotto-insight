import assert from "node:assert/strict";
import test, {after} from "node:test";
import {createLoader} from "./helpers/vite.mjs";
import {createTestDatabase, goodDraw, insertEngine, insertUnlockedRun, lockRun, sqliteImportStore} from "./helpers/sqlite.mjs";

const loader = await createLoader([{
  name: "test-worker-environment",
  resolveId: id => id === "cloudflare:workers" ? "\0test-worker-environment" : undefined,
  load: id => id === "\0test-worker-environment" ? "export const env = {}" : undefined,
}]);
const store = await loader.load("/lib/full-prize-store.ts");
const recovery = await loader.load("/lib/backup-restore.ts");
after(() => loader.close());

function d1Adapter(db, abortAfter = -1) {
  return {
    prepare(sql) {
      return {
        sql, bindings: [],
        bind(...bindings) {return {...this, bindings}},
        async first() {return db.prepare(sql).get(...this.bindings) ?? null},
      };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = statements.map(({sql, bindings}, index) => {
          const result = db.prepare(sql).run(...bindings);
          if (index === abortAfter) throw new Error("simulated interruption");
          return {meta: {changes: result.changes}};
        });
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const numbers = (first, count) => Array.from({length: count}, (_, i) => String(first + i).padStart(6, "0"));
const fullDraw = {
  drawDate: "2026-11-16", firstPrize: "004615", last2: "03", front3: ["004", "615"], last3: ["031", "631"],
  nearFirst: ["004614", "004616"], secondPrize: numbers(100000, 5), thirdPrize: numbers(200000, 10),
  fourthPrize: numbers(300000, 50), fifthPrize: numbers(400000, 100), source: "GLO",
  sourceUrl: "https://www.glo.or.th/fixture", sourceHash: "original", verifiedAt: "2026-11-16T10:00:00Z",
  completeness: "FULL_PRIZE_SET_VERIFIED",
};

test("a failed sync rolls back, repairs legacy partial writes, and accepts official corrections", async () => {
  const db = createTestDatabase();
  try {
    const adapter = d1Adapter(db);
    await assert.rejects(store.persistFullPrizeDraw(fullDraw,d1Adapter(db,1)), /simulated interruption/);
    assert.equal(db.prepare("SELECT count(*) n FROM v3_full_prize_draws").get().n,0);
    assert.equal(db.prepare("SELECT count(*) n FROM v3_lottery_draws").get().n,0);
    assert.equal((await store.persistFullPrizeDraw(fullDraw,adapter)).summaryChanged,true);
    db.prepare("DELETE FROM v3_full_prize_entries WHERE category='FIFTH_PRIZE'").run();
    db.prepare("DELETE FROM v3_lottery_draws").run();
    assert.equal((await store.persistFullPrizeDraw(fullDraw,adapter)).summaryChanged,true);
    assert.equal(db.prepare("SELECT count(*) n FROM v3_full_prize_entries").get().n,173);
    assert.equal((await store.persistFullPrizeDraw(fullDraw,adapter)).changed,false);

    const correction = {...fullDraw,last2:"04",sourceHash:"corrected"};
    await assert.rejects(store.persistFullPrizeDraw(correction,d1Adapter(db,2)), /simulated interruption/);
    assert.equal(db.prepare("SELECT last_2 FROM v3_full_prize_draws WHERE is_active=1").get().last_2,"03");
    await store.persistFullPrizeDraw(correction,adapter);
    assert.equal(db.prepare("SELECT last_2 FROM v3_full_prize_draws WHERE is_active=1").get().last_2,"04");
    assert.equal(db.prepare("SELECT last_2 FROM v3_lottery_draws").get().last_2,"04");
    assert.equal((await store.persistFullPrizeDraw({...correction,fifthPrize:[],sourceHash:"partial"},adapter)).changed,false);
    assert.equal(db.prepare("SELECT count(*) n FROM v3_full_prize_draws WHERE is_active=1").get().n,1);
  } finally {db.close()}
});

const camel = key => key.replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase());
const exported = (db, table) => db.prepare(`SELECT * FROM ${table}`).all().map(row =>
  Object.fromEntries(Object.entries(row).map(([key,value]) => [camel(key),value])),
);

test("restore retries after rollback and preserves locked picks and historical community submissions", async () => {
  const source = createTestDatabase(), target = createTestDatabase();
  try {
    const draw = goodDraw();
    await sqliteImportStore(source).insertDraw(draw,"2025-09-01T12:00:00Z");
    const runId = insertUnlockedRun(source,insertEngine(source));
    source.prepare("INSERT INTO v3_predictions(run_id,number,score,component_scores,rank,created_at) VALUES(?,?,?,?,?,?)")
      .run(runId,"04",10,"{}",1,"2026-01-16T12:00:00Z");
    lockRun(source,runId);
    const deadline = "2099-01-01T00:00:00Z";
    source.prepare("INSERT INTO v3_community_users(id,public_id,display_name,joined_at,updated_at) VALUES(?,?,?,?,?)")
      .run("user-1","member-0000000000000001","Fixture","2025-09-01T12:00:00Z","2025-09-01T12:00:00Z");
    source.prepare("INSERT INTO v3_community_submissions(user_id,target_draw,deadline_at,status,tens_json,units_json,exact_json,payload_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .run("user-1","2026-02-01",deadline,"open","[]","[]","[]","fixture","2025-09-01T12:00:00Z","2025-09-01T12:00:00Z");
    const submission = exported(source,"v3_community_submissions")[0];
    submission.deadlineAt = "2026-02-01T00:00:00Z";
    submission.status = "locked";
    // Draw model property names predate automatic snake-to-camel conversion.
    const drawRow = {...draw, id:1, validationStatus:"valid",createdAt:"2025-09-01T12:00:00Z",updatedAt:"2025-09-01T12:00:00Z"};
    const tables = recovery.parseBackup({schemaVersion:"v3.3",tables:{
      lotteryDraws:[drawRow],engineVersions:exported(source,"v3_engine_versions"),predictionRuns:exported(source,"v3_prediction_runs"),
      predictions:exported(source,"v3_predictions"),communityUsers:exported(source,"v3_community_users"),
      communitySubmissions:[submission],
    }});
    assert.ok(tables);
    await assert.rejects(recovery.restoreBackup(d1Adapter(target,3),tables),/simulated interruption/);
    assert.equal(target.prepare("SELECT count(*) n FROM v3_lottery_draws").get().n,0);
    assert.equal((await recovery.restoreBackup(d1Adapter(target),tables)).predictions,1);
    assert.equal(target.prepare("SELECT number FROM v3_predictions").get().number,"04");
    assert.equal(target.prepare("SELECT status FROM v3_community_submissions").get().status,"locked");
    assert.equal(target.prepare("SELECT count(*) n FROM sqlite_master WHERE name IN ('trg_v3_locked_pick_insert','trg_v3_community_expired_insert')").get().n,2);
    assert.equal(await recovery.restoreBackup(d1Adapter(target),tables),null);
  } finally {source.close();target.close()}
});
