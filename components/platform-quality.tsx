"use client";
import{useEffect,useSyncExternalStore}from"react";
import Link from"next/link";import{WifiOff}from"lucide-react";import{useLanguage}from"./language-provider";
const consent={en:{text:"We use essential storage for site preferences. Optional advertising cookies stay off unless you accept them.",accept:"Accept optional",reject:"Essential only",more:"Cookie policy"},th:{text:"เราใช้พื้นที่จัดเก็บที่จำเป็นสำหรับการตั้งค่า คุกกี้โฆษณาจะไม่ทำงานจนกว่าคุณจะยอมรับ",accept:"ยอมรับคุกกี้เสริม",reject:"เฉพาะที่จำเป็น",more:"นโยบายคุกกี้"},my:{text:"ဘာသာစကားနဲ့ theme လို မဖြစ်မနေလိုအပ်တာတွေကိုပဲ အရင်သိမ်းပါတယ်။ သင်လက်ခံမှသာ optional ကြော်ငြာ cookie သုံးပါမယ်။",accept:"Optional cookie လက်ခံမယ်",reject:"လိုအပ်တာပဲ သုံးမယ်",more:"Cookie မူဝါဒ"}}as const;
const consentKey = "tl-cookie-consent";
const consentEvent = "tl-consent-change";
const getConsent = () => {
  try { return localStorage.getItem(consentKey); } catch { return null; }
};
const subscribeConsent = (listener: () => void) => {
  window.addEventListener(consentEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(consentEvent, listener);
    window.removeEventListener("storage", listener);
  };
};
const subscribeConnection = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};
const getOffline = () => !navigator.onLine;
const serverOffline = () => false;
const serverConsent = () => undefined;
export function PlatformQuality(){const{language}=useLanguage(),offline=useSyncExternalStore(subscribeConnection,getOffline,serverOffline),choice=useSyncExternalStore<string|null|undefined>(subscribeConsent,getConsent,serverConsent);useEffect(()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})},[]);const choose=(value:"accepted"|"essential")=>{localStorage.setItem(consentKey,value);window.dispatchEvent(new Event(consentEvent))},c=consent[language];return <>{offline&&<div className="offline-banner" role="status"><WifiOff size={16}/>You are offline. Stored results remain available where cached.</div>}{choice===null&&<aside className="cookie-consent" role="dialog" aria-label={c.more} aria-live="polite"><p>{c.text} <Link href="/cookies">{c.more}</Link></p><div><button type="button" onClick={()=>choose("essential")}>{c.reject}</button><button className="cookie-accept" type="button" onClick={()=>choose("accepted")}>{c.accept}</button></div></aside>}</>}
