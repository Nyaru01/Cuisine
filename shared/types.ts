export type Season = "hiver" | "printemps" | "été" | "automne";
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}
export interface Recipe {
  source?: string;
  authorUid?: string | null;
  id: string;
  name: string;
  description: string;
  image: string;
  preparationTime: number;
  cookingTime: number;
  totalTime: number;
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string[];
  categories: string[];
  seasons: Season[];
  months: number[];
  allergens: string[];
  childFriendly: boolean;
  vegetarian: boolean;
  servings: number;
  protein: string;
  starch: string;
  style: string;
  light: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Household {
  adults: number;
  children: { age: number }[];
}
export interface Settings {
  household: Household;
  dislikes: string[];
  exclusions: string[];
  allergies: string[];
  maxPrep: number;
}
export interface Meal {
  id: string;
  date: string;
  period: "midi" | "soir";
  recipeId: string | null;
  locked: boolean;
}
export interface Plan {
  id: string;
  week: string;
  version: number;
  meals: Meal[];
}
export interface ShoppingItem extends Ingredient {
  manual: boolean;
  id: string;
  checked: boolean;
}
export interface HistoryEntry {
  week: string;
  meals: Meal[];
}
export interface AppState {
  settings: Settings;
  favorites: string[];
}
