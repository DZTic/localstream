import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VideoRow } from '../VideoRow';
import type { VideoFile } from '../../lib/types';

afterEach(cleanup);

const v = (name: string, extra: Partial<VideoFile> = {}): VideoFile => ({
  url: 'blob:x', name, type: 'video/mp4', path: name, ...extra,
});

const baseProps = {
  title: 'Films',
  items: [] as VideoFile[],
  posters: {} as Record<string, string>,
  watchProgress: {} as Record<string, number>,
  watchedVideos: {} as Record<string, boolean>,
  onOpenInfo: vi.fn(),
  onPlay: vi.fn(),
  onResetProgress: vi.fn(),
};

describe('VideoRow', () => {
  it('ne rend rien quand la liste est vide', () => {
    const { container } = render(<VideoRow {...baseProps} items={[]} />);
    expect(container.childElementCount).toBe(0);
  });

  it('affiche le titre de la ligne et le titre nettoyé du film', () => {
    render(<VideoRow {...baseProps} items={[v('Inception.2010.1080p.mkv')]} />);
    expect(screen.getByText('Films')).toBeTruthy();
    expect(screen.getAllByText('Inception').length).toBeGreaterThan(0);
  });

  it('affiche le badge de résolution déduit du nom', () => {
    render(<VideoRow {...baseProps} items={[v('Film.1080p.mkv')]} />);
    expect(screen.getByText('1080p')).toBeTruthy();
  });

  it('affiche le badge "Série" pour une série TV et "Saga" pour une collection', () => {
    const serie = v('Show', { isSeriesGroup: true, isTvSeries: true, seriesName: 'Show', episodes: [v('Show.S01E01.mkv')] });
    const { rerender } = render(<VideoRow {...baseProps} items={[serie]} />);
    expect(screen.getByText('Série')).toBeTruthy();

    const saga = v('Saga X', { isSeriesGroup: true, isTvSeries: false, seriesName: 'Saga X', episodes: [v('A.mkv')] });
    rerender(<VideoRow {...baseProps} items={[saga]} />);
    expect(screen.getByText('Saga')).toBeTruthy();
  });

  it('appelle onPlay au clic sur le bouton lecture', () => {
    const onPlay = vi.fn();
    const { container } = render(<VideoRow {...baseProps} items={[v('Inception.mkv')]} onPlay={onPlay} />);
    // Le premier bouton du DOM est le bouton lecture de l'overlay.
    fireEvent.click(container.querySelector('button')!);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('appelle onOpenInfo au clic sur la carte', () => {
    const onOpenInfo = vi.fn();
    render(<VideoRow {...baseProps} items={[v('Inception.mkv')]} onOpenInfo={onOpenInfo} />);
    fireEvent.click(screen.getAllByText('Inception')[0]);
    expect(onOpenInfo).toHaveBeenCalledTimes(1);
  });

  it('marque comme vu un film présent dans watchedVideos', () => {
    const { container } = render(
      <VideoRow {...baseProps} items={[v('Inception.mkv')]} watchedVideos={{ 'Inception.mkv': true }} />
    );
    expect(container.querySelector('.bg-green-600')).toBeTruthy();
  });
});
