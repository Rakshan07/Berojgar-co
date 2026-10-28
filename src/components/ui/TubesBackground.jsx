import { useEffect, useRef, useState, useCallback } from 'react';
import TubesCursor from 'threejs-components/build/cursors/tubes1.min.js';
import { Play, Pause } from 'lucide-react';

export const WINE_GARNET_PALETTES = [
  {
    name: 'Ruby Garnet',
    tubes: ['#C5ADE5', '#B69BD8', '#FAF7FC'],
    lights: ['#C5ADE5', '#87569D', '#FFFFFF', '#2C2335'],
  },
  {
    name: 'Deep Crimson',
    tubes: ['#F2EAF8', '#C5ADE5', '#F2EAF8'],
    lights: ['#C5ADE5', '#87569D', '#FAF7FC', '#FFFFFF'],
  },
  {
    name: 'Wine & Garnet',
    tubes: ['#FFFFFF', '#D6C7E2', '#C5ADE5'],
    lights: ['#C5ADE5', '#B69BD8', '#55495F', '#2C2335'],
  },
  {
    name: 'Obsidian Blaze',
    tubes: ['#FAF7FC', '#C5ADE5', '#B69BD8'],
    lights: ['#C5ADE5', '#87569D', '#FFFFFF', '#FFCCD8'],
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
  const pointerTarget = useRef({ clientX: 0, clientY: 0, active: false });
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
        sleepRadiusX: 0,
        sleepRadiusY: 0,
        tubes: {
          colors: currentPalette.tubes,
          count: 14,
          minRadius: 0.012,
          maxRadius: 0.045,
          minTubularSegments: 48,
          maxTubularSegments: 128,
          material: {
            metalness: 1,
            roughness: 0.25,
          },
          lights: {
            colors: currentPalette.lights,
            intensity: 220,
          },
        },
      });

      instance.three.onBeforeRender = (frame) => {
        const canvas = canvasRef.current;
        const pointer = pointerTarget.current;
        if (!canvas) return;

        if (pointer.active) {
          const bounds = canvas.getBoundingClientRect();
          const normalizedX = (pointer.clientX - bounds.left) / bounds.width - 0.5;
          const normalizedY = 0.5 - (pointer.clientY - bounds.top) / bounds.height;
          instance.tubes.target.set(
            normalizedX * instance.three.size.wWidth,
            normalizedY * instance.three.size.wHeight,
            0
          );
        } else {
          instance.tubes.target.set(0, 0, 0);
        }

        instance.tubes.update(frame);
      };

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
      tubesInstance.current.tubes?.setColors(palette.tubes);
      tubesInstance.current.tubes?.setLightsColors(palette.lights);
    } catch (err) {
      console.warn('Failed to update tube colors:', err);
    }
  }, [paletteIndex, initialized]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      pointerTarget.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        active: true,
      };
    };
    const handlePointerLeave = () => {
      pointerTarget.current.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('blur', handlePointerLeave);
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', handlePointerLeave);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

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
          ? `relative w-full min-h-screen overflow-hidden bg-[var(--sf-bg)] ${className}`
          : `absolute inset-0 z-0 overflow-hidden ${className}`
      }
      style={{ isolation: 'isolate' }}
    >
      {hasWebGL && !reducedMotion ? (
        <canvas
          ref={canvasRef}
          className="skillfy-tubes-canvas absolute inset-0 w-full h-full block pointer-events-auto z-0"
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}

      {(reducedMotion || !hasWebGL || !initialized) && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-60 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, #C5ADE5 0%, var(--sf-surface) 40%, var(--sf-bg) 70%, transparent 100%)',
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-[100px]"
            style={{
              background: 'radial-gradient(circle, var(--sf-accent-text) 0%, #C5ADE5 35%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* Atmospheric vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, var(--sf-bg) 100%)',
        }}
      />

      {children && (
        <div className="relative z-20 w-full min-h-screen flex flex-col">
          {children}
        </div>
      )}

      {hasWebGL && !reducedMotion && children && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[var(--sf-panel)]/85 backdrop-blur-md border border-[var(--sf-border)] p-1.5 rounded-full shadow-lg">
          <button
            onClick={togglePlayback}
            className="p-1.5 rounded-full text-[var(--sf-secondary)] hover:text-[var(--sf-text)] hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
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
