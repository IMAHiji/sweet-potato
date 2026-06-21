/// <reference types="vite/client" />
import type { Alpine } from 'alpinejs';

// Allow side-effect imports of stylesheets in the client bundle.
declare module '*.scss';
declare module '*.css';

declare global {
  interface Window {
    Alpine: Alpine;
  }
}

export {};
