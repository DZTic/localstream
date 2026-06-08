import React from 'react';
import { Home, Film, ListVideo, History } from 'lucide-react';

export interface BottomNavProps {
  activeTab: string;
  isLibraryViewActive: boolean;
  onHome: () => void;
  onLibrary: () => void;
  onPlaylists: () => void;
  onHistory: () => void;
}

/** Barre de navigation mobile fixée en bas (masquée sur desktop). */
const BottomNavComponent: React.FC<BottomNavProps> = ({
  activeTab, isLibraryViewActive, onHome, onLibrary, onPlaylists, onHistory,
}) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 z-40 flex items-center justify-around pb-safe pt-2 px-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
    <button
      onClick={onHome}
      className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'home' && !isLibraryViewActive ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <Home className="w-6 h-6 mb-1" />
      <span className="text-[10px] font-bold">Accueil</span>
    </button>

    <button
      onClick={onLibrary}
      className={`flex flex-col items-center p-2 transition-colors ${isLibraryViewActive ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <Film className="w-6 h-6 mb-1" />
      <span className="text-[10px] font-bold">Bibliothèque</span>
    </button>

    <button
      onClick={onPlaylists}
      className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'playlists' ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <ListVideo className="w-6 h-6 mb-1" />
      <span className="text-[10px] font-bold">Listes</span>
    </button>

    <button
      onClick={onHistory}
      className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'history' ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <History className="w-6 h-6 mb-1" />
      <span className="text-[10px] font-bold">Déjà vu</span>
    </button>
  </nav>
);

export const BottomNav = React.memo(BottomNavComponent);
