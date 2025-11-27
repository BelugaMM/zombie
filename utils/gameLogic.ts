import { GridMap, TileType, Zombie, Item, Tile } from '../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

// Simple pseudo-random map generator
export const generateMap = (): { map: GridMap; zombies: Zombie[] } => {
  const map: GridMap = [];
  const zombies: Zombie[] = [];
  let structureIdCounter = 1;

  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Base Noise for biome
      const isForest = Math.random() > 0.8;
      const baseType = isForest ? TileType.FOREST : TileType.GRASS;
      
      row.push({
        x,
        y,
        type: baseType,
        items: [],
        isExplored: false,
        isVisible: false,
      });
    }
    map.push(row);
  }

  // Generate Roads
  const roadY = Math.floor(MAP_HEIGHT / 2);
  for (let x = 0; x < MAP_WIDTH; x++) {
    map[roadY][x].type = TileType.ROAD;
    map[roadY + 1][x].type = TileType.ROAD;
    
    // Vertical road
    if (x === Math.floor(MAP_WIDTH / 2) || x === Math.floor(MAP_WIDTH / 2) + 1) {
        for(let y=0; y<MAP_HEIGHT; y++) {
            map[y][x].type = TileType.ROAD;
        }
    }
  }

  // Generate Buildings
  const generateBuilding = (startX: number, startY: number, w: number, h: number) => {
    const sId = structureIdCounter++;
    for (let y = startY; y < startY + h; y++) {
      for (let x = startX; x < startX + w; x++) {
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
          if (x === startX || x === startX + w - 1 || y === startY || y === startY + h - 1) {
            // Walls (with chance for door)
            if (Math.random() > 0.9 && (x !== startX && x !== startX + w -1)) {
                 map[y][x].type = TileType.DOOR;
                 map[y][x].structureId = sId;
            } else {
                map[y][x].type = TileType.WALL;
            }
          } else {
            map[y][x].type = TileType.FLOOR;
            map[y][x].structureId = sId;
          }
        }
      }
    }
  };

  // Place random buildings
  for (let i = 0; i < 15; i++) {
    const w = 4 + Math.floor(Math.random() * 4);
    const h = 4 + Math.floor(Math.random() * 4);
    const x = Math.floor(Math.random() * (MAP_WIDTH - w));
    const y = Math.floor(Math.random() * (MAP_HEIGHT - h));
    
    // Check collision with roads (basic check)
    if (map[y][x].type === TileType.GRASS || map[y][x].type === TileType.FOREST) {
        generateBuilding(x, y, w, h);
    }
  }

  // Spawn Zombies
  for (let i = 0; i < 30; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * MAP_WIDTH);
      y = Math.floor(Math.random() * MAP_HEIGHT);
    } while (map[y][x].type === TileType.WALL || map[y][x].type === TileType.WATER);

    zombies.push({
      id: `z_${i}`,
      x,
      y,
      hp: 30,
      maxHp: 30,
      aggroRadius: 4,
      damage: 10
    });
  }

  return { map, zombies };
};

export const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const isWalkable = (tileType: TileType): boolean => {
    // Barricades are not walkable (must be destroyed or removed, simpler to make them blocking)
    return tileType !== TileType.WALL && tileType !== TileType.WATER && tileType !== TileType.BARRICADE;
};