import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png'],
            manifest: {
                name: 'Mdaftari - Track Every Shilling',
                short_name: 'Mdaftari',
                description: 'Track partial payments, debts, and worker splits from M-Pesa and Airtel Money',
                theme_color: '#0D9488',
                background_color: '#FFFFFF',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'firebase-cache',
                            networkTimeoutSeconds: 10,
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                            }
                        }
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
});
