import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, indexedDBLocalPersistence, onIdTokenChanged, type Auth } from "firebase/auth";
import { clearCache } from "./api";
let ready:Promise<Auth|null>|undefined;
export function firebaseAuth(){
  return ready??= (async()=>{
    let config:{enabled:boolean;apiKey:string;projectId:string;authDomain:string};
    try{const response=await fetch('/api/auth/config');if(!response.ok)throw new Error();config=await response.json();localStorage.setItem('a-table-firebase-config',JSON.stringify(config));}
    catch{const cached=localStorage.getItem('a-table-firebase-config');if(!cached)throw new Error('Connexion Firebase indisponible.');config=JSON.parse(cached);}
    if(!config.enabled)return null;
    if(!config.apiKey||!config.projectId||!config.authDomain)throw new Error('La connexion Google est en cours de configuration.');
    const auth=getAuth(initializeApp({apiKey:config.apiKey,projectId:config.projectId,authDomain:config.authDomain}));
    await setPersistence(auth,indexedDBLocalPersistence);await auth.authStateReady();
    return auth;
  })();
}
export async function getIdentityToken(){const auth=await firebaseAuth();return auth?.currentUser?.getIdToken()??null;}
export async function loginGoogle(){const auth=await firebaseAuth();if(!auth)throw new Error('Firebase non configuré.');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}
export async function logoutGoogle(){const auth=await firebaseAuth();if(auth)await signOut(auth);clearCache();}
export async function observeIdentity(change:()=>void){const auth=await firebaseAuth();return auth?onIdTokenChanged(auth,()=>change()):()=>{};}
