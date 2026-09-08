import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"ThaiLotto Insight — Results & Statistics",description:"Official Thai lottery results, historical statistics, number trends and transparent backtesting.",applicationName:"ThaiLotto Insight",robots:{index:true,follow:true},openGraph:{title:"ThaiLotto Insight",description:"Thai Lottery Results, Statistics & Number Trends",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
