import {randomBytes} from 'node:crypto';
// Adaptateur du worker, jamais chargé par l'application Web. Ne modifie ni les protections ni les cookies.
export class BrowserAdapter {
  async request(url:string,body?:string){
    const target=new URL(url);
    if(!/^fd\d+-courses\.leclercdrive\.fr$/.test(target.hostname)&&target.hostname!=='api-recherchemagasins.leclercdrive.fr')throw new Error('Hôte fournisseur refusé');
    const cdp=new URL(process.env.LECLERC_CDP_URL??'http://127.0.0.1:9222');
    if(!['127.0.0.1','localhost','[::1]'].includes(cdp.hostname))throw new Error('CDP doit rester sur la boucle locale du worker');
    const tabs=await fetch(new URL('/json/list',cdp),{signal:AbortSignal.timeout(5000)}).then(r=>r.json()) as {type:string;url:string;webSocketDebuggerUrl:string}[];
    const tab=tabs.find(t=>t.type==='page'&&/^https:\/\/(?:www\.|fd\d+-courses\.)?leclercdrive\.fr\//.test(t.url));
    if(!tab)throw new Error('Ouvrez E.Leclerc Drive dans le navigateur dédié du worker et connectez-vous.');
    if(target.hostname.startsWith('fd')&&new URL(tab.url).hostname!==target.hostname)throw new Error('Choisissez le même Drive dans le navigateur du worker.');
    const socket=new WebSocket(tab.webSocketDebuggerUrl);
    const id=Number.parseInt(randomBytes(3).toString('hex'),16);
    try{return await new Promise<{status:number;text:string}>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Timeout du navigateur Leclerc')),20000);
      socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Navigateur du worker indisponible'));});
      socket.addEventListener('open',()=>{
        const expression=`(async()=>{const r=await fetch(${JSON.stringify(url)},{credentials:'include',${body===undefined?'method:"GET"':`method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","X-Requested-With":"XMLHttpRequest"},body:${JSON.stringify(body)}`}});return {status:r.status,text:await r.text()};})()`;
        socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
      });
      socket.addEventListener('message',event=>{
        const message=JSON.parse(String(event.data));if(message.id!==id)return;
        clearTimeout(timer);if(message.error||message.result?.exceptionDetails)return reject(new Error('Requête fournisseur refusée par le navigateur.'));
        resolve(message.result.result.value);
      });
    });}finally{socket.close();}
  }
}
