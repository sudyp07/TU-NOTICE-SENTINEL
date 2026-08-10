import * as cheerio from "cheerio";
import {extractBSDate} from "./dates.js";
export function extractNoticeId(u=""){const m=String(u).match(/\/notices\/([^/?#]+)/i);return m?m[1]:null;}
export function absoluteUrl(h,b){try{return new URL(h,b).href}catch{return null}}
export function parsePage(html,pageUrl){const $=cheerio.load(html),notices=[],seen=new Set();$("a[href]").each((_,a)=>{const url=absoluteUrl($(a).attr("href"),pageUrl),id=extractNoticeId(url);if(!url||!id||seen.has(id)||!/\/notices\//i.test(url))return;const title=$(a).text().replace(/\s+/g," ").trim();if(!title)return;const block=$(a).closest("article,li,tr,div").text().replace(/\s+/g," ").trim();notices.push({id,title,url,bsDate:extractBSDate(block)||extractBSDate(title),adDate:null});seen.add(id)});return {notices,nextPage:null};}
export function dedupeNotices(ns){const m=new Map();for(const n of ns)if(n.id&&!m.has(n.id))m.set(n.id,n);return [...m.values()];}
