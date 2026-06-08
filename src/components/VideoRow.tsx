import React from 'react';
import { Play, Info, Check, RotateCcw } from 'lucide-react';
import { VideoFile } from '../lib/types';
import { getCleanTitle, getResolution } from '../lib/utils';

export interface VideoRowProps {
  title: string;
  items: VideoFile[];
  posters: Record<string, string>;
  watchProgress: Record<string, number>;
  watchedVideos: Record<string, boolean>;
  onOpenInfo: (video: VideoFile) => void;
  onPlay: (video: VideoFile) => void;
  onResetProgress: (name: string) => void;
}

/**
 * Carrousel horizontal d'affiches (une "ligne" de la page d'accueil).
 * Composant présentationnel pur, mémoïsé : ne se re-rend que si ses props changent.
 */
const VideoRowComponent: React.FC<VideoRowProps> = ({
  title, items, posters, watchProgress, watchedVideos, onOpenInfo, onPlay, onResetProgress,
}) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 px-4 md:px-12">{title}</h2>
      <div className="flex gap-2 md:gap-3 overflow-x-auto px-4 md:px-12 pb-8 pt-2 scrollbar-hide snap-x">
        {items.map((video, idx) => {
          const isWatched = video.isSeriesGroup
            ? (video.episodes && video.episodes.length > 0 && video.episodes.every(ep => !!watchedVideos[ep.name]))
            : !!watchedVideos[video.name];

          return (
            <div
              key={idx}
              className="flex-none w-28 md:w-48 snap-start group"
              onClick={() => onOpenInfo(video)}
            >
              <div className={`relative aspect-[2/3] bg-zinc-900 rounded-md overflow-hidden cursor-pointer transition-all duration-300 group-hover:scale-105 group-hover:z-20 group-hover:ring-2 group-hover:ring-white/50 shadow-lg`}>
                {video.isSeriesGroup && (
                  <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded shadow-lg uppercase">
                    {video.isTvSeries ? 'Série' : 'Saga'}
                  </div>
                )}
                {isWatched && (
                  <div className="absolute top-2 right-2 z-20 bg-green-600 rounded-full p-1 shadow-md">
                    <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                )}
                {posters[video.isSeriesGroup ? video.seriesName! : (video.seriesName || video.name)] ? (
                  <img src={posters[video.isSeriesGroup ? video.seriesName! : (video.seriesName || video.name)]} alt={getCleanTitle(video.name)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 md:p-4 text-center bg-zinc-800">
                    <p className="text-xs md:text-sm font-medium text-zinc-300">
                      {video.isSeriesGroup ? video.seriesName : (video.seriesName || getCleanTitle(video.name))}
                    </p>
                  </div>
                )}
                {getResolution(video.name) && (
                  <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded border border-white/20 uppercase tracking-tighter">
                    {getResolution(video.name)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors hidden md:flex flex-col items-center justify-center gap-4 pointer-events-none">
                  <button onClick={(e) => { e.stopPropagation(); onPlay(video); }} className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300 bg-white text-black p-3 rounded-full hover:bg-white/80">
                    <Play className="w-6 h-6 fill-black" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onOpenInfo(video); }} className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75 bg-zinc-800/80 text-white p-3 rounded-full hover:bg-zinc-700/80 border border-white/20">
                    <Info className="w-6 h-6" />
                  </button>
                </div>

                {watchProgress[video.name] > 0 && watchProgress[video.name] < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
                    <div className="h-full bg-red-600" style={{ width: `${watchProgress[video.name]}%` }} />
                  </div>
                )}
                {title === "Continuer la lecture" && watchProgress[video.name] > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onResetProgress(video.name); }}
                    className="absolute bottom-2 right-2 p-1.5 md:p-1 bg-black/60 rounded-full text-white pointer-events-auto hover:bg-red-600 transition-colors shadow-lg z-30 opacity-100 md:opacity-0 group-hover:opacity-100"
                    title="Reprendre à zéro"
                  >
                    <RotateCcw className="w-4 h-4 md:w-3 md:h-3" />
                  </button>
                )}
              </div>

              {/* Titre visible en entier en dessous */}
              <div className="mt-2 px-1">
                <p className="text-[10px] md:text-sm font-medium text-zinc-300 leading-tight break-words">
                  {video.isSeriesGroup ? video.seriesName : (video.seriesName || getCleanTitle(video.name))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VideoRow = React.memo(VideoRowComponent);
