# Motion landing-page integration

The approved standalone interface is integrated at `/` on `website-interface`.
The version retains 12 event categories, real team photos, the original orbit/scatter sequence, 1.2x playback speed, and the expanding-page ending. WORLD labels are removed. Later cylinder, fan, and shatter trials are not included.

## Implementation

- `src/pages/public/MotionLandingPage.jsx`: React landing page and category filters.
- `src/components/landing/mountLandingIntro.js`: scoped animation controller with cleanup for route changes and React StrictMode.
- `src/components/landing/MotionLanding.css`: styles scoped to `.motion-landing`.
- `src/components/landing/landingCategories.js`: category copy.
- `public/teamweave-motion/`: local event photos, source metadata, and credits.
- `src/App.jsx`: switches only the homepage import. The previous LandingPage.jsx is retained for easy rollback.

Login connects to `/login`, signup to `/login?tab=signup`, organizer onboarding to `/organizer/auth?tab=signup`, and event exploration to `/events`. Category cards open the existing event discovery page; its existing filters remain unchanged. No prototype placeholder dialogs are used.

Run `npm.cmd run dev` from the project directory to preview.

## Validation

Production build passed (Vite reports its existing large-bundle advisory).
Targeted lint passed. Animation lifecycle checks passed for StrictMode setup/cleanup, listener/card cleanup, page reveal, skip/replay, reduced motion, and restoring page scrolling. Browser visual QA was not completed in this environment.

No backend, database, login implementation, or dashboard files were changed. Existing untracked database work was preserved. Changes have not been committed or pushed.
