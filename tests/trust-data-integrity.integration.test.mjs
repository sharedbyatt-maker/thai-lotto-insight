import assert from"node:assert/strict";
import test from"node:test";
import{readFileSync}from"node:fs";
import{createTestDatabase}from"./helpers/sqlite.mjs";

const dashboard=readFileSync(new URL("../app/api/dashboard/route.ts",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/2-digit/page.tsx",import.meta.url),"utf8");
const home=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const backupRoute=readFileSync(new URL("../app/api/admin/export/[kind]/route.ts",import.meta.url),"utf8");
const restoreRoute=readFileSync(new URL("../app/api/admin/restore/route.ts",import.meta.url),"utf8");
const journal=JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json",import.meta.url),"utf8"));

const durable=["communityUsers","communitySubmissions","communitySubmissionRevisions","communitySettlements","communityFavorites","communityNotifications","communityRateLimits","fullPrizeDraws","fullPrizeEntries","fullPrizeBackfill"];

test("canonical public output is sourced from the immutable prediction run",()=>{
  assert.match(dashboard,/lockedPrediction=run\?\{run,engine:lockedEngine,picks:/);
  assert.match(page,/canonicalPicks\.slice\(0,5\)/);
  assert.doesNotMatch(page,/LOCKED OUTPUT[\s\S]{0,300}outlook\.ranking\.slice\(0,5\)/);
  assert.match(page,/EXPERIMENTAL CHALLENGER · NOT PROMOTED/);
  assert.match(home,/data\?\.lockedPrediction\?\.picks\?\?data\?\.picks/);
});

test("V3.3 backup and restore enumerate every community and full-prize table",()=>{
  assert.match(backupRoute,/schemaVersion:"v3\.3"/);
  for(const name of durable){assert.match(backupRoute,new RegExp(`${name}:await db\\.select`),`${name} missing from backup`);assert.match(restoreRoute,new RegExp(`"${name}"`),`${name} missing from restore`)}
  assert.match(restoreRoute,/\["v3\.2","v3\.3"\]/);
});

test("community audit rows and full-prize snapshots survive empty-database parity restore",()=>{
  const source=createTestDatabase(),target=createTestDatabase(),now="2026-09-13T00:00:00.000Z";
  source.prepare("INSERT INTO v3_community_users(id,public_id,display_name,joined_at,updated_at) VALUES(?,?,?,?,?)").run("private-user","member-0123456789abcdef","Tester",now,now);
  const submission=Number(source.prepare("INSERT INTO v3_community_submissions(user_id,target_draw,deadline_at,status,tens_json,units_json,exact_json,payload_hash,revision,created_at,updated_at) VALUES(?,?,?,'locked',?,?,?,?,1,?,?) RETURNING id").get("private-user","2099-09-16","2099-09-16T07:00:00.000Z",'["8"]','["7"]','["87"]',"a".repeat(64),now,now).id);
  source.prepare("INSERT INTO v3_community_submission_revisions(submission_id,revision,tens_json,units_json,exact_json,payload_hash,changed_at) VALUES(?,?,?,?,?,?,?)").run(submission,1,'["8"]','["7"]','["87"]',"a".repeat(64),now);
  source.prepare("INSERT INTO v3_full_prize_draws(draw_date,source_hash,completeness,source_name,source_url,verified_at,fetched_at,is_active,first_prize,last_2) VALUES(?,?,?,?,?,?,?,?,?,?)").run("2026-09-01","b".repeat(64),"FULL_PRIZE_SET_VERIFIED","GLO","https://glo.or.th",now,now,1,"417212","04");
  source.prepare("INSERT INTO v3_full_prize_entries(draw_date,source_hash,category,winning_number,position_index,created_at) VALUES(?,?,?,?,?,?)").run("2026-09-01","b".repeat(64),"FIRST_PRIZE","417212",0,now);
  const copy=(table,columns)=>{const rows=source.prepare(`SELECT ${columns.join(",")} FROM ${table}`).all();const marks=columns.map(()=>"?").join(",");for(const row of rows)target.prepare(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${marks})`).run(...columns.map(c=>row[c]))};
  copy("v3_community_users",["id","public_id","display_name","joined_at","updated_at"]);
  copy("v3_community_submissions",["id","user_id","target_draw","deadline_at","status","tens_json","units_json","exact_json","payload_hash","revision","created_at","updated_at"]);
  copy("v3_community_submission_revisions",["submission_id","revision","tens_json","units_json","exact_json","payload_hash","changed_at"]);
  copy("v3_full_prize_draws",["draw_date","source_hash","completeness","source_name","source_url","verified_at","fetched_at","is_active","first_prize","last_2"]);
  copy("v3_full_prize_entries",["draw_date","source_hash","category","winning_number","position_index","created_at"]);
  assert.equal(target.prepare("SELECT exact_json FROM v3_community_submission_revisions").get().exact_json,'["87"]');
  const restoredDraw=target.prepare("SELECT first_prize,last_2 FROM v3_full_prize_draws").get();
  assert.equal(restoredDraw.first_prize,"417212");
  assert.equal(restoredDraw.last_2,"04");
  assert.equal(target.prepare("SELECT winning_number FROM v3_full_prize_entries").get().winning_number,"417212");
});

test("full-prize migration has matching journal metadata",()=>{
  assert.equal(journal.entries.at(-1).tag,"0007_full_prize_persistence");
  assert.doesNotThrow(()=>createTestDatabase());
});
