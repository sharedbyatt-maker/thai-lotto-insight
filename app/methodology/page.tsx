"use client";

import Link from "next/link";
import {Breadcrumbs} from "../../components/breadcrumbs";
import {useLanguage} from "../../components/language-provider";
import {PublicPage} from "../../components/public-shell";
import type {TranslationKey} from "../../lib/i18n";
import {p2} from "../../lib/phase2-i18n";

const components: Array<[TranslationKey, TranslationKey]> = [
  ["recentFrequency", "recentFrequencyText"], ["longTermFrequency", "longTermFrequencyText"],
  ["gap", "gapText"], ["pair", "pairText"], ["position", "positionText"], ["momentum", "momentumText"],
];

export default function Page() {
  const {language, t} = useLanguage();
  return <PublicPage><article className="mx-auto max-w-3xl px-5 py-12">
    <Breadcrumbs items={[{label:p2(language,"methodology")}]} />
    <h1 className="text-4xl font-black">{t("methodologyTitle")}</h1>
    <p className="mt-4 text-lg leading-8 text-[#637169]">{t("methodologyIntro")}</p>

    <section className="panel mt-8" aria-labelledby="official-data-heading">
      <h2 id="official-data-heading" className="text-xl font-bold">{p2(language,"dataSources")}</h2>
      <p className="mt-2 text-[#637169]">{p2(language,"trustIntro")}</p>
      <p className="mt-3 text-[#637169]">{p2(language,"syncPolicy")} {p2(language,"leadingZeros")} (00–09).</p>
      <p className="mt-3 text-[#637169]">{p2(language,"officialLast2")}</p>
      <Link className="pill mt-4 inline-block" href="/data-sources">{p2(language,"dataSources")}</Link>
    </section>

    <section className="panel mt-4" aria-labelledby="data-gate-heading">
      <h2 id="data-gate-heading" className="text-xl font-bold">{t("minimumDataGate")}</h2>
      <p className="mt-2 text-[#637169]">{t("minimumDataText")}</p>
    </section>

    <div className="mt-4 space-y-4">{components.map(([title,body])=><section className="panel" key={title}>
      <h2 className="text-xl font-bold">{t(title)}</h2><p className="mt-2 text-[#637169]">{t(body)}</p>
    </section>)}</div>

    <section className="panel mt-4" aria-labelledby="selection-heading">
      <h2 id="selection-heading" className="text-xl font-bold">{t("modelSelection")}</h2>
      <p className="mt-2 text-[#637169]">{t("modelSelectionText")}</p>
      <p className="mt-3 text-[#637169]">{t("baselineText")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#e9f4ee] p-4"><b>{t("champion")}</b><p className="mt-1 text-sm text-[#52635a]">v3.1-stat-2026-09-01-n206</p></div>
        <div className="rounded-xl bg-[#fff4df] p-4"><b>{t("challenger")}</b><p className="mt-1 text-sm text-[#79501d]">challenger-digit-v2-d098 · {t("experimental")}</p></div>
      </div>
      <nav className="mt-4 flex flex-wrap gap-3" aria-label={t("modelSelection")}>
        <Link className="pill" href="/backtest">{p2(language,"performance")}</Link>
        <Link className="pill" href="/2-digit">{t("twoDigitTitle")}</Link>
        <Link className="pill" href="/statistics">{p2(language,"statisticsHub")}</Link>
      </nav>
    </section>

    <section className="panel mt-4" aria-labelledby="ml-heading"><h2 id="ml-heading" className="text-xl font-bold">{t("mlGate")}</h2><p className="mt-2 text-[#637169]">{t("mlGateText")}</p></section>
  </article></PublicPage>;
}
