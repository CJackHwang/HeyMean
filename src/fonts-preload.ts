// Preload critical fonts using Vite's ?url to resolve dev and prod asset URLs
// This ensures fonts are fetched early and cached before first render.

function addFontPreload(href: string) {
  try {
    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head || !href) return;
    // Avoid duplicate preload for the same href
    if (head.querySelector(`link[rel="preload"][as="font"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = href;
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    head.appendChild(link);
  } catch {}
}

// Material Symbols (Outlined)
import outlinedUrl from 'material-symbols/material-symbols-outlined.woff2?url';
addFontPreload(outlinedUrl);

// Inter weights used in the app
import inter400Url from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import inter500Url from '@fontsource/inter/files/inter-latin-500-normal.woff2?url';
import inter600Url from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
import inter700Url from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import inter800Url from '@fontsource/inter/files/inter-latin-800-normal.woff2?url';

addFontPreload(inter400Url);
addFontPreload(inter500Url);
addFontPreload(inter600Url);
addFontPreload(inter700Url);
addFontPreload(inter800Url);

