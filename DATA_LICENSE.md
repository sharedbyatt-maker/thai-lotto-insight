# Data licence and commercial-use status

Last reviewed: 2026-09-09

## Decision

**COMMERCIAL DATA LICENSE — UNRESOLVED**

Production enforcement: `COMMERCIAL_MONETIZATION_ENABLED=false`. The build and runtime guard refuse advertising when `COMMERCIAL_DATA_LICENSE_APPROVED` is not explicitly verified. Public-access wording is not treated as commercial permission.

ThaiLotto Insight must not represent that the Government Lottery Office (GLO)
dataset is cleared for commercial reuse. The GLO Data Catalog labels the parent
dataset and every resource inspected as **Creative Commons Non-Commercial
(Any)**. An advertising-supported site is potentially commercial use.

The catalog's phrases “Public Used”, “GLO Public Used”, “public data”, and
“accessible through the GLO website” describe access or classification. They do
not override the non-commercial licence or grant verified permission for an
ad-supported product.

## Source and resources

Parent dataset:
https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01

| Resource | Resource ID | Operational URL | Licence shown by catalog | Commercial status |
|---|---|---|---|---|
| Results ordered by draw | c0f6cd6a-76c5-4f13-ac59-5262f63fcea3 | https://www.glo.or.th/mission/awarding/orderby-time | Creative Commons Non-Commercial (Any) | Unresolved / not cleared |
| Historical statistics | b0e15805-2506-48ca-ba2c-010ccd03046a | https://www.glo.or.th/mission/awarding/stat-previous | Creative Commons Non-Commercial (Any) | Unresolved / not cleared |
| Latest-results API documentation | 0846af20-af93-498c-91d9-644a885733f7 | POST https://www.glo.or.th/api/lottery/getLatestLottery | Creative Commons Non-Commercial (Any) | Unresolved / not cleared |
| Results-by-date API documentation | 64b39af8-fd9a-4eab-87d4-9193768c3812 | POST https://www.glo.or.th/api/checking/getLotteryResult | Creative Commons Non-Commercial (Any) | Unresolved / not cleared |
| Result-checking API documentation | a4d750a4-f8a0-41f3-b62f-99ad97cd680a | POST https://www.glo.or.th/api/checking/getcheckLotteryResult | Creative Commons Non-Commercial (Any) | Unresolved / not cleared |
| Latest printable result | 34e51035-adbf-4046-ba00-8ca34bbd9e6a | https://www.glo.or.th/mission/awarding/orderby-time/printing | Creative Commons Non-Commercial (Any) | Unresolved / not cleared |

## Important distinctions

- **Dataset licence:** the catalog metadata explicitly says Creative Commons
  Non-Commercial (Any).
- **API access:** the catalog publishes POST examples and labels access as
  public, but no separate commercial API grant was located.
- **Facts:** prize numbers and draw dates are factual information. Whether a
  particular collection, selection, API response, or repeated extraction is
  reusable in a commercial product can involve additional legal questions.
  This project does not claim a legal conclusion.
- **Documents:** PDFs and printable official result pages may contain layout,
  logos, text, and other protected material beyond the bare facts. They are
  retained only as source references; the project does not republish them.

## Attribution and operating rule

The application records GLO as source, the exact endpoint/resource ID, retrieval
time, and a SHA-256 payload hash for every accepted record. Source links must
remain visible. This is good provenance practice, not a claim that attribution
alone satisfies the non-commercial restriction.

Before enabling advertising or other monetization, obtain written permission
from GLO or switch to a source whose commercial reuse terms have been verified.
The provider interface and normalized database schema deliberately keep GLO
replaceable.

This document records engineering due diligence and is not legal advice.
