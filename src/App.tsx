import React, { useState, useRef, useEffect } from 'react';
import { Settings, FolderOpen, Play, Search, X, Download, ChevronLeft, Subtitles, LogIn, Image as ImageIcon, Info, ListPlus, Check, Trash2, ListVideo, RefreshCw, Cloud } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Types
interface VideoFile {
  file?: File;
  size?: number;
  lastModified?: number;
  url: string;
  name: string;
  type: string;
  path: string;
  seriesName?: string;
  season?: number;
  episode?: number;
  isSeriesGroup?: boolean;
  episodes?: VideoFile[];
}

interface Subtitle {
  id: string;
  language: string;
  filename: string;
}

interface Playlist {
  id: string;
  name: string;
  videoNames: string[];
}

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire", 18: "Drame", 10751: "Familial", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère", 10749: "Romance", 878: "Science-Fiction", 10770: "Téléfilm", 53: "Thriller", 10752: "Guerre", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

export default function App() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // OpenSubtitles Credentials
  const [osApiKey, setOsApiKey] = useState(localStorage.getItem('osApiKey') || '');
  const [osUsername, setOsUsername] = useState(localStorage.getItem('osUsername') || '');
  const [osPassword, setOsPassword] = useState(localStorage.getItem('osPassword') || '');
  const [osToken, setOsToken] = useState(localStorage.getItem('osToken') || '');
  
  // TMDB Credentials & Posters
  const [tmdbApiKey, setTmdbApiKey] = useState(localStorage.getItem('tmdbApiKey') || '');
  const [posters, setPosters] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('moviePosters');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [backdrops, setBackdrops] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('movieBackdrops');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [overviews, setOverviews] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('movieOverviews');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [releaseDates, setReleaseDates] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('movieReleaseDates');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [videoGenres, setVideoGenres] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem('movieGenres');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  
  const [sortBy, setSortBy] = useState<'alpha' | 'date' | 'size' | 'duration'>('alpha');
  const [filterGenre, setFilterGenre] = useState<number | 'all'>('all');
  const [filterResolution, setFilterResolution] = useState<string | 'all'>('all');

  const [recentlyWatched, setRecentlyWatched] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recentlyWatched');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isSearchingSubs, setIsSearchingSubs] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string | null>(null);
  const [showSubtitlesModal, setShowSubtitlesModal] = useState(false);
  const [infoVideo, setInfoVideo] = useState<VideoFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'home' | 'playlists'>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);

  const [watchProgress, setWatchProgress] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('watchProgress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save credentials
  useEffect(() => {
    localStorage.setItem('osApiKey', osApiKey);
    localStorage.setItem('osUsername', osUsername);
    localStorage.setItem('osPassword', osPassword);
    localStorage.setItem('osToken', osToken);
  }, [osApiKey, osUsername, osPassword, osToken]);

  useEffect(() => {
    localStorage.setItem('tmdbApiKey', tmdbApiKey);
  }, [tmdbApiKey]);

  useEffect(() => {
    localStorage.setItem('moviePosters', JSON.stringify(posters));
    localStorage.setItem('movieBackdrops', JSON.stringify(backdrops));
    localStorage.setItem('movieOverviews', JSON.stringify(overviews));
    localStorage.setItem('movieReleaseDates', JSON.stringify(releaseDates));
    localStorage.setItem('movieGenres', JSON.stringify(videoGenres));
  }, [posters, backdrops, overviews, releaseDates, videoGenres]);

  const getCleanTitle = (filename: string) => {
    let title = filename.replace(/\.[^/.]+$/, "");
    title = title.replace(/[sS]\d{2}[eE]\d{2}.*/, "");
    title = title.replace(/(19|20)\d{2}.*/, "");
    title = title.replace(/[\.\-_]/g, " ");
    title = title.replace(/1080p|720p|2160p|4k|bluray|webrip|hdtv|x264|x265|hevc|vostfr|french|truefrench/ig, "");
    return title.trim();
  };

  useEffect(() => {
    if (!tmdbApiKey || videos.length === 0) return;

    const fetchAllMetadata = async () => {
      let newPosters = { ...posters };
      let newBackdrops = { ...backdrops };
      let newOverviews = { ...overviews };
      let newReleaseDates = { ...releaseDates };
      let newVideoGenres = { ...videoGenres };
      let hasChanges = false;

      for (const video of videos) {
        if (newPosters[video.name]) continue;

        const cleanTitle = getCleanTitle(video.name);
        if (!cleanTitle) continue;

        try {
          const res = await fetch(`/api/os/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanTitle)}&language=fr-FR`,
              method: 'GET'
            })
          });
          const data = await res.json();
          
          if (data.results && data.results.length > 0) {
            const result = data.results.find((r: any) => r.poster_path);
            if (result) {
              newPosters[video.name] = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
              if (result.backdrop_path) {
                newBackdrops[video.name] = `https://image.tmdb.org/t/p/original${result.backdrop_path}`;
              }
              if (result.overview) {
                newOverviews[video.name] = result.overview;
              }
              if (result.release_date || result.first_air_date) {
                newReleaseDates[video.name] = result.release_date || result.first_air_date;
              }
              if (result.genre_ids) {
                newVideoGenres[video.name] = result.genre_ids;
              }
              hasChanges = true;
            }
          }
        } catch (error) {
          console.error("Error fetching metadata for", video.name, error);
        }
      }

      if (hasChanges) {
        setPosters(newPosters);
        setBackdrops(newBackdrops);
        setOverviews(newOverviews);
        setReleaseDates(newReleaseDates);
        setVideoGenres(newVideoGenres);
      }
    };

    fetchAllMetadata();
  }, [videos, tmdbApiKey]);

  const extractedDurationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const extractDurations = async () => {
      for (const video of videos) {
        if (extractedDurationsRef.current.has(video.name)) continue;
        
        try {
          const duration = await new Promise<number>((resolve) => {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () => {
              if (video.file) URL.revokeObjectURL(vid.src);
              resolve(vid.duration);
            };
            vid.onerror = () => resolve(0);
            vid.src = video.file ? URL.createObjectURL(video.file) : video.url;
          });
          
          if (duration > 0) {
            setVideoDurations(prev => ({ ...prev, [video.name]: duration }));
          }
          extractedDurationsRef.current.add(video.name);
        } catch (e) {
          // Ignore errors
        }
      }
    };
    
    // Run in background to not block main thread
    if (videos.length > 0) {
      setTimeout(extractDurations, 2000);
    }
  }, [videos]);

  const scanDirectoryRecursively = async (directory: typeof Directory[keyof typeof Directory], basePath: string, debugLogs: string[]): Promise<VideoFile[]> => {
    let result: VideoFile[] = [];
    try {
      const response = await Filesystem.readdir({ path: basePath, directory });
      for (const file of response.files) {
        const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
        if (file.type === 'directory') {
          const subFiles = await scanDirectoryRecursively(directory, fullPath, debugLogs);
          result = result.concat(subFiles);
        } else if (file.type === 'file' && (file.name.match(/\.(mp4|mkv|webm|avi|mov)$/i))) {
          let seriesName, season, episode;
          const match = file.name.match(/[sS](\d+)[eE](\d+)|(\d+)x(\d+)/);
          if (match) {
            season = parseInt(match[1] || match[3], 10);
            episode = parseInt(match[2] || match[4], 10);
            seriesName = file.name.substring(0, match.index).replace(/[\.\-_]/g, " ").trim();
            if (!seriesName) seriesName = "Série Inconnue";
          }
          
          result.push({
            url: Capacitor.convertFileSrc(file.uri),
            name: file.name,
            type: 'video/mp4',
            path: fullPath,
            size: file.size,
            lastModified: file.mtime,
            seriesName,
            season,
            episode
          } as any);
        }
      }
    } catch (e: any) {
      debugLogs.push(`Could not scan ${basePath}: ${e.message}`);
      console.warn("Could not scan", basePath, e);
    }
    return result;
  };

  const startNativeScan = async () => {
    if (!Capacitor.isNativePlatform()) return;
    setIsScanning(true);
    const debugLogs: string[] = [];
    try {
      await Filesystem.requestPermissions();
      const foldersToScan = [
        { dir: Directory.ExternalStorage, path: 'Movies' },
        { dir: Directory.ExternalStorage, path: 'Download' },
        { dir: Directory.ExternalStorage, path: 'Documents' }
      ];
      
      let allVideos: VideoFile[] = [];
      for (const folder of foldersToScan) {
        const vids = await scanDirectoryRecursively(folder.dir, folder.path, debugLogs);
        allVideos = allVideos.concat(vids);
      }
      
      if (allVideos.length > 0) {
        setVideos(allVideos);
        if (debugLogs.length > 0) {
          console.warn("Scan finished with warnings: ", debugLogs.join("\n"));
        }
      } else {
        alert("Aucune vidéo trouvée.\nErreurs rencontrées :\n" + debugLogs.slice(0, 5).join("\n"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Erreur générale : " + e.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const videoFiles: VideoFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mkv|webm|avi|mov)$/i)) {
        let seriesName, season, episode;
        const match = file.name.match(/[sS](\d+)[eE](\d+)|(\d+)x(\d+)/);
        if (match) {
          season = parseInt(match[1] || match[3], 10);
          episode = parseInt(match[2] || match[4], 10);
          seriesName = file.name.substring(0, match.index).replace(/[\.\-_]/g, " ").trim();
          if (!seriesName) seriesName = "Série Inconnue";
        }

        videoFiles.push({
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type || 'video/mp4',
          path: file.webkitRelativePath || file.name,
          seriesName,
          season,
          episode
        });
      }
    }
    setVideos(videoFiles);
  };

  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [activePlaylistIndex, setActivePlaylistIndex] = useState<number>(0);

  const playVideo = (video: VideoFile, playlist?: Playlist, index?: number) => {
    if (video.isSeriesGroup && video.episodes && video.episodes.length > 0) {
      video = video.episodes[0];
    }
    setCurrentVideo(video);
    setInfoVideo(null);
    setActiveSubtitleUrl(null);
    setSubtitles([]);
    
    if (playlist && index !== undefined) {
      setActivePlaylist(playlist);
      setActivePlaylistIndex(index);
    } else {
      setActivePlaylist(null);
      setActivePlaylistIndex(0);
    }
    
    // Add to recently watched
    setRecentlyWatched(prev => {
      const newWatched = [video.name, ...prev.filter(name => name !== video.name)].slice(0, 15);
      localStorage.setItem('recentlyWatched', JSON.stringify(newWatched));
      return newWatched;
    });
  };

  const loginOpenSubtitles = async () => {
    if (!osApiKey || !osUsername || !osPassword) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/os/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://api.opensubtitles.com/api/v1/login',
          method: 'POST',
          headers: {
            'Api-Key': osApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: { username: osUsername, password: osPassword }
        })
      });
      const data = await response.json();
      if (data.token) {
        setOsToken(data.token);
        alert('Connexion réussie !');
      } else {
        alert('Erreur de connexion.');
      }
    } catch (error) {
      alert('Erreur de connexion.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const searchSubtitles = async () => {
    if (!currentVideo || !osApiKey) return;
    setIsSearchingSubs(true);
    try {
      const cleanName = currentVideo.name.replace(/\.(mp4|mkv|webm|avi|mov)$/i, '').replace(/[\.\-_]/g, ' ');
      const response = await fetch('/api/os/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(cleanName)}&languages=fr,en`,
          method: 'GET',
          headers: { 'Api-Key': osApiKey, 'Accept': 'application/json' }
        })
      });
      const data = await response.json();
      if (data.data) {
        const subs = data.data.map((item: any) => ({
          id: item.attributes.files[0].file_id.toString(),
          language: item.attributes.language,
          filename: item.attributes.files[0].file_name,
        }));
        setSubtitles(subs);
      }
    } catch (error) {
      alert("Erreur lors de la recherche de sous-titres.");
    } finally {
      setIsSearchingSubs(false);
    }
  };

  const downloadSubtitle = async (fileId: string) => {
    if (!osApiKey || !osToken) {
      alert("Vous devez être connecté à OpenSubtitles.");
      setShowSubtitlesModal(false);
      setShowSettings(true);
      return;
    }
    try {
      const response = await fetch('/api/os/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://api.opensubtitles.com/api/v1/download',
          method: 'POST',
          headers: {
            'Api-Key': osApiKey,
            'Authorization': `Bearer ${osToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: { file_id: parseInt(fileId) }
        })
      });
      const data = await response.json();
      if (data.link) {
        const subResponse = await fetch('/api/os/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: data.link, method: 'GET' })
        });
        const srtContent = await subResponse.text();
        const vttContent = srt2vtt(srtContent);
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        setActiveSubtitleUrl(URL.createObjectURL(blob));
        setShowSubtitlesModal(false);
      } else {
        alert("Erreur de téléchargement.");
      }
    } catch (error) {
      alert("Erreur lors du téléchargement.");
    }
  };

  const srt2vtt = (srt: string) => {
    let vtt = 'WEBVTT\n\n';
    vtt += srt
      .replace(/\{\\([ibu])\}/g, '<$1>')
      .replace(/\{\\\/([ibu])\}/g, '</$1>')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .replace(/\r\n/g, '\n');
    return vtt;
  };

  const groupedVideos = React.useMemo(() => {
    const groups: Record<string, VideoFile> = {};
    const result: VideoFile[] = [];

    videos.forEach(video => {
      const isSeries = video.seriesName || video.name.toLowerCase().match(/s\d{2}|episode|saison/);
      if (isSeries) {
        const sName = video.seriesName || getCleanTitle(video.name);
        if (!groups[sName]) {
          groups[sName] = {
            file: video.file,
            url: video.url,
            name: sName,
            type: 'series',
            path: video.path,
            isSeriesGroup: true,
            episodes: [],
            seriesName: sName
          };
          result.push(groups[sName]);
        }
        groups[sName].episodes!.push(video);
      } else {
        result.push(video);
      }
    });

    Object.values(groups).forEach(group => {
      if (group.episodes) {
        group.episodes.sort((a, b) => {
          if (a.season !== b.season) return (a.season || 0) - (b.season || 0);
          return (a.episode || 0) - (b.episode || 0);
        });
        if (group.episodes.length > 0) {
          group.file = group.episodes[0].file;
          group.size = group.episodes[0].size;
          group.lastModified = group.episodes[0].lastModified;
          group.url = group.episodes[0].url;
          group.path = group.episodes[0].path;
        }
      }
    });

    return result;
  }, [videos]);

  const tvShows = groupedVideos.filter(v => v.isSeriesGroup);
  const movies = groupedVideos.filter(v => !v.isSeriesGroup);
  
  // Nouveautés (Recently Added)
  const recentAdditions = [...groupedVideos].sort((a, b) => (b.file?.lastModified || b.lastModified || 0) - (a.file?.lastModified || a.lastModified || 0));
  
  // Vus récemment (Recently Watched)
  const recentlyWatchedVideos = recentlyWatched
    .map(name => groupedVideos.find(v => v.name === name || (v.episodes && v.episodes.some(ep => ep.name === name))))
    .filter((v): v is VideoFile => v !== undefined)
    .filter((v, i, a) => a.indexOf(v) === i); // remove duplicates if multiple episodes of same series are watched
  
  // De A à Z (Alphabetical)
  const alphabetical = [...groupedVideos].sort((a, b) => a.name.localeCompare(b.name));

  // Recommandations (Pseudo-random based on name length for stability)
  const recommendations = [...groupedVideos].sort((a, b) => (a.name.length % 7) - (b.name.length % 7));

  // Group by folder
  const folders = groupedVideos.reduce((acc, video) => {
    const parts = video.path.split('/');
    const folderName = parts.length > 1 ? parts[0] : 'Racine';
    
    if (!acc[folderName]) {
      acc[folderName] = [];
    }
    acc[folderName].push(video);
    return acc;
  }, {} as Record<string, VideoFile[]>);

  const folderNames = Object.keys(folders).sort();

  const filteredAndSortedVideos = React.useMemo(() => {
    let result = [...groupedVideos];

    if (filterGenre !== 'all') {
      result = result.filter(v => {
        const genres = videoGenres[v.name];
        return genres && genres.includes(filterGenre as number);
      });
    }

    if (filterResolution !== 'all') {
      result = result.filter(v => {
        const nameLower = v.name.toLowerCase();
        if (filterResolution === '4k') return nameLower.includes('2160p') || nameLower.includes('4k');
        if (filterResolution === '1080p') return nameLower.includes('1080p');
        if (filterResolution === '720p') return nameLower.includes('720p');
        if (filterResolution === 'sd') return !nameLower.match(/1080p|720p|2160p|4k/);
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        const dateA = releaseDates[a.name] || '0000-00-00';
        const dateB = releaseDates[b.name] || '0000-00-00';
        return dateB.localeCompare(dateA);
      } else if (sortBy === 'size') {
        const sizeA = a.isSeriesGroup ? a.episodes!.reduce((sum, ep) => sum + (ep.file?.size || ep.size || 0), 0) : (a.file?.size || a.size || 0);
        const sizeB = b.isSeriesGroup ? b.episodes!.reduce((sum, ep) => sum + (ep.file?.size || ep.size || 0), 0) : (b.file?.size || b.size || 0);
        return sizeB - sizeA;
      } else if (sortBy === 'duration') {
        const durA = videoDurations[a.name] || 0;
        const durB = videoDurations[b.name] || 0;
        return durB - durA;
      }
      return 0;
    });

    return result;
  }, [groupedVideos, sortBy, filterGenre, filterResolution, releaseDates, videoGenres, videoDurations]);

  const searchResults = searchQuery.trim() 
    ? filteredAndSortedVideos.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const isLibraryViewActive = sortBy !== 'alpha' || filterGenre !== 'all' || filterResolution !== 'all';

  const heroVideo = recentAdditions[0] || groupedVideos[0];

  const VideoRow: React.FC<{ title: string, items: VideoFile[] }> = ({ title, items }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 px-4 md:px-12">{title}</h2>
        <div className="flex gap-2 md:gap-3 overflow-x-auto px-4 md:px-12 pb-8 pt-2 scrollbar-hide snap-x">
          {items.map((video, idx) => (
            <div 
              key={idx}
              className="relative flex-none w-28 md:w-48 aspect-[2/3] bg-zinc-900 rounded-md overflow-hidden cursor-pointer snap-start transition-all duration-300 hover:scale-105 hover:z-20 hover:ring-2 hover:ring-white/50 group"
              onClick={() => handleOpenInfoModal(video)}
            >
              {posters[video.name] ? (
                <img src={posters[video.name]} alt={video.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 md:p-4 text-center bg-zinc-800">
                  <p className="text-xs md:text-sm font-medium text-zinc-300 line-clamp-4">{getCleanTitle(video.name)}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors hidden md:flex flex-col items-center justify-center gap-4 pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); playVideo(video); }} className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300 bg-white text-black p-3 rounded-full hover:bg-white/80">
                  <Play className="w-6 h-6 fill-black" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleOpenInfoModal(video); }} className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75 bg-zinc-800/80 text-white p-3 rounded-full hover:bg-zinc-700/80 border border-white/20">
                  <Info className="w-6 h-6" />
                </button>
              </div>
              {watchProgress[video.name] > 0 && watchProgress[video.name] < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
                  <div className="h-full bg-red-600" style={{ width: `${watchProgress[video.name]}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'Inconnue';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      videoNames: infoVideo ? [infoVideo.name] : []
    };
    setPlaylists([...playlists, newPlaylist]);
    setNewPlaylistName('');
  };

  const toggleVideoInPlaylist = (playlistId: string, videoName: string) => {
    setPlaylists(playlists.map(p => {
      if (p.id === playlistId) {
        const hasVideo = p.videoNames.includes(videoName);
        return {
          ...p,
          videoNames: hasVideo 
            ? p.videoNames.filter(name => name !== videoName)
            : [...p.videoNames, videoName]
        };
      }
      return p;
    }));
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(playlists.filter(p => p.id !== playlistId));
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(null);
    }
  };

  const removeVideoFromPlaylist = (playlistId: string, videoName: string) => {
    setPlaylists(playlists.map(p => {
      if (p.id === playlistId) {
        return { ...p, videoNames: p.videoNames.filter(name => name !== videoName) };
      }
      return p;
    }));
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(prev => prev ? { ...prev, videoNames: prev.videoNames.filter(name => name !== videoName) } : null);
    }
  };

  const handleOpenInfoModal = (video: VideoFile) => {
    setInfoVideo(video);
    setShowPlaylistSelector(false);
  };

  const handleVideoEnded = () => {
    if (currentVideo) {
      setWatchProgress(prev => {
        const newProgress = { ...prev, [currentVideo.name]: 100 };
        localStorage.setItem('watchProgress', JSON.stringify(newProgress));
        return newProgress;
      });
    }

    if (activePlaylist && activePlaylistIndex < activePlaylist.videoNames.length - 1) {
      const nextIndex = activePlaylistIndex + 1;
      const nextVideoName = activePlaylist.videoNames[nextIndex];
      const nextVideo = groupedVideos.find(v => v.name === nextVideoName);
      if (nextVideo) {
        playVideo(nextVideo, activePlaylist, nextIndex);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !currentVideo) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (!duration) return;

    const percentage = (currentTime / duration) * 100;
    
    setWatchProgress(prev => {
      const prevPercentage = prev[currentVideo.name] || 0;
      // Update state if difference is > 1% or if it's finished
      if (Math.abs(percentage - prevPercentage) > 1 || percentage === 100) {
        const newProgress = { ...prev, [currentVideo.name]: percentage };
        localStorage.setItem('watchProgress', JSON.stringify(newProgress));
        
        return newProgress;
      }
      return prev;
    });
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && currentVideo) {
      const savedProgress = watchProgress[currentVideo.name];
      // Resume if there's saved progress and it's not almost finished (> 95%)
      if (savedProgress && savedProgress > 0 && savedProgress < 95) {
        videoRef.current.currentTime = (savedProgress / 100) * videoRef.current.duration;
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600/30">
      {/* Header */}
      {!currentVideo && (
        <header 
          className={`fixed top-0 z-40 w-full px-4 md:px-12 pb-3 md:pb-4 flex items-center justify-between transition-colors duration-300 ${isScrolled ? 'bg-black' : 'bg-gradient-to-b from-black/80 to-transparent'}`}
          style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
        >
          <div className="flex items-center gap-4 md:gap-6">
            <h1 className="text-xl md:text-3xl font-black text-red-600 tracking-tighter">LOCALSTREAM</h1>
            {videos.length > 0 && (
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-300">
                <button 
                  onClick={() => { setActiveTab('home'); setSelectedPlaylist(null); }} 
                  className={`transition ${activeTab === 'home' ? 'text-white font-bold' : 'hover:text-zinc-400'}`}
                >
                  Accueil
                </button>
                <button 
                  onClick={() => setActiveTab('playlists')} 
                  className={`transition ${activeTab === 'playlists' ? 'text-white font-bold' : 'hover:text-zinc-400'}`}
                >
                  Listes de lecture
                </button>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {videos.length > 0 && (
              <div className="relative flex items-center">
                <Search className="w-4 h-4 md:w-5 md:h-5 text-white absolute left-3" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-900/80 border border-zinc-700 text-white text-sm rounded-full pl-9 md:pl-10 pr-4 py-1.5 focus:outline-none focus:border-zinc-500 focus:bg-black transition-all w-28 md:w-64 placeholder:text-zinc-500"
                />
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-white hover:text-zinc-300 transition flex items-center gap-2 bg-zinc-800/50 md:bg-transparent px-3 py-1.5 md:p-0 rounded-full md:rounded-none"
            >
              <FolderOpen className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">Changer de dossier</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="pb-12">
        {currentVideo ? (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div 
              className="absolute top-0 left-0 right-0 px-4 pb-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between"
              style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
            >
              <button 
                onClick={() => setCurrentVideo(null)}
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors bg-black/40 md:bg-transparent"
              >
                <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setShowSubtitlesModal(true);
                    if (subtitles.length === 0) searchSubtitles();
                  }}
                  className="p-2 rounded-full hover:bg-zinc-800 transition-colors flex items-center gap-2 bg-black/40 md:bg-transparent"
                >
                  <Subtitles className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center bg-black">
              <video 
                ref={videoRef}
                src={currentVideo.url} 
                controls 
                autoPlay
                onEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                crossOrigin="anonymous"
                className="w-full h-full max-h-screen object-contain"
              >
                {activeSubtitleUrl && (
                  <track 
                    kind="subtitles" 
                    src={activeSubtitleUrl} 
                    srcLang="fr" 
                    label="Français" 
                    default 
                  />
                )}
              </video>
            </div>
          </div>
        ) : (
          <div>
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-zinc-900">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">Vos films et séries.</h2>
                <h3 className="text-xl md:text-2xl text-zinc-300 mb-8">Où vous voulez. Quand vous voulez.</h3>
                <p className="text-zinc-400 mb-8 max-w-md">
                  Sélectionnez un dossier sur votre appareil contenant des vidéos pour commencer le streaming local.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-red-600 text-white px-8 py-4 rounded font-bold text-xl flex items-center gap-2 hover:bg-red-700 transition-colors active:scale-95 mb-4 mx-auto w-full md:w-auto justify-center"
                >
                  <FolderOpen className="w-6 h-6" />
                  Choisir un dossier
                </button>
                {Capacitor.isNativePlatform() && (
                  <button 
                    onClick={startNativeScan}
                    disabled={isScanning}
                    className="bg-zinc-800 text-white px-8 py-4 rounded font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors active:scale-95 mx-auto w-full md:w-auto"
                  >
                    {isScanning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                    {isScanning ? "Analyse en cours..." : "Scanner le téléphone automatiquement"}
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Filter and Sort Bar */}
                <div 
                  className={`px-4 md:px-12 flex flex-col md:flex-row items-center gap-3 z-40 w-full transition-all duration-300 ${(!isLibraryViewActive && !searchQuery.trim() && activeTab !== 'playlists') ? 'absolute top-[72px] md:top-[88px]' : 'pt-24 pb-6'}`}
                  style={{ marginTop: 'max(env(safe-area-inset-top), 0px)' }}
                >
                  <div className="flex flex-row flex-wrap pb-2 md:pb-0 w-full gap-2 md:gap-4">
                    
                    <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-full px-4 py-2 flex-shrink-0 shadow-lg">
                      <span className="text-zinc-400 font-medium text-xs uppercase tracking-wider hidden sm:inline">Trier par:</span>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-sm"
                      >
                        <option value="alpha" className="bg-zinc-900 text-white">A-Z</option>
                        <option value="date" className="bg-zinc-900 text-white">Date d'ajout</option>
                        <option value="size" className="bg-zinc-900 text-white">Taille</option>
                        <option value="duration" className="bg-zinc-900 text-white">Durée</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-full px-4 py-2 flex-shrink-0 shadow-lg">
                      <span className="text-zinc-400 font-medium text-xs uppercase tracking-wider hidden sm:inline">Genre:</span>
                      <select 
                        value={filterGenre} 
                        onChange={(e) => setFilterGenre(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-transparent text-white font-bold focus:outline-none cursor-pointer max-w-[120px] md:max-w-[200px] truncate text-sm"
                      >
                        <option value="all" className="bg-zinc-900 text-white">Tous les genres</option>
                        {Object.entries(TMDB_GENRES).map(([id, name]) => (
                          <option key={id} value={id} className="bg-zinc-900 text-white">{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-full px-4 py-2 flex-shrink-0 shadow-lg">
                      <span className="text-zinc-400 font-medium text-xs uppercase tracking-wider hidden sm:inline">Qualité:</span>
                      <select 
                        value={filterResolution} 
                        onChange={(e) => setFilterResolution(e.target.value)}
                        className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-sm"
                      >
                        <option value="all" className="bg-zinc-900 text-white">Toutes</option>
                        <option value="4k" className="bg-zinc-900 text-white">4K / 2160p</option>
                        <option value="1080p" className="bg-zinc-900 text-white">1080p</option>
                        <option value="720p" className="bg-zinc-900 text-white">720p</option>
                        <option value="sd" className="bg-zinc-900 text-white">SD</option>
                      </select>
                    </div>

                  </div>
                </div>

                {activeTab === 'playlists' ? (
                  <div className="px-4 md:px-12 min-h-screen pt-20">
                    {selectedPlaylist ? (
                      <div>
                        <div className="flex items-center gap-4 mb-8">
                          <button onClick={() => setSelectedPlaylist(null)} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedPlaylist.name}</h2>
                          <div className="ml-auto flex items-center gap-2 md:gap-4">
                            {selectedPlaylist.videoNames.length > 0 && (
                              <button 
                                onClick={() => {
                                  const firstVideo = groupedVideos.find(v => v.name === selectedPlaylist.videoNames[0]);
                                  if (firstVideo) playVideo(firstVideo, selectedPlaylist, 0);
                                }} 
                                className="p-2 md:px-4 md:py-2 bg-white text-black rounded hover:bg-white/80 transition flex items-center gap-2 font-bold"
                              >
                                <Play className="w-5 h-5 fill-black" />
                                <span className="hidden md:inline">Tout lire</span>
                              </button>
                            )}
                            <button onClick={() => deletePlaylist(selectedPlaylist.id)} className="p-2 bg-red-600/20 text-red-500 rounded hover:bg-red-600/40 transition flex items-center gap-2">
                              <Trash2 className="w-5 h-5" />
                              <span className="hidden md:inline">Supprimer la liste</span>
                            </button>
                          </div>
                        </div>
                        {selectedPlaylist.videoNames.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {selectedPlaylist.videoNames.map((videoName, index) => {
                              const video = groupedVideos.find(v => v.name === videoName);
                              if (!video) return null;
                              return (
                                <div 
                                  key={index}
                                  className="group relative aspect-[2/3] bg-zinc-800 rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-30 shadow-lg"
                                  onClick={() => handleOpenInfoModal(video)}
                                >
                                  {posters[video.name] ? (
                                    <img 
                                      src={posters[video.name]} 
                                      alt={video.name} 
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                      <span className="text-zinc-500 font-medium text-sm line-clamp-3">{getCleanTitle(video.name)}</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                                    <button onClick={(e) => { e.stopPropagation(); playVideo(video, selectedPlaylist, index); }} className="bg-white text-black p-3 rounded-full hover:bg-white/80 mb-2">
                                      <Play className="w-6 h-6 fill-black" />
                                    </button>
                                    <p className="text-white text-xs font-medium text-center line-clamp-2 drop-shadow-md">
                                      {getCleanTitle(video.name)}
                                    </p>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeVideoFromPlaylist(selectedPlaylist.id, video.name); }} 
                                      className="absolute top-2 right-2 p-2 bg-red-600/80 rounded-full hover:bg-red-600 transition"
                                      title="Retirer de la liste"
                                    >
                                      <X className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                  {watchProgress[video.name] > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
                                      <div className="h-full bg-red-600" style={{ width: `${watchProgress[video.name]}%` }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-zinc-500 mt-12">
                            Cette liste de lecture est vide.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Vos listes de lecture</h2>
                        {playlists.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {playlists.map(playlist => (
                              <div 
                                key={playlist.id}
                                onClick={() => setSelectedPlaylist(playlist)}
                                className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg cursor-pointer hover:border-zinc-600 transition group"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-zinc-800 rounded-full group-hover:bg-zinc-700 transition">
                                    <ListVideo className="w-8 h-8 text-white" />
                                  </div>
                                  <span className="text-xs font-medium bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                                    {playlist.videoNames.length} vidéo{playlist.videoNames.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <h3 className="text-lg font-bold text-white truncate">{playlist.name}</h3>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-zinc-500 mt-12">
                            Vous n'avez pas encore créé de liste de lecture.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="px-4 md:px-12 min-h-screen">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
                      Résultats pour "{searchQuery}"
                    </h2>
                    {searchResults.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {searchResults.map((video, index) => (
                          <div 
                            key={index}
                            className="group relative aspect-video bg-zinc-800 rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-30 shadow-lg"
                            onClick={() => playVideo(video)}
                          >
                            {backdrops[video.name] || posters[video.name] ? (
                              <img 
                                src={backdrops[video.name] || posters[video.name]} 
                                alt={video.name} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                <span className="text-zinc-500 font-medium text-sm line-clamp-3">{video.name}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                              <Play className="w-12 h-12 text-white mb-2 drop-shadow-lg" />
                              <p className="text-white text-xs font-medium text-center line-clamp-2 drop-shadow-md">
                                {getCleanTitle(video.name)}
                              </p>
                              <button onClick={(e) => { e.stopPropagation(); handleOpenInfoModal(video); }} className="absolute bottom-2 right-2 p-2 bg-zinc-800/80 rounded-full hover:bg-zinc-700/80">
                                <Info className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            {watchProgress[video.name] > 0 && watchProgress[video.name] < 100 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
                                <div className="h-full bg-red-600" style={{ width: `${watchProgress[video.name]}%` }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 mt-12">
                        Aucun résultat trouvé pour "{searchQuery}"
                      </div>
                    )}
                  </div>
                ) : isLibraryViewActive ? (
                  <div className="px-4 md:px-12 min-h-screen">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
                      Bibliothèque
                    </h2>
                    {filteredAndSortedVideos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredAndSortedVideos.map((video, index) => (
                          <div 
                            key={index}
                            className="group relative aspect-[2/3] bg-zinc-800 rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-30 shadow-lg"
                            onClick={() => handleOpenInfoModal(video)}
                          >
                            {posters[video.name] ? (
                              <img 
                                src={posters[video.name]} 
                                alt={video.name} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                <span className="text-zinc-500 font-medium text-sm line-clamp-3">{getCleanTitle(video.name)}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                              <button onClick={(e) => { e.stopPropagation(); playVideo(video); }} className="bg-white text-black p-3 rounded-full hover:bg-white/80 mb-2">
                                <Play className="w-6 h-6 fill-black" />
                              </button>
                              <p className="text-white text-xs font-medium text-center line-clamp-2 drop-shadow-md">
                                {getCleanTitle(video.name)}
                              </p>
                            </div>
                            {watchProgress[video.name] > 0 && watchProgress[video.name] < 100 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
                                <div className="h-full bg-red-600" style={{ width: `${watchProgress[video.name]}%` }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 mt-12">
                        Aucun résultat correspondant à ces filtres.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Hero Section */}
                    {heroVideo && (
                      <div className="relative h-[60vh] md:h-[80vh] w-full mb-8">
                        <div className="absolute inset-0">
                          {backdrops[heroVideo.name] || posters[heroVideo.name] ? (
                            <img 
                              src={backdrops[heroVideo.name] || posters[heroVideo.name]} 
                              alt={heroVideo.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        </div>
                        
                        <div className="absolute bottom-[5%] md:bottom-[20%] left-4 md:left-12 right-4 md:right-auto max-w-2xl z-10">
                          <h2 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-4 drop-shadow-xl">
                            {getCleanTitle(heroVideo.name)}
                          </h2>
                          <p className="text-zinc-300 text-sm md:text-lg mb-4 md:mb-6 line-clamp-2 md:line-clamp-3 max-w-xl drop-shadow-md">
                            {heroVideo.name}
                          </p>
                          <div className="flex flex-wrap gap-2 md:gap-3">
                            <button 
                              onClick={() => playVideo(heroVideo)} 
                              className="bg-white text-black px-4 md:px-8 py-2 md:py-3 rounded flex items-center justify-center gap-2 font-bold text-sm md:text-lg hover:bg-white/80 transition flex-1 md:flex-none"
                            >
                              <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" /> Lecture
                            </button>
                            <button 
                              onClick={() => handleOpenInfoModal(heroVideo)}
                              className="bg-zinc-500/70 text-white px-4 md:px-8 py-2 md:py-3 rounded flex items-center justify-center gap-2 font-bold text-sm md:text-lg hover:bg-zinc-500/90 transition flex-1 md:flex-none"
                            >
                              <Info className="w-5 h-5 md:w-6 md:h-6" /> Plus d'infos
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Rows */}
                    <div className="relative z-20 -mt-12 md:-mt-24">
                      <VideoRow title="Reprendre la lecture" items={recentlyWatchedVideos} />
                      <VideoRow title="Nouveautés" items={recentAdditions.slice(0, 15)} />
                      <VideoRow title="Recommandations" items={recommendations.slice(0, 15)} />
                      <VideoRow title="Séries" items={tvShows} />
                      <VideoRow title="Films" items={movies} />
                      
                      {/* Dossiers */}
                      {folderNames.map(folderName => (
                        folderName !== 'Racine' && folders[folderName].length > 0 && (
                          <VideoRow key={folderName} title={`Dossier : ${folderName}`} items={folders[folderName]} />
                        )
                      ))}

                      <VideoRow title="De A à Z" items={alphabetical} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFolderSelect}
        className="hidden"
        multiple
        {...({ webkitdirectory: "true", directory: "true", accept: "video/*" } as any)}
      />

      {/* Info Modal */}
      {infoVideo && (
        <div className="fixed inset-0 bg-black/90 md:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-12 overflow-y-auto">
          <div className="bg-zinc-900 md:rounded-xl w-full h-full md:h-auto md:max-w-4xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <button 
              onClick={() => { setInfoVideo(null); setShowPlaylistSelector(false); }} 
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="relative h-[30vh] md:h-[50vh] w-full shrink-0">
              {backdrops[infoVideo.name] || posters[infoVideo.name] ? (
                <img 
                  src={backdrops[infoVideo.name] || posters[infoVideo.name]} 
                  alt={infoVideo.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-500">Aucune image disponible</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
              
              <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 right-4 md:right-8">
                <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg">
                  {getCleanTitle(infoVideo.name)}
                </h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <button 
                    onClick={() => playVideo(infoVideo)} 
                    className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded flex items-center justify-center gap-2 font-bold text-base md:text-lg hover:bg-white/80 transition flex-1 md:flex-none"
                  >
                    <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" /> Lecture
                  </button>
                  <div className="relative flex-1 md:flex-none">
                    <button 
                      onClick={() => setShowPlaylistSelector(!showPlaylistSelector)}
                      className="w-full md:w-auto bg-zinc-800/80 text-white px-4 py-2 md:py-3 rounded hover:bg-zinc-700/80 transition border border-white/20 flex items-center justify-center gap-2"
                      title="Ajouter à une liste de lecture"
                    >
                      <ListPlus className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="md:hidden">Ajouter à une liste</span>
                    </button>
                    {showPlaylistSelector && (
                      <div className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-zinc-800">
                          <h4 className="text-sm font-semibold text-white mb-2">Enregistrer dans...</h4>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {playlists.map(playlist => {
                              const isInPlaylist = playlist.videoNames.includes(infoVideo.name);
                              return (
                                <button 
                                  key={playlist.id}
                                  onClick={() => toggleVideoInPlaylist(playlist.id, infoVideo.name)}
                                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-zinc-800 flex items-center justify-between group"
                                >
                                  <span className="truncate text-zinc-300 group-hover:text-white">{playlist.name}</span>
                                  {isInPlaylist && <Check className="w-4 h-4 text-red-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="p-3 bg-zinc-950/50">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={newPlaylistName}
                              onChange={(e) => setNewPlaylistName(e.target.value)}
                              placeholder="Nouvelle liste..." 
                              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:border-red-600 focus:outline-none"
                              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
                            />
                            <button 
                              onClick={createPlaylist}
                              disabled={!newPlaylistName.trim()}
                              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-2 py-1 rounded text-sm transition"
                            >
                              Créer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-8 overflow-y-auto">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="flex-1">
                  <p className="text-zinc-300 text-sm md:text-lg leading-relaxed">
                    {overviews[infoVideo.name] || "Aucune description disponible pour ce titre."}
                  </p>
                </div>
                <div className="w-full md:w-1/3 space-y-2 md:space-y-4 text-xs md:text-sm">
                  <div>
                    <span className="text-zinc-500">Fichier : </span>
                    <span className="text-zinc-300 break-all">{infoVideo.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Format : </span>
                    <span className="text-zinc-300">{infoVideo.type || 'Inconnu'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Taille : </span>
                    <span className="text-zinc-300">
                      {infoVideo.isSeriesGroup && infoVideo.episodes 
                        ? formatSize(infoVideo.episodes.reduce((sum, ep) => sum + (ep.file?.size || ep.size || 0), 0))
                        : formatSize(infoVideo.file?.size || infoVideo.size || 0)}
                    </span>
                  </div>
                  {releaseDates[infoVideo.name] && (
                    <div>
                      <span className="text-zinc-500">Date de sortie : </span>
                      <span className="text-zinc-300">{new Date(releaseDates[infoVideo.name]).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {videoGenres[infoVideo.name] && (
                    <div>
                      <span className="text-zinc-500">Genres : </span>
                      <span className="text-zinc-300">
                        {videoGenres[infoVideo.name].map(id => TMDB_GENRES[id]).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {(!infoVideo.isSeriesGroup && videoDurations[infoVideo.name]) && (
                    <div>
                      <span className="text-zinc-500">Durée : </span>
                      <span className="text-zinc-300">{formatDuration(videoDurations[infoVideo.name])}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Episodes List */}
              {infoVideo.isSeriesGroup && infoVideo.episodes && (
                <div className="mt-8 border-t border-zinc-800 pt-8">
                  <h3 className="text-xl font-bold mb-4">Épisodes</h3>
                  <div className="flex flex-col gap-2">
                    {infoVideo.episodes.map((ep, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors group"
                        onClick={() => playVideo(ep)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors shrink-0">
                            <Play className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {ep.season && ep.episode ? `Saison ${ep.season} Épisode ${ep.episode}` : getCleanTitle(ep.name)}
                            </p>
                            <p className="text-sm text-zinc-500 line-clamp-1">{ep.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold">Paramètres</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Subtitles className="w-4 h-4" /> OpenSubtitles
                </h4>
                <div className="space-y-3">
                  <input type="text" value={osApiKey} onChange={(e) => setOsApiKey(e.target.value)} placeholder="Clé API" className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:border-red-600 focus:outline-none" />
                  <input type="text" value={osUsername} onChange={(e) => setOsUsername(e.target.value)} placeholder="Nom d'utilisateur" className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:border-red-600 focus:outline-none" />
                  <input type="password" value={osPassword} onChange={(e) => setOsPassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:border-red-600 focus:outline-none" />
                  <button onClick={loginOpenSubtitles} disabled={isLoggingIn} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 rounded transition-colors flex items-center justify-center gap-2">
                    {isLoggingIn ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Se connecter
                  </button>
                  {osToken && <div className="text-xs text-emerald-500 text-center">Connecté avec succès.</div>}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> TMDB (Affiches)
                </h4>
                <input type="text" value={tmdbApiKey} onChange={(e) => setTmdbApiKey(e.target.value)} placeholder="Clé API TMDB" className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:border-red-600 focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtitles Modal */}
      {showSubtitlesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-red-600" />
                Sous-titres
              </h3>
              <button onClick={() => setShowSubtitlesModal(false)} className="p-2 rounded-full hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-zinc-800">
              <button onClick={searchSubtitles} disabled={isSearchingSubs || !osApiKey} className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2 rounded font-bold flex items-center justify-center gap-2 transition-colors">
                {isSearchingSubs ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                Rechercher
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!osApiKey ? (
                <div className="p-6 text-center text-zinc-400">
                  <p className="mb-4">Configurez votre clé API OpenSubtitles.</p>
                </div>
              ) : subtitles.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  {isSearchingSubs ? 'Recherche...' : 'Aucun sous-titre trouvé.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {subtitles.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded hover:bg-zinc-800 transition-colors group">
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-xs font-bold uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded mr-2">{sub.language}</span>
                        <span className="text-sm text-zinc-300 truncate">{sub.filename}</span>
                      </div>
                      <button onClick={() => downloadSubtitle(sub.id)} className="p-2 rounded-full bg-zinc-800 text-zinc-300 hover:bg-red-600 hover:text-white transition-colors shrink-0">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
