import React, { useState } from 'react';
import { Player, GameLog, Item, Recipe, ItemType } from '../types';
import { Heart, Activity, Droplets, Zap, Backpack, Sword, ShieldAlert, Hammer, Wrench, Trash2, Check } from 'lucide-react';
import { RECIPES } from '../constants';

interface UIOverlayProps {
  player: Player;
  logs: GameLog[];
  nearbyZombies: number;
  onCraft: (recipe: Recipe) => void;
  onSelectBuild: (recipe: Recipe | null) => void;
  buildingModeRecipe: Recipe | null;
  onDropItem: (item: Item) => void;
  onEquipItem: (item: Item) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  player, logs, nearbyZombies, onCraft, onSelectBuild, buildingModeRecipe, onDropItem, onEquipItem 
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting'>('inventory');
  
  const StatBar = ({ icon: Icon, value, max, color, label }: any) => (
    <div className="flex items-center gap-2 w-full mb-1">
      <Icon size={16} className={`text-${color}-500`} />
      <div className="flex-1 h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
        <div 
          className={`h-full bg-${color}-600 transition-all duration-500`} 
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right text-stone-400">{Math.floor(value)}</span>
    </div>
  );

  const canCraft = (recipe: Recipe) => {
    return recipe.ingredients.every(ing => {
      const count = player.inventory.filter(i => i.name === ing.name).length;
      return count >= ing.count;
    });
  };

