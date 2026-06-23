import { useState, useEffect } from 'react';
import { Playlist } from '../lib/types';
import { safeSetItem } from '../lib/utils';

const loadPlaylists = (): Playlist[] => {
  try {
    const saved = localStorage.getItem('playlists');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

/**
 * Gère les playlists : état persistant (localStorage), playlist sélectionnée,
 * et opérations CRUD. Logique extraite d'App.tsx (#17).
 */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>(loadPlaylists);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    safeSetItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  /** Crée une playlist, optionnellement pré-remplie. Ignore un nom vide. */
  const createPlaylist = (name: string, initialVideoNames: string[] = []) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: trimmed,
      videoNames: initialVideoNames,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  /** Ajoute ou retire une vidéo d'une playlist. */
  const toggleVideoInPlaylist = (playlistId: string, videoName: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      const hasVideo = p.videoNames.includes(videoName);
      return {
        ...p,
        videoNames: hasVideo
          ? p.videoNames.filter(n => n !== videoName)
          : [...p.videoNames, videoName],
      };
    }));
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    setSelectedPlaylist(prev => (prev?.id === playlistId ? null : prev));
  };

  const removeVideoFromPlaylist = (playlistId: string, videoName: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, videoNames: p.videoNames.filter(n => n !== videoName) }
        : p
    ));
    setSelectedPlaylist(prev =>
      prev?.id === playlistId
        ? { ...prev, videoNames: prev.videoNames.filter(n => n !== videoName) }
        : prev
    );
  };

  return {
    playlists,
    selectedPlaylist,
    setSelectedPlaylist,
    createPlaylist,
    toggleVideoInPlaylist,
    deletePlaylist,
    removeVideoFromPlaylist,
  };
}
