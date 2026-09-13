"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {useParams} from "next/navigation";
import {Activity, ArrowRightLeft, CalendarDays, Flame, Hash, Snowflake} from "lucide-react";
import {PublicPage,DataMeta} from "../../../components/public-shell";
import {Breadcrumbs} from "../../../components/breadcrumbs";
import {useLanguage} from "../../../components/language-provider";
import {p2} from "../../../lib/phase2-i18n";

export default function Page(){
  const{language,t}=useLanguage(),p=useParams(),number=String(p.number),[d,setD]=useState<any>(null);
  useEffect(()=>{fetch("/api/number/"+number).then(r=>r.json()).then(setD).catch(()=>setD({status:"source_error"}))},[number,setD]);
  const usable=d?.status==="ready"||d?.status==="stale_data",mirror=/^\d{2}$/.test(number)?number.split("").map(x=>String(9-Number(x))).join(""):"—";
  const trend=usable?d.recentFrequency-d.longTermFrequency:0,state=trend>.01?"hot":trend<-.01?"cold":"steady";
  const months=useMemo(()=>usable?monthActivity(d.occurrenceDates):[],[usable,d]);
  return <PublicPage><main className="mx-auto max-w-6xl px-4 py-8 md:py-12"><Breadcrumbs items={[{label:p2(language,"statisticsHub"),href:"/statistics"},{label:number}]}/>
    {!usable?<div className="intelligence-skeleton mt-6">{d?.status==="source_error"?t("sourceError"):d?.message?t("insufficientData"):t("loadingStats")}</div>:<>
      <section className="number-intelligence-hero"><div><span className="section-eyebrow">NUMBER INTELLIGENCE · VERIFIED HISTORY</span><h1>{number}</h1><div className="number-state-row"><span className={`number-state ${state}`}>{state==="hot"?<Flame size={15}/>:state==="cold"?<Snowflake size={15}/>:<Activity size={15}/>} {state.toUpperCase()}</span><span>Rank <b>#{d.rank}</b> of 100</span><span>Updated <b>{d.lastUpdated}</b></span></div></div><div className="intelligence-score"><small>DESCRIPTIVE SCORE</small><strong>{d.score.toFixed(1)}</strong><span>/100</span><i><b style={{width:`${d.score}%`}}/></i><p>Historical ranking, not a winning probability.</p></div></section>
      <DataMeta data={d}/>
      <section className="intelligence-metrics"><Metric label={p2(language,"occurrences")} value={d.appearances}/><Metric label={p2(language,"lastSeen")} value={d.lastSeen??t("never")}/><Metric label={p2(language,"gap")} value={d.currentGap}/><Metric label={t("averageGap")} value={d.averageGap?.toFixed(1)??"—"}/><Metric label={t("gapPercentile")} value={`${d.gapPercentile.toFixed(1)}%`}/><Metric label={p2(language,"recent30")} value={d.last30}/></section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="panel-premium"><div className="intelligence-heading"><div><span className="section-eyebrow">SCORE BREAKDOWN</span><h2>Why this rank?</h2></div><Activity size={22}/></div><div className="component-bars"><Score label={t("recentScore")} value={d.componentScores.recentFrequency}/><Score label={t("longScore")} value={d.componentScores.longTermFrequency}/><Score label={t("gapScore")} value={d.componentScores.gap}/><Score label={t("pairScore")} value={d.componentScores.pair}/><Score label={t("positionScore")} value={d.componentScores.position}/><Score label={t("momentumScore")} value={d.componentScores.momentum}/></div><p className="analytics-note">{p2(language,"randomnessNote")}</p></section>
      <section className="panel-premium"><div className="intelligence-heading"><div><span className="section-eyebrow">RELATIONSHIPS</span><h2>Related numbers</h2></div><ArrowRightLeft size={22}/></div><div className="relationship-grid"><Relation label={p2(language,"reverse")} value={d.reverse}/><Relation label="Mirror (9-complement)" value={mirror}/><Relation label={p2(language,"tens")} value={`${number[0]}x`}/><Relation label={p2(language,"units")} value={`x${number[1]}`}/></div><div className="mt-4 flex flex-wrap gap-2"><Link className="pill" href={`/number/${d.reverse}`}>Open {d.reverse}</Link>{mirror!==number&&<Link className="pill" href={`/number/${mirror}`}>Open {mirror}</Link>}<Link className="pill" href="/statistics/pairs">Pair explorer</Link></div></section></div>
      <section className="panel-premium mt-5"><div className="intelligence-heading"><div><span className="section-eyebrow">WINNING TIMELINE</span><h2><CalendarDays size={20}/> Verified appearances</h2></div><b>{d.occurrenceDates.length} draws</b></div>{months.length?<div className="month-heatmap">{months.map(x=><div key={x.month} title={`${x.month}: ${x.count}`}><span>{x.month.slice(2)}</span><i style={{opacity:.16+Math.min(.84,x.count/4)}}/><b>{x.count}</b></div>)}</div>:<div className="empty mt-4">{t("never")}</div>}<div className="mt-5 flex flex-wrap gap-2">{d.occurrenceDates.map((date:string)=><Link className="date-chip" href={`/results/${date}`} key={date}>{date}</Link>)}</div></section>
      <section className="panel-premium mt-5"><div className="intelligence-heading"><div><span className="section-eyebrow">DIGIT PROFILE</span><h2><Hash size={20}/> Position evidence</h2></div></div><div className="intelligence-metrics compact"><Metric label={p2(language,"tens")} value={d.digits.tens}/><Metric label={p2(language,"units")} value={d.digits.units}/><Metric label={p2(language,"digitSum")} value={d.digits.sum}/><Metric label={p2(language,"parity")} value={p2(language,d.digits.parity)}/><Metric label={p2(language,"highLow")} value={d.digits.highLow}/><Metric label={t("tensAppearances")} value={d.positionStatistics.tensAppearances}/><Metric label={t("unitsAppearances")} value={d.positionStatistics.unitsAppearances}/></div></section>
    </>}
  </main></PublicPage>
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="intelligence-metric"><small>{label}</small><b>{String(value)}</b></div>}
function Score({label,value}:{label:string;value:number}){return <div><span><b>{label}</b><strong>{value.toFixed(1)}</strong></span><i><b style={{width:`${Math.max(2,value)}%`}}/></i></div>}
function Relation({label,value}:{label:string;value:string}){return <div><small>{label}</small><b>{value}</b></div>}
function monthActivity(dates:string[]){const counts=new Map<string,number>();for(const date of dates){const month=date.slice(0,7);counts.set(month,(counts.get(month)??0)+1)}return [...counts].sort(([a],[b])=>a.localeCompare(b)).slice(-24).map(([month,count])=>({month,count}))}
