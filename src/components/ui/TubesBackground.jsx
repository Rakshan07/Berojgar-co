import { useEffect, useRef, useState, useCallback } from 'react';
import TubesCursor from 'threejs-components/build/cursors/tubes1.min.js';
import { Play, Pause } from 'lucide-react';

export const WINE_GARNET_PALETTES = [
  {
    name: 'Garnet & Ruby Radiance',
    tubes: ['#8C1538', '#B92345', '#D95B7C'],
    lights: ['#A61E42', '#D94B70', '#F28BA8', '#F7C5D2'],
  },
  {
    name: 'Velvet Wine & Rose',
    tubes: ['#5E0D24', '#A81C43', '#E06588'],
    lights: ['#8C1538', '#B92345', '#F28BA8', '#FFF4F6'],
  },
  {
    name: 'Black Cherry & Rose Gold',
    tubes: ['#4A0A1C', '#841533', '#C74B6E'],
    lights: ['#7A142E', '#AB2243', '#E87D9A', '#F7C5D2'],
  },
  {
    name: 'Imperial Burgundy',
    tubes: ['#540920', '#A31D3F', '#D23357'],
    lights: ['#8C1538', '#C42A4E', '#F28BA8', '#FFCCD8'],
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

export default function TubesBackground({ onPaletteChange, className = '' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  const [hasWebGL] = useState(() => checkWebGLSupport());
  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
  });

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const [paletteIdx, setPaletteIdx] = useState(0);
  const paletteIdxRef = useRef(0);
  paletteIdxRef.current = paletteIdx;

  const [initialized, setInitialized] = useState(false);

  // Cycle palette safely
  const cyclePalette = useCallback(() => {
    const nextIdx = (paletteIdxRef.current + 1) % WINE_GARNET_PALETTES.length;
    paletteIdxRef.current = nextIdx;
    setPaletteIdx(nextIdx);

    const palette = WINE_GARNET_PALETTES[nextIdx];
    if (appRef.current?.tubes) {
      try {
        appRef.current.tubes.setColors(palette.tubes);
        appRef.current.tubes.setLightsColors(palette.lights);
      } catch (err) {
        console.warn('Failed to update tube colors:', err);
      }
    }
    if (onPaletteChange) {
      onPaletteChange(palette);
    }
  }, [onPaletteChange]);

  // Handle click on empty background
  const handleContainerClick = useCallback((e) => {
    // If click is on interactive controls, inputs, buttons, dialogs, don't cycle
    const target = e.target;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('form') ||
      target.closest('label') ||
      target.closest('[role="button"]') ||
      target.closest('.auth-interactive-card')
    ) {
      return;
    }
    cyclePalette();
  }, [cyclePalette]);

  // Initialize TubesCursor
  useEffect(() => {
    if (!hasWebGL || reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let isCancelled = false;

    // Clean up any stale instance before creating a new one
    if (appRef.current) {
      try {
        appRef.current.dispose();
      } catch (e) {
        console.warn('Previous Tubes instance cleanup:', e);
      }
      appRef.current = null;
    }

    const initialPalette = WINE_GARNET_PALETTES[paletteIdxRef.current];

    try {
      const app = TubesCursor(canvas, {
        tubes: {
          colors: initialPalette.tubes,
          lights: {
            intensity: 70,
            colors: initialPalette.lights,
          },
        },
      });

      if (isCancelled) {
        app.dispose();
        return;
      }

      // Cap pixel ratio for performance
      if (app.three) {
        app.three.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        app.three.minPixelRatio = 1;
        app.three.resize();

        // Pause/resume interceptor
        const origRender = app.three.render;
        app.three.render = function () {
          if (isPausedRef.current) return;
          origRender.call(app.three);
        };
      }

      appRef.current = app;
      setInitialized(true);
    } catch (err) {
      console.warn('TubesCursor initialization error:', err);
      setInitialized(false);
    }

    return () => {
      isCancelled = true;
      if (appRef.current) {
        try {
          appRef.current.dispose();
        } catch (err) {
          console.warn('TubesCursor dispose error:', err);
        }
        appRef.current = null;
      }
    };
  }, [hasWebGL, reducedMotion]);

  const togglePause = useCallback((e) => {
    e.stopPropagation();
    setIsPaused(prev => !prev);
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`absolute inset-0 overflow-hidden select-none ${className}`}
      style={{ backgroundColor: '#17080F' }}
      aria-hidden="true"
    >
      {/* Real 3D Tubes Canvas */}
      {!reducedMotion && hasWebGL ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none z-0"
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}

      {/* Static Fallback for reduced-motion or WebGL-unsupported devices */}
      {(reducedMotion || !hasWebGL || !initialized) && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-60 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, #B92345 0%, #8C1538 40%, #220B15 70%, transparent 100%)',
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-[100px]"
            style={{
              background: 'radial-gradient(circle, #F28BA8 0%, #B92345 35%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* Atmospheric dark-wine vignette to preserve excellent contrast for text & inputs */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(23,8,15,0.3) 0%, rgba(23,8,15,0.7) 70%, rgba(23,8,15,0.92) 100%)',
        }}
      />

      {/* Subtle Wine Weave Texture */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 weave-texture" />

      {/* Discreet accessible pause / resume and theme palette indicator */}
      {!reducedMotion && hasWebGL && (
        <aside
          aria-label="Background animation controls"
          className="absolute bottom-4 right-4 z-30 pointer-events-auto flex items-center gap-2"
        >
          <button
            type="button"
            onClick={togglePause}
            aria-label={isPaused ? 'Resume background animation' : 'Pause background animation'}
            title={isPaused ? 'Resume background 3D animation' : 'Pause background 3D animation'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#633044] bg-[#2C101C]/80 hover:bg-[#3A1524] text-[#D7B7C2] hover:text-[#FFF4F6] backdrop-blur-md transition-all shadow-md cursor-pointer focus-visible:outline-[#F7A5BD]"
          >
            {isPaused ? <Play size={13} className="text-[#F28BA8]" /> : <Pause size={13} className="text-[#F28BA8]" />}
            <span className="hidden sm:inline">{isPaused ? 'Resume 3D' : 'Pause 3D'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cyclePalette();
            }}
            aria-label="Cycle Wine & Garnet palette"
            title={`Palette: ${WINE_GARNET_PALETTES[paletteIdx].name} (Click to change)`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border border-[#633044] bg-[#2C101C]/80 hover:bg-[#3A1524] text-[#D7B7C2] hover:text-[#FFF4F6] backdrop-blur-md transition-all shadow-md cursor-pointer focus-visible:outline-[#F7A5BD]"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20 shadow-[0_0_8px_currentColor]"
              style={{
                backgroundColor: WINE_GARNET_PALETTES[paletteIdx].tubes[1],
                color: WINE_GARNET_PALETTES[paletteIdx].tubes[1],
              }}
            />
            <span className="text-[11px] hidden md:inline">{WINE_GARNET_PALETTES[paletteIdx].name}</span>
          </button>
        </aside>
      )}
    </div>
  );
}
