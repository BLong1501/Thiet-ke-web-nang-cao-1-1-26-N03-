import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { redisService } from '../database/redis';
const key=(token:string)=>'revoked-token:'+createHash('sha256').update(token).digest('hex');
export async function isRevoked(token:string){return (await redisService.getJSON(key(token)))!==null;}
export async function revoke(token?:string){
  if(!token)return;const payload=jwt.decode(token);
  if(!payload||typeof payload==='string'||typeof payload.exp!=='number')return;
  const ttl=payload.exp-Math.floor(Date.now()/1000);if(ttl>0)await redisService.setJSON(key(token),true,ttl);
}
