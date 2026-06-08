// Types partagés de l'application LocalStream

export interface VideoFile {
  file?: File;
  size?: number;
  lastModified?: number;
  url: string;
  name: string;
  type: string;
  path: string;
  nativeUri?: string;
  subtitleNativePath?: string; // sous-titre auto-détecté (Android)
  subtitleUrl?: string;        // sous-titre auto-détecté (web, blob URL)
  seriesName?: string;
  season?: number;
  episode?: number;
  isSeriesGroup?: boolean;
  isTvSeries?: boolean;
  episodes?: VideoFile[];
  cleanTitle?: string;
}

export interface Subtitle {
  id: string;
  language: string;
  filename: string;
  url?: string;
}

export interface Playlist {
  id: string;
  name: string;
  videoNames: string[];
}

export const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire", 18: "Drame", 10751: "Familial", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère", 10749: "Romance", 878: "Science-Fiction", 10770: "Téléfilm", 53: "Thriller", 10752: "Guerre", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};
