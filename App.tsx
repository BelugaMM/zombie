import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, GridMap, GameLog, Zombie, TileType, Item, ItemType, BuildingContext, Recipe } from './types';
import { MAP_WIDTH, MAP_HEIGHT, VIEWPORT_SIZE, PLAYER_START_STATS, MOVEMENT_COST, STARTING_ITEMS, COMBAT_STAMINA_COST } from './constants';
import { generateMap, isWalkable, calculateDistance } from './utils/gameLogic';
import GridTile from './components/GridTile';
import UIOverlay from './components/UIOverlay';
import { generateLocationDescription, scavengeLocation, generateCombatEvent } from './services/geminiService';
import { Search, Map as MapIcon, RotateCcw } from 'lucide-react';

// Helper for IDs since we can't install uuid
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // --- State ---
  const [map, setMap] = useState<GridMap>([]);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [player, setPlayer] = useState<Player>({
    id: 'player',
    x: Math.floor(MAP_WIDTH / 2),
    y: Math.floor(MAP_HEIGHT / 2),
    ...PLAYER_START_STATS,
    inventory: [...STARTING_ITEMS],
    equippedWeapon: STARTING_ITEMS[0] as Item,
    name: 'Survivor'
  });
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBuilding, setCurrentBuilding] = useState<BuildingContext | null>(null);
  const [visitedStructures, setVisitedStructures] = useState<Set<number>>(new Set());
  
  // Building Mode State
  const [buildingRecipe, setBuildingRecipe] = useState<Recipe | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const addLog = (message: string, type: GameLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: generateId(), message, type, timestamp: Date.now() }]);
  };

  const updateMapVisibility = useCallback((currentMap: GridMap, px: number, py: number) => {
    const radius = 6;
    const newMap = [...currentMap];
    
    // Simple field of view
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
            // Line of sight check (simple distance based for now)
            if (calculateDistance(px, py, x, y) <= radius) {
                newMap[y][x].isVisible = true;
                newMap[y][x].isExplored = true;
            } else {
                newMap[y][x].isVisible = false;
            }
        }
      }
    }
    return newMap;
  }, []);

  // --- Initialization ---
  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const { map: initialMap, zombies: initialZombies } = generateMap();
    // Clear area around player
    const centerX = Math.floor(MAP_WIDTH / 2);
    const centerY = Math.floor(MAP_HEIGHT / 2);
    
    // Ensure player start is safe(ish)
    const safeZombies = initialZombies.filter(z => calculateDistance(centerX, centerY, z.x, z.y) > 8);

    const visibleMap = updateMapVisibility(initialMap, centerX, centerY);
    
    setMap(visibleMap);
    setZombies(safeZombies);
    setPlayer({
        id: 'player',
        x: centerX,
        y: centerY,
        ...PLAYER_START_STATS,
        inventory: [...STARTING_ITEMS],
        equippedWeapon: STARTING_ITEMS[0] as Item,
        name: 'Survivor'
    });
    setLogs([]);
    setVisitedStructures(new Set());
    addLog("第一天。我在一片荒野中醒来。我必须活下去。", "ai");
    addLog("提示: 按 'F' 键攻击附近的僵尸。", "info");
    setGameStarted(true);
  };

  // --- Logic ---
  
  const handleMove = async (dx: number, dy: number) => {
    if (player.hp <= 0 || isProcessing) return;

    const newX = player.x + dx;
    const newY = player.y + dy;

    // Boundary Check
    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;

    // Collision Check (Terrain)
    const targetTile = map[newY][newX];
    if (!isWalkable(targetTile.type)) {
        addLog("道路受阻。", "info");
        return;
    }

    // Collision Check (Zombies)
    // New: Walking into a zombie blocks you, but doesn't attack
    const targetZombie = zombies.find(z => z.x === newX && z.y === newY);
    if (targetZombie) {
        addLog("僵尸挡住了路！(按 F 攻击)", "warning");
        return; 
    }

    // Process Move (No Stamina Cost for Walking)
    setPlayer(prev => ({
        ...prev,
        x: newX,
        y: newY,
        stamina: Math.min(100, prev.stamina + 1.5), // Faster regen while walking
        hunger: Math.max(0, prev.hunger - MOVEMENT_COST.HUNGER),
        thirst: Math.max(0, prev.thirst - MOVEMENT_COST.THIRST)
    }));

    // Update Visibility
    setMap(prev => updateMapVisibility(prev, newX, newY));

    // Check for Building Entry (Narrative Trigger)
    if (targetTile.structureId && (!currentBuilding || currentBuilding.structureId !== targetTile.structureId)) {
        // Only trigger if not visited
        if (!visitedStructures.has(targetTile.structureId)) {
            setIsProcessing(true);
            const description = await generateLocationDescription(
                targetTile.type === TileType.FLOOR ? "House" : "Building", 
                "Foggy", 
                "Morning"
            );
            addLog(description, "ai");
            setVisitedStructures(prev => new Set(prev).add(targetTile.structureId!));
            setIsProcessing(false);
        }
        
        setCurrentBuilding({
            structureId: targetTile.structureId,
            type: "Building",
            description: null
        });
    } else if (!targetTile.structureId) {
        setCurrentBuilding(null);
    }

    // Enemy Turn
    processEnemyTurn(newX, newY);
  };

  const handleAttack = async () => {
      // Find nearest zombie within range (1.5 tiles, allow diagonals)
      let targetIndex = -1;
      let minDistance = 2.0;

      zombies.forEach((z, idx) => {
          const dist = calculateDistance(player.x, player.y, z.x, z.y);
          if (dist <= 1.5 && dist < minDistance) {
              minDistance = dist;
              targetIndex = idx;
          }
      });

      if (targetIndex === -1) {
          addLog("附近没有目标。", "info");
          return;
      }

      // Check Stamina
      if (player.stamina < COMBAT_STAMINA_COST) {
          addLog("你太累了，无法攻击！", "warning");
          return;
      }

      const zombie = zombies[targetIndex];
      const weaponDamage = player.equippedWeapon ? player.equippedWeapon.value : 5;
      const damageDealt = Math.floor(weaponDamage + Math.random() * 5); // Add variance
      
      const newZombieHp = zombie.hp - damageDealt;
      
      // Consume Stamina
      setPlayer(prev => ({
          ...prev,
          stamina: Math.max(0, prev.stamina - COMBAT_STAMINA_COST)
      }));

      const flavorText = await generateCombatEvent("Attack with " + (player.equippedWeapon?.name || "fists"), player.hp, newZombieHp);
      addLog(`${flavorText} (-${damageDealt} HP)`, "combat");

      if (newZombieHp <= 0) {
          // Zombie Killed
          setZombies(prev => prev.filter((_, idx) => idx !== targetIndex));
          addLog("僵尸倒下了。", "combat");
      } else {
          // Update Zombie HP
          setZombies(prev => {
              const newZombies = [...prev];
              newZombies[targetIndex] = { ...zombie, hp: newZombieHp };
              return newZombies;
          });
      }
      
      processEnemyTurn(player.x, player.y);
  };

  const processEnemyTurn = (playerX: number, playerY: number) => {
      setZombies(prevZombies => {
          return prevZombies.map(zombie => {
              const dist = calculateDistance(playerX, playerY, zombie.x, zombie.y);
              
              if (dist <= 1.5) {
                  // Attack Player
                  const dmg = Math.floor(Math.random() * zombie.damage);
                  if (dmg > 0) {
                      setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
                      addLog(`僵尸抓伤了你！ (-${dmg} HP)`, "warning");
                  } else {
                      addLog(`你躲开了僵尸的扑击！`, "info");
                  }
                  return zombie;
              } else if (dist <= zombie.aggroRadius) {
                  // Move towards player
                  const dx = Math.sign(playerX - zombie.x);
                  const dy = Math.sign(playerY - zombie.y);
                  
                  let nextX = zombie.x + dx;
                  let nextY = zombie.y + dy;

                  // Collision check (avoid walls, other zombies)
                  const tileX = map[zombie.y][nextX];
                  const tileY = map[nextY][zombie.x];

                  // Only move if empty space
                  if (isWalkable(tileX.type) && !zombies.some(z => z.x === nextX && z.y === zombie.y) && !(nextX === playerX && zombie.y === playerY)) {
                      return { ...zombie, x: nextX, y: zombie.y }; 
                  } else if (isWalkable(tileY.type) && !zombies.some(z => z.x === zombie.x && z.y === nextY) && !(zombie.x === playerX && nextY === playerY)) {
                      return { ...zombie, x: zombie.x, y: nextY }; 
                  }
                  
                  return zombie; // Stuck
              }
              return zombie; // Idle
          });
      });
  };

  const handleScavenge = async () => {
    if (isProcessing) return;
    const currentTile = map[player.y][player.x];
    
    // Allow scavenging anywhere, but better loot indoors? No, strictly indoors or special tiles for now.
    // For dropped items, we might want to check the tile first?
    // Current requirement: "Drop item". Logic implies we can pick up? 
    // Simplified: Scavenge generates NEW loot. Picking up dropped items is a separate feature usually.
    // However, I will implement "Scavenge" to trigger the genAI loot.
    
    if (currentTile.type !== TileType.FLOOR && currentTile.type !== TileType.GRASS && currentTile.type !== TileType.ROAD) {
         // Just allow scavenging everywhere but warn if result is empty
    }
    
    // Only indoors gives good loot
    if (currentTile.type !== TileType.FLOOR) {
        addLog("在野外很难找到好东西...", "info");
    }
    
    setIsProcessing(true);
    addLog("正在搜索...", "info");

    const buildingType = currentTile.type === TileType.FLOOR ? "House" : "Wilderness";
    const result = await scavengeLocation(buildingType);
    
    addLog(result.flavorText, "ai");
    
    if (result.items && result.items.length > 0) {
        const newItems: Item[] = result.items.map(i => ({
            id: generateId(),
            name: i.name || "未知物品",
            type: i.type as ItemType || ItemType.RESOURCE,
            description: i.description || "有用的东西。",
            value: i.value || 1
        }));
        
        setPlayer(prev => ({
            ...prev,
            inventory: [...prev.inventory, ...newItems],
            hunger: Math.max(0, prev.hunger - 5),
            stamina: Math.max(0, prev.stamina - 10) 
        }));
        
        newItems.forEach(i => addLog(`找到: ${i.name}`, "loot"));
    } else {
        setPlayer(prev => ({
            ...prev,
            hunger: Math.max(0, prev.hunger - 2),
            stamina: Math.max(0, prev.stamina - 5)
        }));
    }

    processEnemyTurn(player.x, player.y);
    setIsProcessing(false);
  };

  const handleCraft = (recipe: Recipe) => {
      const newInventory = [...player.inventory];
      for (const ing of recipe.ingredients) {
          let needed = ing.count;
          for (let i = newInventory.length - 1; i >= 0; i--) {
              if (newInventory[i].name === ing.name && needed > 0) {
                  newInventory.splice(i, 1);
                  needed--;
              }
          }
          if (needed > 0) {
              addLog("缺少材料！", "warning");
              return;
          }
      }

      if (recipe.type === 'item' && recipe.resultItem) {
          newInventory.push({
              id: generateId(),
              ...recipe.resultItem
          } as Item);
          addLog(`制造了 ${recipe.resultItem.name}`, "loot");
      }

      setPlayer(prev => ({ ...prev, inventory: newInventory }));
  };

  const handleBuildClick = (x: number, y: number) => {
      if (!buildingRecipe || !buildingRecipe.resultTileType) return;
      
      const dist = calculateDistance(player.x, player.y, x, y);
      if (dist > 1.5) {
          addLog("太远了，无法建造。", "warning");
          return;
      }

      const canAfford = buildingRecipe.ingredients.every(ing => 
        player.inventory.filter(i => i.name === ing.name).length >= ing.count
      );

      if (!canAfford) {
          addLog("材料不足。", "warning");
          setBuildingRecipe(null);
          return;
      }

      const targetTile = map[y][x];
      if (targetTile.type === TileType.WALL || targetTile.type === TileType.WATER || targetTile.type === TileType.BARRICADE) {
          addLog("无法在这里建造。", "warning");
          return;
      }
      
      if (zombies.some(z => z.x === x && z.y === y)) {
          addLog("不能在僵尸身上建造！", "warning");
          return;
      }

      const newInventory = [...player.inventory];
      for (const ing of buildingRecipe.ingredients) {
          let needed = ing.count;
          for (let i = newInventory.length - 1; i >= 0; i--) {
              if (newInventory[i].name === ing.name && needed > 0) {
                  newInventory.splice(i, 1);
                  needed--;
              }
          }
      }

      const newMap = [...map];
      newMap[y][x] = { ...newMap[y][x], type: buildingRecipe.resultTileType };
      setMap(newMap);
      setPlayer(prev => ({ ...prev, inventory: newInventory }));
      addLog(`建造了 ${buildingRecipe.name}`, "loot");
      
      setBuildingRecipe(null);
  };

  const handleDropItem = (item: Item) => {
    setPlayer(prev => {
        const newInv = prev.inventory.filter(i => i.id !== item.id);
        
        // If equipped item is dropped, unequip it
        const newEquipped = prev.equippedWeapon?.id === item.id ? null : prev.equippedWeapon;
        
        return {
            ...prev,
            inventory: newInv,
            equippedWeapon: newEquipped
        };
    });
    addLog(`丢弃了 ${item.name}`, "info");
    // Ideally we would add to map here, but for simplicity we just destroy it
  };

  const handleEquipItem = (item: Item) => {
    if (item.type !== ItemType.WEAPON) return;
    setPlayer(prev => ({
        ...prev,
        equippedWeapon: item
    }));
    addLog(`装备了 ${item.name}`, "info");
  };

  // --- Keyboard Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (player.hp <= 0) return;
      
      // Ignore key presses if typing in inputs (if any existed)
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          handleMove(0, -1);
          break;
        case 's':
        case 'arrowdown':
          handleMove(0, 1);
          break;
        case 'a':
        case 'arrowleft':
          handleMove(-1, 0);
          break;
        case 'd':
        case 'arrowright':
          handleMove(1, 0);
          break;
        case 'e':
          handleScavenge();
          break;
        case 'f':
          handleAttack();
          break;
        case 'escape':
          setBuildingRecipe(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, map, zombies, isProcessing, currentBuilding, buildingRecipe, visitedStructures]);

  // --- Rendering Helpers ---
  const getVisibleTiles = () => {
    const startX = Math.max(0, player.x - Math.floor(VIEWPORT_SIZE / 2));
    const startY = Math.max(0, player.y - Math.floor(VIEWPORT_SIZE / 2));
    const safeStartX = Math.min(startX, MAP_WIDTH - VIEWPORT_SIZE);
    const safeStartY = Math.min(startY, MAP_HEIGHT - VIEWPORT_SIZE);
    return { startX: Math.max(0, safeStartX), startY: Math.max(0, safeStartY) };
  };

  const { startX, startY } = getVisibleTiles();

  if (!gameStarted) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-950 overflow-hidden text-stone-200 font-sans">
      
      {/* --- Main Game View (Left Side) --- */}
      <div className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden border-r border-stone-800 ${buildingRecipe ? 'cursor-crosshair' : ''}`}>
        
        {/* Game Over Screen */}
        {player.hp <= 0 && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-in fade-in duration-1000">
                <h1 className="text-6xl font-bold text-red-600 mb-4 font-mono">你死了</h1>
                <p className="text-stone-400 mb-8">生存天数: 1</p>
                <button 
                    onClick={initGame}
                    className="flex items-center gap-2 px-6 py-3 bg-red-800 hover:bg-red-700 text-white rounded font-bold transition-all"
                >
                    <RotateCcw /> 重生
                </button>
            </div>
        )}

        {/* The Grid */}
        <div 
          className="grid gap-0 transition-transform duration-300 shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${VIEWPORT_SIZE}, minmax(0, 1fr))`,
            width: `${VIEWPORT_SIZE * 48}px`, 
          }}
        >
          {Array.from({ length: VIEWPORT_SIZE * VIEWPORT_SIZE }).map((_, i) => {
            const row = Math.floor(i / VIEWPORT_SIZE);
            const col = i % VIEWPORT_SIZE;
            const mapY = startY + row;
            const mapX = startX + col;

            if (mapY >= MAP_HEIGHT || mapX >= MAP_WIDTH) return <div key={i} className="w-12 h-12 bg-black" />;

            const tile = map[mapY][mapX];
            const tileZombie = zombies.find(z => z.x === mapX && z.y === mapY);
            const isPlayer = player.x === mapX && player.y === mapY;

            return (
              <GridTile 
                key={`${mapX}-${mapY}`} 
                tile={tile} 
                player={isPlayer ? player : undefined}
                zombie={tileZombie}
                isCenter={false}
                isInteractable={!!buildingRecipe}
                onClick={handleBuildClick}
              />
            );
          })}
        </div>
        
        {/* Controls Hint Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/60 p-3 rounded text-xs font-mono text-stone-400 pointer-events-none border border-stone-800 backdrop-blur-sm">
            <p className="font-bold text-stone-200 mb-1">控制</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>WASD / 箭头</span> <span>移动</span>
                <span>F</span> <span className="text-red-400">攻击</span>
                <span>E</span> <span className="text-amber-400">搜刮</span>
                <span>ESC</span> <span>取消建造</span>
            </div>
        </div>
      </div>

      {/* --- HUD / Sidebar (Right Side) --- */}
      {/* Used h-screen and flex-col to ensure it fills height but doesn't overflow improperly */}
      <div className="w-full md:w-96 bg-stone-900 border-l border-stone-800 flex flex-col shadow-2xl z-10 h-full max-h-screen">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-800 shrink-0">
            <h1 className="text-2xl font-black text-stone-100 tracking-tighter">Z-SURVIVOR</h1>
            <p className="text-xs text-stone-500 font-mono flex items-center gap-2">
                <MapIcon size={12} />
                {map[player.y] && map[player.y][player.x] ? map[player.y][player.x].type.toUpperCase() : 'UNKNOWN'} 
                {currentBuilding ? ` [${currentBuilding.structureId}]` : ''}
            </p>
        </div>

        {/* Main Content (Inventory/Stats) - Grows to fill space */}
        <div className="flex-1 overflow-hidden p-4 min-h-0">
            <UIOverlay 
                player={player} 
                logs={logs} 
                nearbyZombies={zombies.filter(z => calculateDistance(player.x, player.y, z.x, z.y) < 5).length}
                onCraft={handleCraft}
                onSelectBuild={setBuildingRecipe}
                buildingModeRecipe={buildingRecipe}
                onDropItem={handleDropItem}
                onEquipItem={handleEquipItem}
            />
        </div>

        {/* Footer Actions - Always Visible */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 shrink-0 grid grid-cols-2 gap-2">
            <button 
                onClick={handleScavenge}
                disabled={isProcessing || player.hp <= 0}
                className={`
                    p-3 rounded flex items-center justify-center gap-2 font-bold transition-all shadow-lg
                    ${isProcessing ? 'bg-stone-700 text-stone-500' : 'bg-amber-700 hover:bg-amber-600 text-amber-100 active:scale-95'}
                `}
            >
                {isProcessing ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"/> : <Search size={18} />}
                搜刮 (E)
            </button>
            <button 
                onClick={() => addLog("功能开发中...", "info")}
                className="p-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded flex items-center justify-center gap-2 font-bold shadow-lg active:scale-95"
            >
                <MapIcon size={18} /> 地图
            </button>
        </div>
      </div>
    </div>
  );
};

export default App;