import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://style-logic.ru',
  base: '/promo/shkola-manikyura/',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
