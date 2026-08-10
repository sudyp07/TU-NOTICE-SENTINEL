import fs from "node:fs/promises";import path from "node:path";
export async function loadState(f){try{return JSON.parse(await fs.readFile(f,"utf8"))}catch{return {seenIds:[],notices:[],updatedAt:null}}}
export async function saveState(f,s){await fs.mkdir(path.dirname(f),{recursive:true});const t=f+".tmp";await fs.writeFile(t,JSON.stringify(s,null,2));await fs.rename(t,f);}
export function detectNewNotices(cur,prev){const seen=new Set(prev?.seenIds||[]);return cur.filter(n=>n.id&&!seen.has(n.id));}
export function buildState(_,cur,cap=500){return {seenIds:[...new Set(cur.map(n=>n.id).filter(Boolean))].slice(0,cap),notices:cur.slice(0,cap),updatedAt:new Date().toISOString()};}
