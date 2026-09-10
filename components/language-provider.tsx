"use client";
import {createContext,useContext,useEffect,useReducer} from "react";
import {languageReducer,loadLanguage,persistLanguage,translate,type Language,type TranslationKey} from "../lib/i18n";
type Context={language:Language;setLanguage:(language:Language)=>void;t:(key:TranslationKey,variables?:Record<string,string|number>)=>string};
const LanguageContext=createContext<Context|null>(null);
export function LanguageProvider({children}:{children:React.ReactNode}){const[language,setLanguage]=useReducer(languageReducer,"en");useEffect(()=>{setLanguage(loadLanguage(localStorage))},[]);useEffect(()=>{document.documentElement.lang=language;persistLanguage(localStorage,language)},[language]);return <LanguageContext.Provider value={{language,setLanguage,t:(key,variables)=>translate(language,key,variables)}}>{children}</LanguageContext.Provider>}
export function useLanguage(){const value=useContext(LanguageContext);if(!value)throw new Error("useLanguage must be used inside LanguageProvider");return value}
