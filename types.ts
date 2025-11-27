export enum TileType {
  GRASS = 'grass',
  ROAD = 'road',
  FLOOR = 'floor',
  WALL = 'wall',
  DOOR = 'door',
  FOREST = 'forest',
  WATER = 'water',
  BARRICADE = 'barricade'
}

export enum ItemType {
  WEAPON = 'weapon',
  FOOD = 'food',
  MEDICAL = 'medical',
  MATERIAL = 'material',
  KEY = 'key',
  RESOURCE = 'resource'
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  value: number; 
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface Player extends Entity {
  name: string;
  hunger: number;
  thirst: number;
  stamina: number;
  inventory: Item[];
  equippedWeapon: Item | null;
}

export interface Zombie extends Entity {
  aggroRadius: number;
  damage: number;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  items: Item[];
  isExplored: boolean;
  isVisible: boolean;
  structureId?: number; 
}

export interface GameLog {
  id: string;
  message: string;
  type: 'info' | 'combat' | 'loot' | 'warning' | 'ai';
  timestamp: number;
}

export type GridMap = Tile[][];

export interface BuildingContext {
  structureId: number;
  type: string;
  description: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  type: 'item' | 'building';
  resultItem?: Partial<Item>; // For item crafting
  resultTileType?: TileType;  // For building
  ingredients: { name: string; count: number }[];
  description: string;
}