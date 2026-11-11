import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    // pdf.js "legacy" build includes polyfills, so the magazine reader works on older phones and browsers.
    webpackConfig.resolve.alias = { ...webpackConfig.resolve.alias, 'pdfjs-dist$': 'pdfjs-dist/legacy/build/pdf.mjs' }
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // Old WordPress / BuddyPress pages → their new addresses (stories, categories and magazines are
  // matched in src/lib/legacy.ts).
  async redirects() {
    return [
      { source: '/about-lasu-champion', destination: '/about', permanent: true },
      { source: '/advertisement', destination: '/advertise', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/register', destination: '/signup', permanent: true },
      { source: '/wp-login.php', destination: '/login', permanent: true },
      { source: '/wp-admin/:path*', destination: '/admin', permanent: true },
      { source: '/members', destination: '/', permanent: true },
      { source: '/members/:username/:rest+', destination: '/members/:username', permanent: true },
      { source: '/activity/:path*', destination: '/', permanent: true },
      { source: '/groups/:path*', destination: '/', permanent: true },
      { source: '/feed', destination: '/rss.xml', permanent: true },
    ]
  },
  turbopack: {
    root: path.resolve(dirname),
    resolveAlias: { 'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.mjs' },
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
