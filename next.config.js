const path = require('path')
const fs = require('fs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix for pages-manifest.json ENOENT error in App Router projects
  // Next.js 14 App Router generates pages-manifest.json for compatibility,
  // but sometimes tries to read it before it's written during build finalization
  webpack: (config, { isServer, dev, webpack }) => {
    if (isServer && !dev) {
      // Create a plugin that ensures pages-manifest.json exists early
      // This prevents ENOENT errors during build finalization
      class EnsurePagesManifestPlugin {
        apply(compiler) {
          compiler.hooks.afterEmit.tap('EnsurePagesManifestPlugin', () => {
            const manifestPath = path.join(
              compiler.outputPath,
              'server',
              'pages-manifest.json'
            )
            const manifestDir = path.dirname(manifestPath)
            
            // Ensure directory exists
            if (!fs.existsSync(manifestDir)) {
              fs.mkdirSync(manifestDir, { recursive: true })
            }
            
            // Create empty manifest if it doesn't exist (App Router uses app-paths-manifest.json)
            if (!fs.existsSync(manifestPath)) {
              fs.writeFileSync(manifestPath, JSON.stringify({}), 'utf8')
            }
          })
        }
      }
      
      config.plugins.push(new EnsurePagesManifestPlugin())
    }
    return config
  },
}

module.exports = nextConfig

