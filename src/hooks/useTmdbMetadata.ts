import { useState, useEffect, useMemo } from 'react';
import { VideoFile } from '../lib/types';
import { getCleanTitle, safeSetItem } from '../lib/utils';
import { groupVideos } from '../lib/grouping';
import {
  searchMulti, searchMovie, getMovieDetails, getCollection, getSeason,
  posterUrl, backdropUrl, stillUrl,
} from '../lib/tmdb';

// Lecture JSON tolérante depuis localStorage.
const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

interface Params {
  videos: VideoFile[];
  whitelistedVideos: Set<string>;
  tmdbApiKey: string;
  addLog: (msg: string) => void;
}

/**
 * Encapsule toute la couche métadonnées TMDB :
 *  - état (affiches, backdrops, synopsis, genres, dates, collections, épisodes…)
 *  - regroupement des vidéos (groupedVideos)
 *  - persistance localStorage
 *  - récupération automatique (en masse) et manuelle (un titre) depuis TMDB
 */
export function useTmdbMetadata({ videos, whitelistedVideos, tmdbApiKey, addLog }: Params) {
  const [posters, setPosters] = useState<Record<string, string>>(() => loadJson('moviePosters', {}));
  const [backdrops, setBackdrops] = useState<Record<string, string>>(() => loadJson('movieBackdrops', {}));
  const [overviews, setOverviews] = useState<Record<string, string>>(() => loadJson('movieOverviews', {}));
  const [releaseDates, setReleaseDates] = useState<Record<string, string>>(() => loadJson('movieReleaseDates', {}));
  const [videoGenres, setVideoGenres] = useState<Record<string, number[]>>(() => loadJson('movieGenres', {}));
  const [tmdbIds, setTmdbIds] = useState<Record<string, number>>(() => loadJson('tmdbIds', {}));
  // movieCollections: videoName -> { id: collectionTmdbId, name: collectionName }
  const [movieCollections, setMovieCollections] = useState<Record<string, { id: number; name: string }>>(() => loadJson('movieCollections', {}));
  const [episodeOverviews, setEpisodeOverviews] = useState<Record<string, string>>(() => loadJson('episodeOverviews', {}));
  const [episodePosters, setEpisodePosters] = useState<Record<string, string>>(() => loadJson('episodePosters', {}));
  const [episodeNames, setEpisodeNames] = useState<Record<string, string>>(() => loadJson('episodeNames', {}));

  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);

  const groupedVideos = useMemo(
    () => groupVideos(videos, movieCollections, releaseDates, whitelistedVideos),
    [videos, movieCollections, releaseDates, whitelistedVideos]
  );

  // Persistance du cache de métadonnées
  useEffect(() => {
    safeSetItem('moviePosters', JSON.stringify(posters));
    safeSetItem('movieBackdrops', JSON.stringify(backdrops));
    safeSetItem('movieOverviews', JSON.stringify(overviews));
    safeSetItem('movieReleaseDates', JSON.stringify(releaseDates));
    safeSetItem('movieGenres', JSON.stringify(videoGenres));
    safeSetItem('tmdbIds', JSON.stringify(tmdbIds));
    safeSetItem('movieCollections', JSON.stringify(movieCollections));
    safeSetItem('episodeOverviews', JSON.stringify(episodeOverviews));
    safeSetItem('episodePosters', JSON.stringify(episodePosters));
    safeSetItem('episodeNames', JSON.stringify(episodeNames));
  }, [posters, backdrops, overviews, releaseDates, videoGenres, tmdbIds, movieCollections, episodeOverviews, episodePosters, episodeNames]);

  // Récupération automatique en masse (affiches + épisodes)
  useEffect(() => {
    const fetchAllMetadata = async () => {
      if (!tmdbApiKey || groupedVideos.length === 0) {
        if (!tmdbApiKey && groupedVideos.length > 0) addLog("Clé TMDB manquante !");
        return;
      }

      setIsFetchingMetadata(true);
      addLog(`Démarrage de la récupération pour ${groupedVideos.length} films/séries regroupés.`);

      const processVideo = async (video: VideoFile) => {
        const lookupName = video.isSeriesGroup ? video.seriesName! : video.name;
        const cleanTitle = video.isSeriesGroup ? video.seriesName! : getCleanTitle(video.name);

        // Skip Phase 1 if already have poster
        let currentTvId = tmdbIds[lookupName];

        if (!posters[lookupName] && cleanTitle) {
          try {
            // Cas spécial : groupe saga → utiliser l'API /collection/{id} directement
            if (video.isSeriesGroup && !video.isTvSeries && video.episodes && video.episodes.length > 0) {
              // Récupérer l'ID de collection depuis le premier film de la saga
              const firstFilmCol = video.episodes
                .map(ep => movieCollections[ep.name])
                .find(col => !!col);

              if (firstFilmCol?.id) {
                const colData = await getCollection(tmdbApiKey, firstFilmCol.id);

                if (colData.id) {
                  if (colData.poster_path) setPosters(prev => ({ ...prev, [lookupName]: posterUrl(colData.poster_path)! }));
                  if (colData.backdrop_path) setBackdrops(prev => ({ ...prev, [lookupName]: backdropUrl(colData.backdrop_path)! }));
                  if (colData.overview) setOverviews(prev => ({ ...prev, [lookupName]: colData.overview }));
                  addLog(`Saga poster récupéré : ${lookupName}`);
                }
              }
            } else {
            const results = await searchMulti(tmdbApiKey, cleanTitle);

            if (results.length > 0) {
              let result = results.find((r: any) => {
                const name = (r.name || r.title || "").toLowerCase();
                const search = cleanTitle.toLowerCase();
                return name === search;
              });

              if (!result) {
                if (video.isTvSeries) {
                  result = results.find((r: any) => r.media_type === 'tv' && r.poster_path) ||
                           results.find((r: any) => r.poster_path) ||
                           results[0];
                } else {
                  result = results.find((r: any) => r.media_type === 'movie' && r.poster_path) ||
                           results.find((r: any) => r.poster_path) ||
                           results[0];
                }
              }

              if (result) {
                const updates: any = {};
                if (result.poster_path) updates.poster = posterUrl(result.poster_path);
                if (result.backdrop_path) updates.backdrop = backdropUrl(result.backdrop_path);
                if (result.overview) updates.overview = result.overview;
                if (result.release_date || result.first_air_date) updates.releaseDate = result.release_date || result.first_air_date;
                if (result.genre_ids) updates.genres = result.genre_ids;
                if (video.isTvSeries) {
                  updates.tmdbId = result.id;
                  currentTvId = result.id;
                }

                if (updates.poster) setPosters(prev => ({ ...prev, [lookupName]: updates.poster }));
                if (updates.backdrop) setBackdrops(prev => ({ ...prev, [lookupName]: updates.backdrop }));
                if (updates.overview) setOverviews(prev => ({ ...prev, [lookupName]: updates.overview }));
                if (updates.releaseDate) setReleaseDates(prev => ({ ...prev, [lookupName]: updates.releaseDate }));
                if (updates.genres) setVideoGenres(prev => ({ ...prev, [lookupName]: updates.genres }));
                if (updates.tmdbId) setTmdbIds(prev => ({ ...prev, [lookupName]: updates.tmdbId }));
                addLog(`Trouvé : ${cleanTitle}`);

                // Phase 1b : Récupérer la collection TMDB pour les films standalone
                if (!video.isSeriesGroup && result.media_type === 'movie' && result.id && !movieCollections[lookupName]) {
                  try {
                    const mData = await getMovieDetails(tmdbApiKey, result.id);
                    if (mData.belongs_to_collection) {
                      const col = { id: mData.belongs_to_collection.id, name: mData.belongs_to_collection.name };
                      setMovieCollections(prev => ({ ...prev, [lookupName]: col }));
                      addLog(`Saga détectée : ${mData.belongs_to_collection.name} pour ${cleanTitle}`);
                    }
                  } catch (colErr) {
                    console.warn('Erreur collection pour', cleanTitle, colErr);
                  }
                }
              } else {
                addLog(`Aucun résultat valide pour : ${cleanTitle}`);
              }
            } else {
              addLog(`TMDB : Aucun résultat pour : ${cleanTitle}`);
            }
            } // fin else (non-saga)
          } catch (error: any) {
            addLog(`Erreur Phase 1 (${cleanTitle}) : ${error.message || error}`);
            console.error("Error fetching Phase 1 for", lookupName, error);
          }
        }

        // Phase 2: Episodes (if series)
        if (video.isSeriesGroup && video.isTvSeries && currentTvId) {
          addLog(`Episodes pour ${video.seriesName} (${video.episodes?.length} ep. locaux)...`);
          const seasonsInLibrary = Array.from(new Set(video.episodes?.map(ep => ep.season ?? 1) || []));

          for (const seasonNum of seasonsInLibrary) {
            const seasonCacheKey = `${currentTvId}_s${seasonNum}`;
            if (episodeOverviews[seasonCacheKey]) continue;

            try {
              const sData = await getSeason(tmdbApiKey, currentTvId, seasonNum);

              if (sData.episodes) {
                const epOverviewsUpdate: Record<string, string> = { [seasonCacheKey]: "LOADED" };
                const epPostersUpdate: Record<string, string> = {};
                const epNamesUpdate: Record<string, string> = {};

                sData.episodes.forEach((ep: any) => {
                  const epKey = `${lookupName}_s${ep.season_number}_e${ep.episode_number}`;
                  epOverviewsUpdate[epKey] = ep.overview || "(Pas de synopsis disponible)";
                  epNamesUpdate[epKey] = ep.name || `Épisode ${ep.episode_number}`;
                  if (ep.still_path) epPostersUpdate[epKey] = stillUrl(ep.still_path)!;
                });

                setEpisodeOverviews(prev => ({ ...prev, ...epOverviewsUpdate }));
                setEpisodePosters(prev => ({ ...prev, ...epPostersUpdate }));
                setEpisodeNames(prev => ({ ...prev, ...epNamesUpdate }));
              }
            } catch (err) {
              console.error("Error fetching Phase 2 season", seasonNum, "for", lookupName, err);
            }
          }
        }
      };

      // Exécution par lots avec un pool de concurrence pour accélérer
      // la récupération tout en restant raisonnable pour l'API TMDB.
      const CONCURRENCY = 6;
      const queue = [...groupedVideos];
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0) {
          const video = queue.shift();
          if (!video) break;
          try {
            await processVideo(video);
          } catch (e) {
            console.error("Erreur traitement métadonnées", e);
          }
        }
      });
      await Promise.all(workers);

      setIsFetchingMetadata(false);
      addLog("Récupération terminée.");
    };

    fetchAllMetadata();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedVideos, tmdbApiKey]);

  // useEffect séparé : détecter les sagas TMDB sur les films standalone bruts
  useEffect(() => {
    const fetchCollections = async () => {
      if (!tmdbApiKey || videos.length === 0) return;

      // Filtrer les films qui : ne sont pas une série et n'ont pas encore de collection enregistrée
      const standalonefilms = videos.filter(v => {
        const isSeriesEp = !!v.name.match(/[sS]\d+[eE]\d+|\d+x\d+/i) || !!v.seriesName;
        return !isSeriesEp;
      });

      const processFilm = async (video: VideoFile) => {
        if (movieCollections[video.name]) return; // déjà connu
        const cleanTitle = getCleanTitle(video.name);
        if (!cleanTitle) return;

        try {
          // Cherche le film sur TMDB
          const results = await searchMovie(tmdbApiKey, cleanTitle);
          if (results.length === 0) return;

          const result = results.find((r: any) =>
            (r.title || '').toLowerCase() === cleanTitle.toLowerCase()
          ) || results[0];

          if (!result?.id) return;

          // Récupère les détails du film pour obtenir belongs_to_collection
          const dData = await getMovieDetails(tmdbApiKey, result.id);

          if (dData.belongs_to_collection) {
            const col = { id: dData.belongs_to_collection.id, name: dData.belongs_to_collection.name };
            setMovieCollections(prev => ({ ...prev, [video.name]: col }));
          }
        } catch (e) {
          // Silently ignore
        }
      };

      // Pool de concurrence (cf. fetchAllMetadata)
      const CONCURRENCY = 6;
      const queue = [...standalonefilms];
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0) {
          const video = queue.shift();
          if (!video) break;
          await processFilm(video);
        }
      });
      await Promise.all(workers);
    };

    fetchCollections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, tmdbApiKey]);

  // Rafraîchissement manuel d'un seul titre
  const fetchSingleMetadata = async (video: VideoFile) => {
    if (!tmdbApiKey) return;
    const lookupName = video.isSeriesGroup ? video.seriesName! : video.name;
    const cleanTitle = video.isSeriesGroup ? video.seriesName! : getCleanTitle(video.name);

    setIsRefreshingMetadata(true);
    addLog(`Rafraîchissement pour : ${cleanTitle}`);

    try {
      const results = await searchMulti(tmdbApiKey, cleanTitle);

      if (results.length > 0) {
        // Priority: Exact match
        let result = results.find((r: any) => {
          const name = (r.name || r.title || "").toLowerCase();
          return name === cleanTitle.toLowerCase();
        });

        if (!result) {
          if (video.isTvSeries) {
            result = results.find((r: any) => r.media_type === 'tv' && r.poster_path) ||
                     results.find((r: any) => r.poster_path) ||
                     results[0];
          } else {
            result = results.find((r: any) => r.media_type === 'movie' && r.poster_path) ||
                     results.find((r: any) => r.poster_path) ||
                     results[0];
          }
        }

        if (result) {
          const updates: any = {};
          if (result.poster_path) updates.poster = posterUrl(result.poster_path);
          if (result.backdrop_path) updates.backdrop = backdropUrl(result.backdrop_path);
          if (result.overview) updates.overview = result.overview;
          if (result.release_date || result.first_air_date) updates.releaseDate = result.release_date || result.first_air_date;
          if (result.genre_ids) updates.genres = result.genre_ids;

          let currentTvId = null;
          if (video.isTvSeries) {
            updates.tmdbId = result.id;
            currentTvId = result.id;
          }

          if (updates.poster) setPosters(prev => ({ ...prev, [lookupName]: updates.poster }));
          if (updates.backdrop) setBackdrops(prev => ({ ...prev, [lookupName]: updates.backdrop }));
          if (updates.overview) setOverviews(prev => ({ ...prev, [lookupName]: updates.overview }));
          if (updates.releaseDate) setReleaseDates(prev => ({ ...prev, [lookupName]: updates.releaseDate }));
          if (updates.genres) setVideoGenres(prev => ({ ...prev, [lookupName]: updates.genres }));
          if (updates.tmdbId) setTmdbIds(prev => ({ ...prev, [lookupName]: updates.tmdbId }));

          // Part 2: Episodes
          if (video.isSeriesGroup && video.isTvSeries && currentTvId) {
            const seasonsInLibrary = Array.from(new Set(video.episodes?.map(ep => ep.season ?? 1) || []));
            for (const seasonNum of seasonsInLibrary) {
              const sData = await getSeason(tmdbApiKey, currentTvId, seasonNum);
              if (sData.episodes) {
                const epOverviewsUpdate: Record<string, string> = {};
                const epPostersUpdate: Record<string, string> = {};
                const epNamesUpdate: Record<string, string> = {};
                sData.episodes.forEach((ep: any) => {
                  const epKey = `${lookupName}_s${ep.season_number}_e${ep.episode_number}`;
                  epOverviewsUpdate[epKey] = ep.overview || "(Pas de synopsis disponible)";
                  epNamesUpdate[epKey] = ep.name || `Épisode ${ep.episode_number}`;
                  if (ep.still_path) epPostersUpdate[epKey] = stillUrl(ep.still_path)!;
                });
                setEpisodeOverviews(prev => ({ ...prev, ...epOverviewsUpdate }));
                setEpisodePosters(prev => ({ ...prev, ...epPostersUpdate }));
                setEpisodeNames(prev => ({ ...prev, ...epNamesUpdate }));
              }
            }
          }
          addLog("Mise à jour réussie");
        }
      }
    } catch (err) {
      console.error("Manual refresh error", err);
    }
    setIsRefreshingMetadata(false);
  };

  return {
    groupedVideos,
    posters, backdrops, overviews, releaseDates, videoGenres, tmdbIds,
    movieCollections, episodeOverviews, episodePosters, episodeNames,
    isFetchingMetadata, isRefreshingMetadata,
    fetchSingleMetadata,
  };
}
