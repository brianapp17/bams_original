import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    origin: 'https://9000-idx-boltngit-1745443449544.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev'
  }
});
