import { VideoFile } from './types';

export interface FilterSortOptions {
  sortBy: string;                              // 'alpha' | 'date' | 'size' | 'duration'
  filterGenre: number | 'all';
  filterResolution: string;                    // 'all' | '4k' | '1080p' | '720p' | 'sd'
  releaseDates: Record<string, string>;
  videoGenres: Record<string, number[]>;
  videoDurations: Record<string, number>;
  watchedVideos: Record<string, boolean>;
}

/**
 * Filtre (genre, résolution) puis trie une liste de vidéos regroupées.
 * Les contenus déjà vus sont systématiquement renvoyés en fin de liste.
 * Fonction pure : ne dépend que de ses arguments.
 */
export const filterAndSortVideos = (
  videos: VideoFile[],
  opts: FilterSortOptions
): VideoFile[] => {
  const { sortBy, filterGenre, filterResolution, releaseDates, videoGenres, videoDurations, watchedVideos } = opts;
  let result = [...videos];

  if (filterGenre !== 'all') {
    result = result.filter(v => {
      const lookupKey = v.isSeriesGroup ? v.seriesName! : v.name;
      const genres = videoGenres[lookupKey];
      return genres && genres.includes(filterGenre as number);
    });
  }

  if (filterResolution !== 'all') {
    result = result.filter(v => {
      const nameLower = (v.isSeriesGroup ? (v.episodes![0]?.name || v.name) : v.name).toLowerCase();
      if (filterResolution === '4k') return nameLower.includes('2160p') || nameLower.includes('4k');
      if (filterResolution === '1080p') return nameLower.includes('1080p');
      if (filterResolution === '720p') return nameLower.includes('720p');
      if (filterResolution === 'sd') return !nameLower.match(/1080p|720p|2160p|4k/);
      return true;
    });
  }

  result.sort((a, b) => {
    // Les contenus vus sont relégués en fin de liste (priorité au non-vu).
    const aWatched = a.isSeriesGroup ? a.episodes?.every(ep => !!watchedVideos[ep.name]) : !!watchedVideos[a.name];
    const bWatched = b.isSeriesGroup ? b.episodes?.every(ep => !!watchedVideos[ep.name]) : !!watchedVideos[b.name];
    if (aWatched !== bWatched) return aWatched ? 1 : -1;

    if (sortBy === 'alpha') {
      const nameA = a.isSeriesGroup ? a.seriesName! : a.name;
      const nameB = b.isSeriesGroup ? b.seriesName! : b.name;
      return nameA.localeCompare(nameB);
    } else if (sortBy === 'date') {
      const lookupA = a.isSeriesGroup ? a.seriesName! : a.name;
      const lookupB = b.isSeriesGroup ? b.seriesName! : b.name;
      const dateA = releaseDates[lookupA] || (a.file?.lastModified || a.lastModified || 0).toString();
      const dateB = releaseDates[lookupB] || (b.file?.lastModified || b.lastModified || 0).toString();
      return dateB.localeCompare(dateA);
    } else if (sortBy === 'size') {
      const sizeA = a.isSeriesGroup ? a.episodes!.reduce((s, e) => s + (e.file?.size || e.size || 0), 0) : (a.file?.size || a.size || 0);
      const sizeB = b.isSeriesGroup ? b.episodes!.reduce((s, e) => s + (e.file?.size || e.size || 0), 0) : (b.file?.size || b.size || 0);
      return sizeB - sizeA;
    } else if (sortBy === 'duration') {
      const durA = a.isSeriesGroup ? a.episodes!.reduce((s, e) => s + (videoDurations[e.name] || 0), 0) : (videoDurations[a.name] || 0);
      const durB = b.isSeriesGroup ? b.episodes!.reduce((s, e) => s + (videoDurations[e.name] || 0), 0) : (videoDurations[b.name] || 0);
      return durB - durA;
    }
    return 0;
  });

  return result;
};
