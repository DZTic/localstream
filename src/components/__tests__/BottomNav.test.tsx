import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BottomNav } from '../BottomNav';

afterEach(cleanup);

const baseProps = {
  activeTab: 'home',
  isLibraryViewActive: false,
  onHome: vi.fn(),
  onLibrary: vi.fn(),
  onPlaylists: vi.fn(),
  onHistory: vi.fn(),
};

describe('BottomNav', () => {
  it('affiche les quatre onglets', () => {
    render(<BottomNav {...baseProps} />);
    expect(screen.getByText('Accueil')).toBeTruthy();
    expect(screen.getByText('Bibliothèque')).toBeTruthy();
    expect(screen.getByText('Listes')).toBeTruthy();
    expect(screen.getByText('Déjà vu')).toBeTruthy();
  });

  it('déclenche le bon callback au clic', () => {
    const onPlaylists = vi.fn();
    render(<BottomNav {...baseProps} onPlaylists={onPlaylists} />);
    fireEvent.click(screen.getByText('Listes').closest('button')!);
    expect(onPlaylists).toHaveBeenCalledTimes(1);
  });

  it("met en surbrillance l'onglet Accueil quand il est actif", () => {
    render(<BottomNav {...baseProps} activeTab="home" isLibraryViewActive={false} />);
    const homeBtn = screen.getByText('Accueil').closest('button')!;
    expect(homeBtn.className).toContain('text-red-500');
  });

  it("met en surbrillance Bibliothèque (et pas Accueil) en vue bibliothèque", () => {
    render(<BottomNav {...baseProps} activeTab="home" isLibraryViewActive={true} />);
    const homeBtn = screen.getByText('Accueil').closest('button')!;
    const libBtn = screen.getByText('Bibliothèque').closest('button')!;
    expect(homeBtn.className).not.toContain('text-red-500');
    expect(libBtn.className).toContain('text-red-500');
  });
});
