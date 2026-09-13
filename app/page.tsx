"use client";

import Link from "next/link";
import {useEffect,useState,type ComponentType,type ReactNode} from "react";
import {ArrowRight,BarChart3,BrainCircuit,CheckCircle2,Clock3,Newspaper,ShieldCheck,Sparkles,TicketCheck,Trophy,UsersRound} from "lucide-react";
import {PublicHeader,PublicFooter} from "../components/public-shell";
import {useLanguage} from "../components/language-provider";

type Data={status:string;message?:string;latest?:any;latestRun?:any;drawCount?:number;picks?:any[];lockedPrediction?:{picks?:any[]};backtest?:any;dataMeta?:any};

export default function Home(){
  const{t}=useLanguage(),[data,setData]=useState<Data|null>(null);
  useEffect(()=>{fetch("/api/dashboard").then(async r=>setData(await r.json())).catch(()=>setData({status:"source_error",message:"Data unavailable"}))},[]);
  const status=data?.status==="ready"?t("ready"):data?.status==="stale_data"?t("stale"):data?.status==="source_error"?t("sourceError"):t("syncPending"),latest=data?.latest,picks=(data?.lockedPrediction?.picks??data?.picks??[]).slice(0,5);
  return <main id="main-content" className="premium-home" tabIndex={-1}><PublicHeader/>
    <section className="premium-home-hero"><div className="home-orb home-orb-a"/><div className="home-orb home-orb-b"/><div className="home-orb home-orb-c"/><div className="home-grid"/><div className="premium-home-inner">
      <div className="home-hero-copy"><span className="home-live-pill"><i/>{status}<b>Official data</b></span><h1>Every draw.<br/><em>Clearly understood.</em></h1><p>Official Thai lottery results, instant ticket checking and transparent number intelligence—together in one trusted place.</p><div className="home-hero-actions"><Link className="home-primary" href="/check"><TicketCheck size={18}/>Check my ticket<ArrowRight size={16}/></Link><Link className="home-secondary" href="/2-digit"><BrainCircuit size={17}/>2-Digit intelligence</Link></div><div className="home-trust"><span><ShieldCheck size={15}/> GLO-sourced results</span><span><CheckCircle2 size={15}/> Leading zeros preserved</span><span><Sparkles size={15}/> Explainable scores</span></div></div>
      <div className="latest-draw-stage"><div className="stage-label"><span>01</span> Latest official draw</div><article className="latest-draw-glass">{!data?<HomeSkeleton/>:latest?<><header><div><small>VERIFIED DRAW</small><time>{latest.drawDate}</time></div><span><ShieldCheck size={14}/>{t("verified")}</span></header><div className="first-prize"><small>{t("firstPrize")}</small><strong>{latest.firstPrize}</strong></div><div className="draw-prize-row"><MiniPrize label={t("front3")} value={`${latest.front31} · ${latest.front32}`}/><MiniPrize label={t("last3")} value={`${latest.last31} · ${latest.last32}`}/><MiniPrize label={t("last2")} value={latest.last2} accent/></div><footer><span>GLO · {data.dataMeta?.dataCutoff??latest.drawDate}</span><Link href={`/results/${latest.drawDate}`}>View full result <ArrowRight size={15}/></Link></footer></>:<div className="home-empty">{status}</div>}</article><div className="floating-proof"><ShieldCheck size={17}/><span><b>Verified first</b><small>Analysis stays separate</small></span></div></div>
    </div><div className="home-scroll-cue"><span>Explore</span><i/></div></section>

    <section className="home-explore-head"><span>ONE PLACE · SIX POWERFUL TOOLS</span><h2>From official result to deeper insight.</h2><p>Start with what matters now, then explore the evidence behind every number.</p></section>

    <section className="home-command-grid" aria-label="Explore ThaiLotto Insight">
      <HomeCard href="/check" icon={TicketCheck} eyebrow="CHECK NOW" title="Check My Ticket" text="Check all available prize categories with one 6-digit ticket." tone="emerald"><span className="ticket-digits">0 0 4 6 1 5</span></HomeCard>
      <HomeCard href="/2-digit" icon={BrainCircuit} eyebrow="TRANSPARENT MODEL" title="2-Digit Intelligence" text="Locked rankings with score explanations and visible limitations." tone="midnight"><div className="home-pick-row">{picks.length?picks.map(x=><b key={x.number}>{x.number}</b>):<span>Waiting for verified output</span>}</div></HomeCard>
      <HomeCard href="/statistics" icon={BarChart3} eyebrow="VERIFIED HISTORY" title="Statistics" text={`${data?.drawCount??"—"} draws · frequency, gaps, sums and pair heatmaps.`}/>
      <HomeCard href="/community" icon={UsersRound} eyebrow="PEOPLE & PICKS" title="Community" text="Submit picks, compare transparent results and follow the leaderboard."/>
      <HomeCard href="/2-digit#why" icon={Sparkles} eyebrow="EXPLAINABLE" title="AI Insight" text="See why each number ranks where it does—without probability claims." tone="gold"/>
      <HomeCard href="/results" icon={Newspaper} eyebrow="VERIFIED UPDATES" title="Latest News" text={latest?`Official draw ${latest.drawDate} is available with complete result details.`:"Official draw updates appear after source verification."}><span className="home-update-time"><Clock3 size={14}/> Official result updates only</span></HomeCard>
    </section>

    <section className="home-bottom-cta"><div><Trophy size={26}/><span><small>TRUST BY DESIGN</small><b>Official results first. Analysis second.</b></span></div><Link href="/methodology">See how it works <ArrowRight size={16}/></Link></section>
    <div className="home-sticky-cta"><span><b>Have a ticket?</b><small>Check every prize in seconds.</small></span><Link href="/check"><TicketCheck size={17}/>Check now</Link></div>
    <PublicFooter/>
  </main>
}

function HomeCard({href,icon:Icon,eyebrow,title,text,tone="light",children}:{href:string;icon:ComponentType<{size?:number}>;eyebrow:string;title:string;text:string;tone?:"light"|"emerald"|"midnight"|"gold";children?:ReactNode}){return <Link href={href} className={`home-glass-card ${tone}`}><header><span><Icon size={19}/></span><ArrowRight size={18}/></header><small>{eyebrow}</small><h2>{title}</h2><p>{text}</p>{children&&<div className="home-card-extra">{children}</div>}</Link>}
function MiniPrize({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className={accent?"accent":""}><small>{label}</small><b>{value}</b></div>}
function HomeSkeleton(){return <div className="home-skeleton"><i/><i/><i/><i/></div>}
