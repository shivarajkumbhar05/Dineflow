import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 3000 matches FRONTEND_URL / CORS_ORIGINS in the backend .env.example
export default defineConfig({ plugins: [react()], server: { port: 3000 } });
