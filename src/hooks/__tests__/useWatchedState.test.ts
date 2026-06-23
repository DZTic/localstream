import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchedState } from '../useWatchedState';
import type { VideoFile } from '../../lib/types';

const v = (name: string, extra: Partial<VideoFile> = {}): VideoFile => ({
  url: 'blob:x', name, type: 'video/mp4', path: name, ...extra,
});

const serie = v('Show', {
  isSeriesGroup: true, seriesName: 'Show',
  episodes: [v('Show.S01E01.mkv'), v('Show.S01E02.mkv')],
});

beforeEach(() => localStorage.clear());

describe('useWatchedState', () => {
  it('charge l\'état vu depuis localStorage', () => {
    localStorage.setItem('watchedVideos', JSON.stringify({ 'Film.mkv': true }));
    const { result } = renderHook(() => useWatchedState([]));
    expect(result.current.watchedVideos['Film.mkv']).toBe(true);
  });

  it('bascule un film isolé et persiste', () => {
    const { result } = renderHook(() => useWatchedState([v('Film.mkv')]));
    act(() => result.current.toggleWatched('Film.mkv'));
    expect(result.current.watchedVideos['Film.mkv']).toBe(true);
    expect(JSON.parse(localStorage.getItem('watchedVideos')!)['Film.mkv']).toBe(true);
    act(() => result.current.toggleWatched('Film.mkv'));
    expect(result.current.watchedVideos['Film.mkv']).toBe(false);
  });

  it('marquer une série marque tous ses épisodes', () => {
    const { result } = renderHook(() => useWatchedState([serie]));
    act(() => result.current.toggleWatched('Show'));
    expect(result.current.watchedVideos['Show']).toBe(true);
    expect(result.current.watchedVideos['Show.S01E01.mkv']).toBe(true);
    expect(result.current.watchedVideos['Show.S01E02.mkv']).toBe(true);
  });

  it('la série devient vue quand le dernier épisode est marqué', () => {
    const { result } = renderHook(() => useWatchedState([serie]));
    act(() => result.current.toggleWatched('Show.S01E01.mkv'));
    expect(result.current.watchedVideos['Show']).toBeFalsy();
    act(() => result.current.toggleWatched('Show.S01E02.mkv'));
    expect(result.current.watchedVideos['Show']).toBe(true);
  });

  it('resetProgress efface progression et position', () => {
    const { result } = renderHook(() => useWatchedState([]));
    act(() => {
      result.current.setWatchProgress({ 'F.mkv': 42 });
      result.current.setWatchPositions({ 'F.mkv': 1000 });
    });
    act(() => result.current.resetProgress('F.mkv'));
    expect(result.current.watchProgress['F.mkv']).toBeUndefined();
    expect(result.current.watchPositions['F.mkv']).toBeUndefined();
  });

  it('addManualHistoryItem marque vu + disponible, ignore le vide', () => {
    const { result } = renderHook(() => useWatchedState([]));
    act(() => result.current.addManualHistoryItem('   '));
    expect(result.current.watchedVideos).toEqual({});
    act(() => result.current.addManualHistoryItem('Mon Film'));
    expect(result.current.watchedVideos['Mon Film']).toBe(true);
    expect(result.current.forceAvailableVideos['Mon Film']).toBe(true);
  });

  it('toggleForceAvailable bascule la disponibilité', () => {
    const { result } = renderHook(() => useWatchedState([]));
    act(() => result.current.toggleForceAvailable('X'));
    expect(result.current.forceAvailableVideos['X']).toBe(true);
    act(() => result.current.toggleForceAvailable('X'));
    expect(result.current.forceAvailableVideos['X']).toBe(false);
  });
});