  return (
    <div className="flex flex-col h-full gap-2">
      
      {/* Status Panel - Fixed at Top */}
      <div className="bg-stone-900/90 border border-stone-700 p-3 rounded-lg shadow-xl backdrop-blur-sm shrink-0">
        <h2 className="text-stone-300 font-bold mb-2 flex items-center justify-between text-sm">
            <span>幸存者状态</span>
            {nearbyZombies > 0 && (
                <span className="text-red-500 animate-pulse text-xs flex items-center gap-1">
                    <ShieldAlert size={14} /> 危险
                </span>
            )}
        </h2>
        <StatBar icon={Heart} value={player.hp} max={player.maxHp} color="red" label="生命" />
        <StatBar icon={Zap} value={player.stamina} max={100} color="yellow" label="体力" />
        <StatBar icon={Activity} value={player.hunger} max={100} color="orange" label="饥饿" />
        <StatBar icon={Droplets} value={player.thirst} max={100} color="blue" label="口渴" />
        
        <div className="mt-2 pt-2 border-t border-stone-700">
            <div className="flex items-center gap-2 text-stone-400 text-xs">
                <Sword size={14} />
                <span>装备: </span>
                <span className="text-stone-200 font-bold">
                    {player.equippedWeapon ? player.equippedWeapon.name : '空手'}
                </span>
            </div>
        </div>
      </div>

      {/* Tabs - Fixed */}
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={() => { setActiveTab('inventory'); onSelectBuild(null); }}
          className={`flex-1 p-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${activeTab === 'inventory' ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-500'}`}
        >
          <Backpack size={14} /> 背包
        </button>
        <button 
          onClick={() => setActiveTab('crafting')}
          className={`flex-1 p-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${activeTab === 'crafting' ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-500'}`}
        >
          <Hammer size={14} /> 制造
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="bg-stone-900/90 border border-stone-700 p-3 rounded-lg shadow-xl flex-1 flex flex-col overflow-hidden backdrop-blur-sm min-h-0">
         
         {activeTab === 'inventory' && (
           <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {player.inventory.length === 0 && <p className="text-stone-600 italic text-xs text-center mt-4">背包是空的...</p>}
              {player.inventory.map((item, idx) => {
                  const isEquipped = player.equippedWeapon?.id === item.id;
                  return (
                    <div key={`${item.id}-${idx}`} className={`bg-stone-800 p-2 rounded border text-xs flex flex-col gap-1 group transition-colors ${isEquipped ? 'border-green-600 bg-stone-800/80' : 'border-stone-700 hover:border-stone-500'}`}>
                        <div className="flex justify-between items-center">
                            <span className={`font-bold ${isEquipped ? 'text-green-400' : 'text-stone-300'}`}>{item.name}</span>
                            <span className="text-stone-500 font-mono text-[10px] uppercase">{item.type}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {item.type === ItemType.WEAPON && (
                                <button 
                                    onClick={() => onEquipItem(item)}
                                    disabled={isEquipped}
                                    className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${isEquipped ? 'bg-green-900 text-green-200 cursor-default' : 'bg-stone-600 hover:bg-stone-500 text-white'}`}
                                >
                                    {isEquipped ? <><Check size={10} /> 已装备</> : '装备'}
                                </button>
                            )}
                             {item.type !== ItemType.WEAPON && <span></span>} {/* Spacer */}
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDropItem(item); }}
                                className="p-1 rounded bg-stone-900 hover:bg-red-900/50 text-stone-500 hover:text-red-400 transition-colors"
                                title="丢弃"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                  );
              })}
           </div>
         )}

         {activeTab === 'crafting' && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {buildingModeRecipe && (
                  <div className="bg-amber-900/50 p-2 rounded border border-amber-600 mb-2 animate-pulse shrink-0">
                      <p className="text-amber-200 text-xs font-bold text-center">建造模式已激活</p>
                      <p className="text-amber-400 text-[10px] text-center">点击地图上的格子进行建造</p>
                      <button onClick={() => onSelectBuild(null)} className="w-full mt-1 bg-stone-900 text-stone-400 text-xs py-1 rounded">取消</button>
                  </div>
              )}
              {RECIPES.map((recipe) => {
                const craftable = canCraft(recipe);
                return (
                  <div key={recipe.id} className={`p-2 rounded border ${craftable ? 'bg-stone-800 border-stone-600' : 'bg-stone-900/50 border-stone-800 opacity-60'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-200 font-bold text-sm">{recipe.name}</span>
                      <span className="text-[10px] uppercase text-stone-500">{recipe.type === 'item' ? '物品' : '建筑'}</span>
                    </div>
                    <div className="text-[10px] text-stone-400 mb-2">
                        {recipe.ingredients.map(ing => {
                           const have = player.inventory.filter(i => i.name === ing.name).length;
                           return <span key={ing.name} className={`mr-2 ${have >= ing.count ? 'text-green-600' : 'text-red-600'}`}>{ing.name}: {have}/{ing.count}</span>
                        })}
                    </div>
                    {recipe.type === 'item' ? (
                        <button 
                            disabled={!craftable}
                            onClick={() => onCraft(recipe)}
                            className={`w-full py-1 text-xs rounded font-bold ${craftable ? 'bg-stone-600 hover:bg-stone-500 text-white' : 'bg-stone-800 text-stone-600 cursor-not-allowed'}`}
                        >
                            制造
                        </button>
                    ) : (
                        <button 
                            disabled={!craftable}
                            onClick={() => onSelectBuild(recipe)}
                            className={`w-full py-1 text-xs rounded font-bold flex items-center justify-center gap-1 ${craftable ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-stone-800 text-stone-600 cursor-not-allowed'}`}
                        >
                            <Wrench size={10} /> 建造模式
                        </button>
                    )}
                  </div>
                );
              })}
            </div>
         )}
      </div>

      {/* Game Log - Fixed Height */}
      <div className="bg-black/80 border border-stone-700 p-2 rounded-lg shadow-xl h-32 shrink-0 flex flex-col font-mono text-xs overflow-hidden backdrop-blur-md">
        <div className="flex-1 overflow-y-auto flex flex-col-reverse gap-1 custom-scrollbar">
            {logs.map((log) => (
                <div key={log.id} className={`
                    ${log.type === 'combat' ? 'text-red-400' : ''}
                    ${log.type === 'loot' ? 'text-yellow-400' : ''}
                    ${log.type === 'ai' ? 'text-cyan-400 italic' : ''}
                    ${log.type === 'info' ? 'text-stone-400' : ''}
                    ${log.type === 'warning' ? 'text-orange-500 font-bold' : ''}
                `}>
                    <span className="opacity-30 mr-1">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                    {log.message}
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default UIOverlay;