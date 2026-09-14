"use client";

import Link from "next/link";
import {useEffect,useState,type ComponentType,type ReactNode} from "react";
import {ArrowRight,BarChart3,BrainCircuit,CheckCircle2,Clock3,Newspaper,ShieldCheck,Sparkles,TicketCheck,Trophy,UsersRound} from "lucide-react";
import {PublicHeader,PublicFooter} from "../components/public-shell";
import {useLanguage} from "../components/language-provider";
import {formatCopy,phase6dCopy} from "../lib/phase6d-copy";

type Data={status:string;message?:string;latest?:any;latestRun?:any;drawCount?:number;picks?:any[];lockedPrediction?:{picks?:any[]};backtest?:any;dataMeta?:any};

export default function Home(){
  const{t,language}=useLanguage(),c=phase6dCopy[language],[data,setData]=useState<Data|null>(null);
  useEffect(()=>{fetch("/api/home").then(async r=>setData(await r.json())).catch(()=>setData({status:"source_error",message:"Data unavailable"}))},[]);
  const status=data?.status==="ready"?t("ready"):data?.status==="stale_data"?t("stale"):data?.status==="source_error"?t("sourceError"):t("syncPending"),latest=data?.latest,picks=(data?.lockedPrediction?.picks??data?.picks??[]).slice(0,5);
  return <main id="main-content" className="premium-home" tabIndex={-1}><PublicHeader/>
    <section className="premium-home-hero"><div className="home-orb home-orb-a"/><div className="home-orb home-orb-b"/><div className="home-orb home-orb-c"/><div className="home-grid"/><div className="premium-home-inner">
      <div className="home-hero-copy"><span className="home-live-pill"><i/>{status}<b>{c.officialData}</b></span><h1>{c.heroTitle}<br/><em>{c.heroAccent}</em></h1><p>{c.heroIntro}</p><div className="home-hero-actions"><Link className="home-primary" href="/check"><TicketCheck size={18}/>{c.checkTicket}<ArrowRight size={16}/></Link><Link className="home-secondary" href="/2-digit"><BrainCircuit size={17}/>{c.twoDigit}</Link></div><div className="home-trust"><span><ShieldCheck size={15}/> {c.glo}</span><span><CheckCircle2 size={15}/> {c.zeros}</span><span><Sparkles size={15}/> {c.explainable}</span></div></div>
      <div className="latest-draw-stage"><div className="stage-label"><span>01</span> {c.latestDraw}</div><article className="latest-draw-glass">{!data?<HomeSkeleton/>:latest?<><header><div><small>{c.verifiedDraw}</small><time>{latest.drawDate}</time></div><span><ShieldCheck size={14}/>{t("verified")}</span></header><div className="first-prize"><small>{t("firstPrize")}</small><strong>{latest.firstPrize}</strong></div><div className="draw-prize-row"><MiniPrize label={t("front3")} value={`${latest.front31} · ${latest.front32}`}/><MiniPrize label={t("last3")} value={`${latest.last31} · ${latest.last32}`}/><MiniPrize label={t("last2")} value={latest.last2} accent/></div><footer><span>GLO · {data.dataMeta?.dataCutoff??latest.drawDate}</span><Link href={`/results/${latest.drawDate}`}>{c.viewResult} <ArrowRight size={15}/></Link></footer></>:<div className="home-empty">{status}</div>}</article><div className="floating-proof"><ShieldCheck size={17}/><span><b>{c.verifiedFirst}</b><small>{c.analysisSeparate}</small></span></div></div>
    </div><div className="home-scroll-cue"><span>{c.explore}</span><i/></div></section>

    <section className="home-explore-head"><span>{c.toolsEyebrow}</span><h2>{c.toolsTitle}</h2><p>{c.toolsIntro}</p></section>

    <section className="home-command-grid" aria-label="Explore ThaiLotto Insight">
      <HomeCard href="/check" icon={TicketCheck} eyebrow={c.checkNow} title={c.checkTicket} text={c.checkBody} tone="emerald"><span className="ticket-digits">0 0 4 6 1 5</span></HomeCard>
      <HomeCard href="/2-digit" icon={BrainCircuit} eyebrow={c.model} title={c.twoDigit} text={c.modelBody} tone="midnight"><div className="home-pick-row">{picks.length?picks.map(x=><b key={x.number}>{x.number}</b>):<span>{c.waiting}</span>}</div></HomeCard>
      <HomeCard href="/statistics" icon={BarChart3} eyebrow={t("verifiedCoverage")} title={c.statistics} text={`${data?.drawCount??"—"} ${c.statisticsBody}`}/>
      <HomeCard href="/community" icon={UsersRound} eyebrow={t("navCommunity")} title={c.community} text={c.communityBody}/>
      <HomeCard href="/2-digit#why" icon={Sparkles} eyebrow={c.explainable} title={c.insight} text={c.insightBody} tone="gold"/>
      <HomeCard href="/results" icon={Newspaper} eyebrow={c.officialUpdates} title={c.news} text={latest?formatCopy(c.newsReady,{date:latest.drawDate}):c.newsWaiting}><span className="home-update-time"><Clock3 size={14}/> {c.officialUpdates}</span></HomeCard>
    </section>

    <section className="home-bottom-cta"><div><Trophy size={26}/><span><small>{c.trust}</small><b>{c.trustLine}</b></span></div><Link href="/methodology">{c.method} <ArrowRight size={16}/></Link></section>
    <div className="home-sticky-cta"><span><b>{c.haveTicket}</b><small>{c.ticketHint}</small></span><Link href="/check"><TicketCheck size={17}/>{c.checkNow}</Link></div>
    <PublicFooter/>
  </main>
}

function HomeCard({href,icon:Icon,eyebrow,title,text,tone="light",children}:{href:string;icon:ComponentType<{size?:number}>;eyebrow:string;title:string;text:string;tone?:"light"|"emerald"|"midnight"|"gold";children?:ReactNode}){return <Link href={href} className={`home-glass-card ${tone}`}><header><span><Icon size={19}/></span><ArrowRight size={18}/></header><small>{eyebrow}</small><h2>{title}</h2><p>{text}</p>{children&&<div className="home-card-extra">{children}</div>}</Link>}
function MiniPrize({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className={accent?"accent":""}><small>{label}</small><b>{value}</b></div>}
function HomeSkeleton(){return <div className="home-skeleton"><i/><i/><i/><i/></div>}
