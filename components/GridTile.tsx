import React from 'react';
import { Tile, TileType, Entity, Zombie } from '../types';
import { User, Skull, Box, DoorOpen, Shield } from 'lucide-react';

interface GridTileProps {
  tile: Tile;
  player?: Entity;
  zombie?: Zombie;
  isCenter: boolean;
  onClick: (x: number, y: number) => void;
  isInteractable: boolean;
}

const GridTile: React.FC<GridTileProps> = ({ tile, player, zombie, isCenter, onClick, isInteractable }) => {
  if (!tile.isExplored) {
    return <div className="w-12 h-12 bg-black border-r border-b border-stone-900/50" />;
  }

  const getBaseStyle = (type: TileType) => {
    switch (type) {
      case TileType.GRASS: return 'bg-green-900 border-green-800';
      case TileType.FOREST: return 'bg-emerald-950 border-emerald-900';
      case TileType.ROAD: return 'bg-stone-700 border-stone-600 border-dashed';
      case TileType.FLOOR: return 'bg-amber-900/80 border-amber-900';
      case TileType.WALL: return 'bg-stone-500 border-stone-400 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] z-10';
      case TileType.DOOR: return 'bg-amber-700 border-amber-600';
      case TileType.WATER: return 'bg-blue-900 border-blue-800';
      case TileType.BARRICADE: return 'bg-amber-800 border-amber-700';
      default: return 'bg-gray-900';
    }
  };

  // Pseudo-3D effect logic
  const isWall = tile.type === TileType.WALL;
  const isFogged = !tile.isVisible && tile.isExplored;
  
  return (
    <div 
      onClick={() => onClick(tile.x, tile.y)}
      className={`
        w-12 h-12 relative flex items-center justify-center 
        transition-all duration-300
        ${getBaseStyle(tile.type)}
        ${isWall ? '' : 'border-r border-b'}
        ${isFogged ? 'brightness-[0.25] grayscale' : ''}
        ${isInteractable && tile.isVisible ? 'cursor-pointer hover:ring-2 hover:ring-white/50' : ''}
      `}
    >
      {tile.type === TileType.DOOR && <DoorOpen size={20} className="text-amber-300 opacity-80" />}
      
      {tile.type === TileType.BARRICADE && (
          <div className="absolute inset-1 border-2 border-stone-400 bg-stone-700/50 flex items-center justify-center">
             <div className="w-full h-1 bg-stone-400 rotate-45 absolute"></div>
             <div className="w-full h-1 bg-stone-400 -rotate-45 absolute"></div>
          </div>
      )}

      {/* Wall 3D top illusion */}
      {isWall && (
          <div className="absolute -top-3 w-full h-3 bg-stone-400 border-t border-stone-300"></div>
      )}

      {/* Render Items if visible */}
      {!player && !zombie && tile.items.length > 0 && tile.isVisible && (
        <Box size={16} className="text-yellow-500 animate-pulse" />
      )}

      {/* Render Zombie */}
      {zombie && tile.isVisible && (
        <div className="relative z-20 animate-bounce-slow pointer-events-none">
           <Skull size={24} className="text-red-500 drop-shadow-lg" />
           {/* Simple health bar for zombie */}
           <div className="absolute -top-2 left-0 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
             <div className="h-full bg-red-600" style={{ width: `${(zombie.hp / zombie.maxHp) * 100}%` }}></div>
           </div>
        </div>
      )}

      {/* Render Player */}
      {player && (
        <div className="relative z-30 pointer-events-none">
            <User size={28} className="text-cyan-400 drop-shadow-glow" strokeWidth={2.5} />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/50 blur-[2px] rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default GridTile;