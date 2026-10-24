import { useEffect, useRef, useState, useCallback } from 'react';
import TubesCursor from 'threejs-components/build/cursors/tubes1.min.js';
import { Play, Pause } from 'lucide-react';

export const WINE_GARNET_PALETTES = [
  {
    name: 'Ruby & Emerald Obsidian',
    tubes: ['#a31c1b', '#bf2625', '#06110C'],
    lights: ['#a31c1b', '#E56E6D', '#171717', '#F7FAF8'],
  },
  {
    name: 'Deep Crimson & Dark Forest',
    tubes: ['#590f0e', '#a31c1b', '#1f382a'],
    lights: ['#a31c1b', '#E56E6D', '#06110C', '#FFFFFF'],
  },
  {
    name: 'Charcoal & Garnet',
    tubes: ['#171717', '#871615', '#a31c1b'],
    lights: ['#a31c1b', '#bf2625', '#C8D1CC', '#F7FAF8'],
  },
  {
    name: 'Obsidian Blaze',
    tubes: ['#06110C', '#a31c1b', '#bf2625'],
    lights: ['#a31c1b', '#E56E6D', '#171717', '#FFCCD8'],
  },
];

function checkWebGLSupport() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function TubesBackground({ children, className = '' }) {
  const canvasRef = useRef(null);
  const tubesInstance = useRef(null);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());
  }, []);

  useEffect(() => {
    if (!hasWebGL || reducedMotion || !canvasRef.current) return;

    try {
      const currentPalette = WINE_GARNET_PALETTES[paletteIndex];
      const instance = new TubesCursor(canvasRef.current, {
        tubes: {
          colors: currentPalette.tubes,
          radius: 4,
          count: 14,
          subdivision: 24,
          length: 40,
        },
        lights: {
          colors: currentPalette.lights,
          intensity: 220,
        },
      });

      tubesInstance.current = instance;
      setInitialized(true);

      const handleResize = () => {
        if (tubesInstance.current?.resize) {
          tubesInstance.current.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (tubesInstance.current?.destroy) {
          try {
            tubesInstance.current.destroy();
          } catch {
            // ignore cleanup errors
          }
        }
        tubesInstance.current = null;
        setInitialized(false);
      };
    } catch (err) {
      console.warn('Three.js TubesCursor initialization failed, using static fallback:', err);
      setHasWebGL(false);
    }
  }, [hasWebGL, reducedMotion]);

  useEffect(() => {
    if (!tubesInstance.current || !initialized) return;
    try {
      const palette = WINE_GARNET_PALETTES[paletteIndex];
      if (tubesInstance.current.setColors) {
        tubesInstance.current.setColors(palette.tubes, palette.lights);
      }
    } catch (err) {
      console.warn('Failed to update tube colors:', err);
    }
  }, [paletteIndex, initialized]);

  const togglePlayback = useCallback(() => {
    if (!tubesInstance.current) return;
    try {
      if (isPlaying) {
        if (tubesInstance.current.pause) tubesInstance.current.pause();
        setIsPlaying(false);
      } else {
        if (tubesInstance.current.play) tubesInstance.current.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Play/pause toggle error', e);
    }
  }, [isPlaying]);

  return (
    <div
      className={
        children
          ? `relative w-full min-h-screen overflow-hidden bg-[#06110C] ${className}`
          : `absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`
      }
      style={{ isolation: 'isolate' }}
    >
      {hasWebGL && !reducedMotion ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none z-0"
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}

      {(reducedMotion || !hasWebGL || !initialized) && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-60 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, #a31c1b 0%, #590f0e 40%, #06110C 70%, transparent 100%)',
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-[100px]"
            style={{
              background: 'radial-gradient(circle, #E56E6D 0%, #a31c1b 35%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* Atmospheric vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(6,17,12,0.3) 0%, rgba(6,17,12,0.7) 70%, rgba(6,17,12,0.95) 100%)',
        }}
      />

      {children && (
        <div className="relative z-20 w-full min-h-screen flex flex-col">
          {children}
        </div>
      )}

      {hasWebGL && !reducedMotion && children && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#171717]/85 backdrop-blur-md border border-[#333D38] p-1.5 rounded-full shadow-lg">
          <button
            onClick={togglePlayback}
            className="p-1.5 rounded-full text-[#C8D1CC] hover:text-[#F7FAF8] hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
            title={isPlaying ? 'Pause interactive background' : 'Play interactive background'}
            aria-label={isPlaying ? 'Pause background animation' : 'Play background animation'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
