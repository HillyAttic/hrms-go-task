/** @type {import("next").NextConfig} */
const nextConfig = {
  // Enable experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'react-apexcharts',
      'date-fns',
      'dayjs',
      '@radix-ui/react-dialog',
      'react-hook-form',
      '@hookform/resolvers',
    ],
  },

  // Production optimizations
  reactStrictMode: true,

  // Optimize bundle splitting - MORE AGGRESSIVE
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // More aggressive code splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          maxSize: 244000, // Split chunks larger than 244KB
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React, React-DOM, Scheduler)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Firebase - single chunk to avoid missing dependencies
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 39,
              enforce: true,
            },
            // Charts - separate chunk
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](apexcharts|react-apexcharts)[\\/]/,
              priority: 35,
              enforce: true,
            },
            // UI libraries
            radixUI: {
              name: 'radix-ui',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              priority: 30,
              enforce: true,
            },
            heroicons: {
              name: 'heroicons',
              test: /[\\/]node_modules[\\/]@heroicons[\\/]/,
              priority: 29,
              enforce: true,
            },
            // Form libraries
            forms: {
              name: 'forms',
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/,
              priority: 28,
              enforce: true,
            },
            // Date libraries
            dates: {
              name: 'dates',
              test: /[\\/]node_modules[\\/](date-fns|dayjs|flatpickr)[\\/]/,
              priority: 27,
              enforce: true,
            },
            // Common vendor chunk for remaining node_modules
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common code used across pages
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };

      // Minimize bundle size
      config.optimization.minimize = true;
    }
    return config;
  },

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: ""
      },
      {
        protocol: "https",
        hostname: "t4.ftcdn.net",
        port: ""
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: ""
      }
    ]
  },

  // Enable compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Turbopack configuration (empty to silence warning)
  turbopack: {},

  // Performance headers for caching, compression, and security
  async headers() {
    return [
      // Notifications page - NO CACHING
      {
        source: '/notifications',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // Main Service Worker - NO CACHING
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      // Firebase Messaging Service Worker
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      // Static assets - cache with revalidation
      // Prod filenames are content-hashed, so a year is safe. Dev filenames are
      // NOT (the hash is the directory, not the content), so a one-year max-age
      // pins the browser to the first copy it ever saw and code edits stop
      // appearing until a manual hard reload.
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value:
              process.env.NODE_ENV === 'production'
                ? 'public, max-age=31536000, stale-while-revalidate=86400'
                : 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Performance and security headers for all pages
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
      // Preconnect hints for critical origins
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '<https://firestore.googleapis.com>; rel=preconnect, <https://identitytoolkit.googleapis.com>; rel=preconnect',
          },
        ],
      },
      {
        source: '/dashboard',
        headers: [
          {
            key: 'Link',
            value: '<https://firestore.googleapis.com>; rel=preconnect, <https://identitytoolkit.googleapis.com>; rel=preconnect',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
