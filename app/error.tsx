"use client";
import Link from"next/link";import{AlertTriangle,RefreshCw}from"lucide-react";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main id="main-content" className="platform-state"><span><AlertTriangle size={28}/></span><small>THAILOTTO INSIGHT</small><h1>Something did not load.</h1><p>Your verified data is unchanged. Check your connection and try this page again.</p><button onClick={reset}><RefreshCw size={17}/>Try again</button><Link href="/">Return home</Link></main>}
