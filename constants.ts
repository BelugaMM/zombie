import { TileType, ItemType, Recipe } from './types';

export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 40;
export const VIEWPORT_SIZE = 15;
export const TILE_SIZE = 48;

export const PLAYER_START_STATS = {
  hp: 100,
  maxHp: 100,
  hunger: 100,
  thirst: 100,
  stamina: 100,
};

export const MOVEMENT_COST = {
  HUNGER: 0.1,
  THIRST: 0.2,
  STAMINA: 0, // Walking does not consume stamina per request
};

export const COMBAT_STAMINA_COST = 10; // Reduced from 15 to allow more attacks

export const COLORS: Record<TileType, string> = {
  [TileType.GRASS]: 'bg-green-900',
  [TileType.ROAD]: 'bg-stone-700',
  [TileType.FLOOR]: 'bg-amber-900',
  [TileType.WALL]: 'bg-stone-500',
  [TileType.DOOR]: 'bg-amber-700',
  [TileType.FOREST]: 'bg-green-950',
  [TileType.WATER]: 'bg-blue-900',
  [TileType.BARRICADE]: 'bg-amber-800',
};

export const STARTING_ITEMS = [
  {
    id: 'baseball_bat',
    name: '棒球棍',
    type: ItemType.WEAPON,
    description: '一根坚固的木制球棒。',
    value: 15
  }
];

export const RECIPES: Recipe[] = [
  {
    id: 'craft_spear',
    name: '简易长矛',
    type: 'item',
    resultItem: { name: '简易长矛', type: ItemType.WEAPON, value: 25, description: '把刀绑在棍子上，增加了攻击距离。' },
    ingredients: [{ name: '木材', count: 2 }, { name: '金属废料', count: 1 }],
    description: '简陋但有效的武器。'
  },
  {
    id: 'craft_bandage',
    name: '布质绷带',
    type: 'item',
    resultItem: { name: '绷带', type: ItemType.MEDICAL, value: 20, description: '用于包扎伤口。' },
    ingredients: [{ name: '布料', count: 2 }],
    description: '基础医疗用品。'
  },
  {
    id: 'craft_axe',
    name: '废铁斧',
    type: 'item',
    resultItem: { name: '废铁斧', type: ItemType.WEAPON, value: 35, description: '沉重而致命。' },
    ingredients: [{ name: '木材', count: 2 }, { name: '金属废料', count: 3 }],
    description: '造成巨大伤害。'
  },
  {
    id: 'build_barricade',
    name: '木制路障',
    type: 'building',
    resultTileType: TileType.BARRICADE,
    ingredients: [{ name: '木材', count: 3 }],
    description: '在指定位置建造路障，阻挡僵尸。'
  },
  {
    id: 'build_wall',
    name: '木墙',
    type: 'building',
    resultTileType: TileType.WALL,
    ingredients: [{ name: '木材', count: 5 }],
    description: '建造一堵坚实的墙。'
  }
];

// Helper to check standard materials names
export const MATERIAL_NAMES = {
  WOOD: '木材',
  METAL: '金属废料',
  CLOTH: '布料'
};