// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';

import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://style-logic.ru',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [icon()],

  adapter: node({ mode: 'standalone' }),

  session: false,

  env: {
    schema: {
      TELEGRAM_BOT_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      TELEGRAM_CHAT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
});
