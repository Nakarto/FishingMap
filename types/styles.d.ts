/**
 * Lets TypeScript's editor language service resolve global stylesheet imports.
 * Next.js still performs the actual stylesheet bundling at build time.
 */
declare module '*.css';
