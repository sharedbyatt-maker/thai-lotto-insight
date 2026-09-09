# Official GLO resource research

Reviewed: 2026-09-09

The canonical machine-readable metadata is the GLO CKAN endpoint:

`GET https://gdcatalog.glo.or.th/api/3/action/package_show?id=dataset_c4-9_01`

The catalog reports nine resources and no active CKAN datastore. The historical
statistics and ordered-results resources are JavaScript-backed web pages, not
bulk CSV/JSON downloads. The documented structured historical path is therefore
the results-by-date API.

## Documented APIs

### Latest result

- Method: `POST`
- URL: `https://www.glo.or.th/api/lottery/getLatestLottery`
- Header: `Content-Type: application/json`
- Body: none in the official curl example
- Documented response fields: `youtube_url`, `pdf_url`, `displayDate`,
  `period`, and prize groups `first`, `second`, `third`, `fourth`,
  `fifth`, `last2`, `last3f`, `last3b`, `near1`

### Result by draw date

- Method: `POST`
- URL: `https://www.glo.or.th/api/checking/getLotteryResult`
- Header: `Content-Type: application/json`
- Body example: `{"date":"01","month":"03","year":"2024"}`
- Date convention: zero-padded Gregorian day/month and four-digit Gregorian
  year. Buddhist year is not used in the catalog's official example.
- Documented response fields: the same metadata/prize groups as latest result.

### Check ticket numbers for one draw

- Method: `POST`
- URL: `https://www.glo.or.th/api/checking/getcheckLotteryResult`
- Header: `Content-Type: application/json`
- Body example:
  `{"number":[{"lottery_num":"123456"},{"lottery_num":"333223"},{"lottery_num":"183307"}],"period_date":"2024-03-01"}`
- Up to ten six-digit ticket numbers are documented.
- Date convention: Gregorian ISO `YYYY-MM-DD`.

## Import decision

No official bulk datastore or downloadable structured historical file is
declared in the catalog. The importer seeds only normal draw slots (1st and
16th), narrowly scoped recurring holiday alternatives (30 December /
2 January, 17 January, and 2 May), and official-API-confirmed exceptions:
30 December 2017, 2 March 2018, 15 July 2019, 17 February 2022, and
31 July 2023. The cancelled 16 April, 1 May, and 16 May 2020 slots are
recorded as suspension-period cancellations. It does not scan every calendar day.
Every response date must match the requested date. Empty results are recorded
as no-result queue outcomes; malformed prize-bearing payloads are quarantined
as rejected records.

The queue is durable, attempt-limited, restartable, and idempotent. A unique
database constraint on `draw_date` is the final duplicate barrier.
