/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production output separate from the development server cache.
  // This lets `npm run build` run without invalidating CSS/chunk URLs served by `npm run dev`.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

export default nextConfig;
