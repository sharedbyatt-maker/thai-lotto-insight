import test from"node:test";import assert from"node:assert/strict";import{createLoader}from"./helpers/vite.mjs";
const serial=(base,count)=>Array.from({length:count},(_,i)=>String(base+i).padStart(6,"0"));
const fixture=(overrides={})=>({response:{result:{displayDate:{year:2026,month:9,date:1},first:{number:["417212"]},near1:{number:["417211","417213"]},last3f:{number:["004","615"]},last3b:{number:["212","007"]},last2:{number:["04"]},second:{number:serial(100001,5)},third:{number:serial(200001,10)},fourth:{number:serial(300001,50)},fifth:{number:[...serial(400001,99),"000004"]},...overrides}}});

test("full checker preserves zeros, checks every applicable category, and never fabricates near-first",async()=>{const loader=await createLoader();try{const m=await loader.load("/lib/full-ticket-checker.ts");const draw=await m.normalizeFullGloResponse(fixture(),"https://www.glo.or.th/test");assert.equal(draw.completeness,"FULL_PRIZE_SET_VERIFIED");assert.equal(draw.drawDate,"2026-09-01");assert.deepEqual(draw.nearFirst,["417211","417213"]);assert.equal(m.normalizeTicket("000004"),"000004");assert.equal(m.normalizeTicket("๐๐๐๐๐๔"),"000004");const multi=m.checkTicket("000004",draw);assert.equal(multi.isWinner,true);assert.deepEqual(multi.matchedPrizes.map(x=>x.category),["FIFTH_PRIZE","LAST_2"]);assert.deepEqual(m.checkTicket("417211",draw).matchedPrizes.map(x=>x.category),["NEAR_FIRST_PRIZE"]);assert.deepEqual(m.checkTicket("417213",draw).matchedPrizes.map(x=>x.category),["NEAR_FIRST_PRIZE"]);assert.deepEqual(m.checkTicket("004999",draw).matchedPrizes.map(x=>x.category),["FRONT_3"]);assert.deepEqual(m.checkTicket("999007",draw).matchedPrizes.map(x=>x.category),["LAST_3"]);assert.deepEqual(m.checkTicket("999904",draw).matchedPrizes.map(x=>x.category),["LAST_2"]);assert.deepEqual(m.checkTicket("100001",draw).matchedPrizes.map(x=>x.category),["SECOND_PRIZE"]);assert.deepEqual(m.checkTicket("200001",draw).matchedPrizes.map(x=>x.category),["THIRD_PRIZE"]);assert.deepEqual(m.checkTicket("300001",draw).matchedPrizes.map(x=>x.category),["FOURTH_PRIZE"]);assert.deepEqual(m.checkTicket("400001",draw).matchedPrizes.map(x=>x.category),["FIFTH_PRIZE"]);assert.deepEqual(m.checkTicket("888888",draw).matchedPrizes,[])}finally{await loader.close()}});

test("ticket validation rejects malformed input",async()=>{const loader=await createLoader();try{const m=await loader.load("/lib/full-ticket-checker.ts");for(const value of["12345","1234567","12A456","-00001"])assert.throws(()=>m.normalizeTicket(value),/exactly 6 digits/)}finally{await loader.close()}});

test("normalizer deduplicates prize data and marks partial payload summary-only",async()=>{const loader=await createLoader();try{const m=await loader.load("/lib/full-ticket-checker.ts");const raw=fixture({second:{number:["100001","100001"]},third:{number:[]}});const draw=await m.normalizeFullGloResponse(raw,"https://www.glo.or.th/test");assert.deepEqual(draw.secondPrize,["100001"]);assert.equal(draw.completeness,"SUMMARY_VERIFIED");assert.equal(m.checkTicket("100001",draw).verificationStatus,"SUMMARY_VERIFIED")}finally{await loader.close()}});

test("normalizer rejects wrong draw association and malformed leading-zero prize values",async()=>{const loader=await createLoader();try{const m=await loader.load("/lib/full-ticket-checker.ts");await assert.rejects(()=>m.normalizeFullGloResponse(fixture(),"https://www.glo.or.th/test","2026-09-16"),/GLO reported/);await assert.rejects(()=>m.normalizeFullGloResponse(fixture({first:{number:["12345"]}}),"https://www.glo.or.th/test"),/invalid 6-digit/)}finally{await loader.close()}});

test("missing prizes never rule out a win, even for a legacy stored full label",async()=>{
  const loader=await createLoader();
  try {
    const checker=await loader.load("/lib/full-ticket-checker.ts");
    const draw=await checker.normalizeFullGloResponse(fixture({fifth:{number:["400001"]}}),"https://www.glo.or.th/test");
    assert.equal(draw.completeness,"SUMMARY_VERIFIED");
    const legacy={...draw,completeness:"FULL_PRIZE_SET_VERIFIED"};
    assert.equal(checker.checkTicket("777777",legacy).isWinner,null);
    assert.equal(checker.checkTicket("400001",legacy).isWinner,true);
  } finally {await loader.close()}
});
