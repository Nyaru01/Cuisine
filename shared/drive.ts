export interface DriveStore {id:string;name:string;serviceType:"drive"|"relais"|"livraison";postalCode?:string;city?:string;host?:string;}
export interface DriveProduct {id:string;name:string;price:number;available:boolean;packQuantity:number;packUnit:string;brand?:string;}
export interface DriveCartItem {productId:string;name:string;quantity:number;unitPrice:number;totalPrice:number;}
export interface DriveCart {items:DriveCartItem[];totalItems:number;totalPrice:number;updatedAt:string;}
export interface DriveProposal {ingredientId:string;ingredient:string;needed:number;unit:string;products:DriveProduct[];productId:string|null;quantity:number;reason:string;}
export interface DriveJob {id:string;status:"waiting_confirmation"|"adding_to_cart"|"completed"|"partial"|"failed";total:number;processed:number;success:number;failures:string[];}
