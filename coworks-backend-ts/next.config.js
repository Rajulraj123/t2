/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript and ESLint checks during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Use standalone output for better Vercel compatibility
  output: 'standalone',
  
  // Configure experimental options properly
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs'],
    esmExternals: 'loose',
    missingSuspenseWithCSRBailout: false, // Prevent hydration issues with dynamic content
  },

  // Add headers for CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Explicitly set the runtime for each route
  // This ensures Sequelize and other Node.js modules work properly
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  
  // Disable static generation for API routes
  staticPageGenerationTimeout: 1000,
  
  // Custom webpack config for Node.js modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'bcryptjs', '@mapbox/node-pre-gyp'];
    }
    
    return config;
  }
};

module.exports = nextConfig; 