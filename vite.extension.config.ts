import fs from 'fs'
import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, Plugin } from 'vite'

function copyExtensionAssets(): Plugin {
  return {
    name: 'copy-extension-assets',
    apply: 'build',
    closeBundle() {
      const sourceDir = path.resolve(__dirname, 'extension')
      const outDir = path.resolve(__dirname, 'dist/extension')
      const manifestPath = path.join(sourceDir, 'manifest.json')

      fs.mkdirSync(outDir, { recursive: true })
      fs.copyFileSync(manifestPath, path.join(outDir, 'manifest.json'))

      const iconsDir = path.join(sourceDir, 'icons')
      if (fs.existsSync(iconsDir)) {
        fs.cpSync(iconsDir, path.join(outDir, 'icons'), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), copyExtensionAssets()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    outDir: 'dist/extension',
    emptyOutDir: true,
    rollupOptions: {
      input: { popup: path.resolve(__dirname, 'extension/popup.html') },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      }
    }
  }
})
