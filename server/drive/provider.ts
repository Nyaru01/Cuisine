import type { DriveStore, DriveProduct, DriveCart } from "../../shared/drive.js";
export interface DriveProvider {
  mode:"mock"|"live";
  findStores(query:string):Promise<DriveStore[]>;
  setStore(storeId:string):Promise<DriveStore>;
  getStore():Promise<DriveStore|null>;
  searchProducts(query:string):Promise<DriveProduct[]>;
  getCart():Promise<DriveCart>;
  addToCart(productId:string,quantity:number):Promise<DriveCart>;
  updateQuantity(productId:string,quantity:number):Promise<DriveCart>;
  removeFromCart(productId:string):Promise<DriveCart>;
}
export class DriveProviderError extends Error {constructor(public code:string,message:string,public status=503){super(message);}}
