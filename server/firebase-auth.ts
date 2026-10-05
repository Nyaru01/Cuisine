import { createRemoteJWKSet, jwtVerify } from "jose";
import type { RequestHandler } from "express";
const keys=createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
export interface Identity {uid:string;email:string}
export type TokenVerifier=(token:string)=>Promise<Identity>;
export function authConfig(){return {projectId:process.env.FIREBASE_PROJECT_ID??"",apiKey:process.env.FIREBASE_API_KEY??"",authDomain:process.env.FIREBASE_AUTH_DOMAIN??""};}
export const authEnabled=process.env.NODE_ENV==="production"||Boolean(process.env.FIREBASE_PROJECT_ID);
export const verifyFirebaseToken:TokenVerifier=async(token)=>{
  const project=process.env.FIREBASE_PROJECT_ID;
  if(!project)throw new Error("Firebase non configuré");
  const {payload}=await jwtVerify(token,keys,{algorithms:["RS256"],issuer:`https://securetoken.google.com/${project}`,audience:project});
  if(!payload.sub||payload.sub.length>128||payload.email_verified!==true||typeof payload.email!=="string")throw new Error("Identité non vérifiée");
  const allowed=(process.env.FIREBASE_ALLOWED_EMAILS??"").toLowerCase().split(",").map(s=>s.trim()).filter(Boolean);
  if(!allowed.includes(payload.email.toLowerCase()))throw new Error("Compte hors du foyer");
  return {uid:payload.sub,email:payload.email};
};
export function authenticate(verifier:TokenVerifier=verifyFirebaseToken):RequestHandler{
  return async(req,res,next)=>{
    res.locals.authenticated=!authEnabled;
    if(!authEnabled){res.locals.identity={uid:"local-family",email:""};return next();}
    const match=/^Bearer (\S+)$/.exec(req.get("Authorization")??"");
    if(match){try{res.locals.identity=await verifier(match[1]);res.locals.authenticated=true;}catch{res.locals.authenticated=false;}}
    next();
  };
}
export const requireAuth:RequestHandler=(_req,res,next)=>{
  if(res.locals.authenticated)return next();
  res.status(401).json({error:"Connectez-vous avec un compte Google autorisé pour ce foyer."});
};
export const protectWrites:RequestHandler=(req,res,next)=>{
  if(["GET","HEAD","OPTIONS"].includes(req.method))return next();
  if(req.get("X-Requested-With")!=="A-Table")return res.status(403).json({error:"Requête refusée."});
  const origin=req.get("Origin");
  if(origin){try{if(new URL(origin).host!==req.get("host"))return res.status(403).json({error:"Origine refusée."});}catch{return res.status(403).json({error:"Origine invalide."});}}
  next();
};
