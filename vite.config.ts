import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 框架与应用分包: react 版本不动时用户可长期命中缓存
        manualChunks(id: string) {
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor'
        },
      },
    },
  },
})
