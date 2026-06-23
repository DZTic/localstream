import { useState, useEffect } from 'react';
import { VideoFile } from '../lib/types';
import { safeSetItem } from '../lib/utils';

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Gère l'état de visionnage : vu/non vu, progression, position de reprise,
 * historique récent et disponibilité forcée. Logique extraite d'App.tsx (#17).
 *
 * `groupedVideos` est nécessaire à `toggleWatched` pour propager l'état
 * vu entre une série et ses épisodes.
 */
export function useWatchedState(groupedVideos: VideoFile[]) {
  const [watchedVideos, setWatchedVideos] = useState<Record<string, boolean>>(() => loadJson('watchedVideos', {}));
  const [watchProgress, setWatchProgress] = useState<Record<string, number>>(() => loadJson('watchProgress', {}));
  const [watchPositions, setWatchPositions] = useState<Record<string, number>>(() => loadJson('watchPositions', {}));
  const [recentlyWatched, setRecentlyWatched] = useState<string[]>(() => loadJson('recentlyWatched', []));
  const [forceAvailableVideos, setForceAvailableVideos] = useState<Record<string, boolean>>(() => loadJson('forceAvailableVideos', {}));

  useEffect(() => {
    safeSetItem('watchPositions', JSON.stringify(watchPositions));
  }, [watchPositions]);

  /** Bascule l'état vu d'un film/série, avec propagation série ↔ épisodes. */
  const toggleWatched = (videoName: string) => {
    setWatchedVideos(prev => {
      // Trouver si c'est un groupe de vidéos (série ou collection)
      const group = groupedVideos.find(v => (v.seriesName === videoName || v.name === videoName) && v.isSeriesGroup);

      let isCurrentlyWatched;
      if (group && group.episodes) {
        // Pour un groupe, on considère qu'il est vu si TOUS les épisodes sont vus
        isCurrentlyWatched = group.episodes.every(ep => !!prev[ep.name]);
      } else {
        isCurrentlyWatched = !!prev[videoName];
      }

      const newState = { ...prev };
      const targetValue = !isCurrentlyWatched;

      if (group && group.episodes) {
        // On marque le nom du groupe ET tous ses épisodes
        newState[videoName] = targetValue;
        group.episodes.forEach(ep => {
          newState[ep.name] = targetValue;
        });
      } else {
        // C'est un épisode seul
        newState[videoName] = targetValue;

        // Propagation automatique vers le groupe de série s'il existe
        const parentSeries = groupedVideos.find(g => g.isSeriesGroup && g.episodes?.some(ep => ep.name === videoName));
        if (parentSeries) {
          const seriesKey = parentSeries.seriesName || parentSeries.name;
          const allEpsWatched = parentSeries.episodes!.every(ep => !!newState[ep.name]);
          newState[seriesKey] = allEpsWatched;
        }
      }

      safeSetItem('watchedVideos', JSON.stringify(newState));
      return newState;
    });
  };

  /** Efface la progression et la position de reprise d'une vidéo. */
  const resetProgress = (videoName: string) => {
    setWatchProgress(prev => {
      const newState = { ...prev };
      delete newState[videoName];
      safeSetItem('watchProgress', JSON.stringify(newState));
      return newState;
    });
    setWatchPositions(prev => {
      const newState = { ...prev };
      delete newState[videoName];
      safeSetItem('watchPositions', JSON.stringify(newState));
      return newState;
    });
  };

  const toggleForceAvailable = (videoName: string) => {
    setForceAvailableVideos(prev => {
      const newState = { ...prev, [videoName]: !prev[videoName] };
      safeSetItem('forceAvailableVideos', JSON.stringify(newState));
      return newState;
    });
  };

  /** Ajoute manuellement une entrée d'historique (marquée vue + disponible). */
  const addManualHistoryItem = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;

    setWatchedVideos(prev => {
      const newState = { ...prev, [name]: true };
      safeSetItem('watchedVideos', JSON.stringify(newState));
      return newState;
    });

    setForceAvailableVideos(prev => {
      const newState = { ...prev, [name]: true };
      safeSetItem('forceAvailableVideos', JSON.stringify(newState));
      return newState;
    });
  };

  return {
    watchedVideos,
    watchProgress, setWatchProgress,
    watchPositions, setWatchPositions,
    recentlyWatched, setRecentlyWatched,
    forceAvailableVideos,
    toggleWatched,
    resetProgress,
    toggleForceAvailable,
    addManualHistoryItem,
  };
}
