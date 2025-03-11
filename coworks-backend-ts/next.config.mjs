/** @type {import('next').NextConfig} */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  },
  typescript: {
    // This allows production builds to successfully complete even if
    // there are TypeScript errors
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Handle path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // This makes Webpack treat pg-native as an external dependency
    config.externals.push('pg-native');
    return config;
  },
};

export default nextConfig;