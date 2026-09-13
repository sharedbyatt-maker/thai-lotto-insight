"use client";
import{useEffect,useState}from"react";
import{WifiOff}from"lucide-react";
export function PlatformQuality(){const[offline,setOffline]=useState(false);useEffect(()=>{if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});const sync=()=>setOffline(!navigator.onLine);sync();window.addEventListener("online",sync);window.addEventListener("offline",sync);return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)}},[]);return offline?<div className="offline-banner" role="status"><WifiOff size={16}/>You are offline. Live results and account actions need a connection.</div>:null}
