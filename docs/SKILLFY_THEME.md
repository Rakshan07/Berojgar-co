# Skillfy appearance

The shared palette is in `src/theme.css`. Light mode uses wisteria, apricot, pale lavender surfaces and dark plum text. Dark mode uses plum surfaces, pale text and the same accents.

The floating theme button is available on all routes. The preference is saved locally as `skillfy-theme` and restored before React renders. Existing `teamweave_token` storage keys and asset paths are retained to preserve sessions and links.

The supplied logo is `public/skillfy-logo.png`; `BrandMark` displays a cropped SVG viewport of the original without altering it. `public/favicon.svg` embeds the same logo.

Validation: production Vite build; 24 isolated backend tests; desktop light/dark landing and sign-in checks; mobile sign-in and introduction checks. Authenticated dashboard data and provider credentials are unchanged by the appearance update.
