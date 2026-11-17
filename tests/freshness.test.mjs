import assert from"node:assert/strict";import test,{after}from"node:test";import{createLoader}from"./helpers/vite.mjs";const loader=await createLoader(),fresh=await loader.load("/lib/freshness.ts"),commercial=await loader.load("/lib/commercial.ts");after(()=>loader.close());
test("a verified initial draw remains current until the next result is due",()=>{
  const sync="2026-11-01T10:00:00Z";
  assert.equal(fresh.dataFreshness("2026-11-01",new Date("2026-11-16T13:59:59Z"),sync).state,"fresh");
  assert.equal(fresh.dataFreshness("2026-11-01",new Date("2026-11-16T14:00:00Z"),sync).state,"stale_data");
  assert.equal(fresh.dataFreshness("2026-11-16",new Date("2026-11-20T14:00:00Z"),sync).state,"fresh");
});
test("freshness keeps draw cutoff, sync age, and source distinct",()=>{
  const x=fresh.publicDataMetadata({dataCutoff:"2026-09-01",lastSuccessfulSync:"2026-09-08T00:00:00Z",now:new Date("2026-09-09T00:00:00Z")});
  assert.equal(x.dataCutoff,"2026-09-01");
  assert.equal(x.source.name,"Government Lottery Office (GLO)");
  assert.equal(x.freshness.expectedDrawDate,"2026-09-01");
  assert.equal(x.freshness.ageHours,24);
  assert.equal(x.freshness.isStale,false);
});
test("commercial guard: ads require provider configuration, not a data-license flag",()=>{assert.equal(commercial.COMMERCIAL_MONETIZATION_ENABLED,false);const off=commercial.commercialMonetizationGuard({COMMERCIAL_MONETIZATION_ENABLED:"true",ADS_PROVIDER_CONFIGURED:"false"});assert.equal(off.enabled,false);assert.match(off.warning,/provider/i);const on=commercial.commercialMonetizationGuard({COMMERCIAL_MONETIZATION_ENABLED:"true",ADS_PROVIDER_CONFIGURED:"true"});assert.equal(on.enabled,true)});
