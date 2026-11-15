# Этап 3. Миграция репозитория

Статус: выполнен 2026-11-14. Техническая миграция, сборки и smoke завершены; посторонние изменения разведены коммитами. На момент закрытия этапа дерево было чистым; артефакты этапа 4 ещё не закоммичены.

Где: локально, `/home/max/projects/site-dev`.

Цель: превратить Vercel-сборку в self-hosted Astro standalone, перевести секреты на `astro:env`, перенести три promo в `promos/`, выровнять Astro до 7.4.11, починить `base` и noindex.

Предусловия:

- Этапы 1–2 завершены или выполняются параллельно; для сборки сервер не нужен.
- Есть доступ к исходным каталогам promo.
- Рабочее дерево разобрано: посторонние изменения не смешиваются с деплойными коммитами.

Оценка: 2–4 часа, включая сборки и проверки.

## 3.0 Очистить локальное состояние

```bash
git status --short
git log --oneline -5
```

Проверить:

- `README.md`, удалённые `docs/*`, `public/logo1.png` — это не деплойные изменения; закоммитить отдельно или убрать в stash.
- `astro.config.node-test.mjs` — эксперимент прошлой попытки; удалить.
- `node_modules/@astrojs/node` — extraneous-симлинк на `/tmp/node-adapter`; удалить и поставить штатно.
- `package-lock.json` не должен содержать `@astrojs/node`, пока он не добавлен в зависимости.

```bash
rm -f astro.config.node-test.mjs
rm -rf node_modules/@astrojs/node
npm ls @astrojs/node --depth=0
```

Ожидаемо: `npm ls` не показывает extraneous-адаптер.

Стоп-точка: рабочее дерево содержит только осознанные изменения. Не использовать `git add -A`.

Факт: `astro.config.node-test.mjs` и extraneous-адаптер удалены. Посторонние изменения разведены коммитами `f756cf6` (деплой) и `3e03381` (удаление старых планов, очистка README); рабочее дерево чистое.

## 3.1 Astro и Node adapter

```bash
npm install astro@7.4.11 @astrojs/node@11.1.12
npm uninstall @astrojs/vercel vercel
```

Проверка:

```bash
node -p "require('./node_modules/astro/package.json').version"
node -p "require('./node_modules/@astrojs/node/package.json').version"
npm ls @astrojs/node --depth=0
```

Ожидаемо: Astro 7.4.11, адаптер 11.1.12, без extraneous. `package.json` и `package-lock.json` обновлены.

Важно: адаптеру нужен Astro `^7.2.1`, поэтому 3.1 выполняется до 3.2. `session: false` поддерживается в Astro 7.4.11.

## 3.2 `astro.config.mjs`

```js
// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://style-logic.ru',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [icon()],

  adapter: node({ mode: 'standalone' }),

  // Сессии не используются; отключаем файловый драйвер.
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
```

Проверка: `npm run build` не требует Telegram-переменных.

## 3.3 `package.json` и runtime-зависимости

Добавить скрипт:

```json
"start": "node ./dist/server/entry.mjs"
```

`@astrojs/vercel` и `vercel` должны исчезнуть из зависимостей.

Решение D3: на сервере npm не нужен. В CI после сборки выполняется `npm prune --omit=dev`, а `node_modules` попадает в релиз через rsync. Локально для проверки достаточно `npm install`; `dist/server` требует пакеты Astro рядом с `dist`.

## 3.4 `src/pages/api/send-lead.ts`

Заменить чтение `import.meta.env` на runtime-импорт:

```ts
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from 'astro:env/server';
```

Удалить строки:

```ts
const botToken = import.meta.env.TELEGRAM_BOT_TOKEN as string | undefined;
const chatId = import.meta.env.TELEGRAM_CHAT_ID as string | undefined;
```

и заменить обращения `botToken` / `chatId` на импортированные значения. Проверка на отсутствие значений остаётся runtime-проверкой.

Проверка:

```bash
grep -n "import.meta.env" src/pages/api/send-lead.ts
```

Ожидаемо: пусто.

## 3.5 Canonical и OG главного сайта

В `src/layouts/main.astro` после `title`/`description`:

```astro
const canonical = new URL(Astro.url.pathname, Astro.site);
```

В `<head>`:

```astro
<link rel="canonical" href={canonical} />
<meta property="og:url" content={canonical} />
```

Заменить относительные `og:image` и `twitter:image` на абсолютные:

```astro
<meta property="og:image" content={new URL('/logo.png', Astro.site).href} />
<meta name="twitter:image" content={new URL('/logo.png', Astro.site).href} />
```

Проверка: в собранном HTML canonical и OG содержат `https://style-logic.ru/...`.

## 3.6 Ссылки на promo

В `src/data/site.ts` заполнить пустые `siteUrl`:

```ts
siteUrl: "/promo/pekarnya/",
siteUrl: "/promo/shkola-manikyura/",
siteUrl: "/promo/kofeynya/",
```

Проверка: ссылки в кейсах ведут на `/promo/<slug>/` и открываются в новой вкладке.

## 3.7 Перенос promo в monorepo

```bash
mkdir -p promos

rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .git \
  --exclude .agents --exclude .opencode --exclude opencode.json \
  --exclude skills-lock.json --exclude '.aider*' \
  --exclude AGENTS.md --exclude docs \
  /home/max/projects/bakery-shop/ promos/pekarnya/

rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .git \
  --exclude .agents --exclude .opencode --exclude opencode.json \
  --exclude skills-lock.json --exclude '.aider*' \
  --exclude ansible --exclude .envrc --exclude .direnv \
  --exclude flake.nix --exclude flake.lock --exclude graft \
  --exclude skill --exclude 'promt.md' --exclude 'deploy.md' \
  --exclude AGENTS.md --exclude README.md \
  /home/max/projects/manicure-site/ promos/shkola-manikyura/

rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .git \
  --exclude .agents --exclude .opencode --exclude opencode.json \
  --exclude skills-lock.json --exclude '.aider*' \
  --exclude image --exclude docs \
  --exclude AGENTS.md --exclude AI_RULES.md --exclude README.md \
  /home/max/projects/coffee-shop/ promos/kofeynya/
```

Проверить, что секреты не попали:

```bash
find promos -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key'
```

Ожидаемо: пусто. Если найден `.env.example`, это не секрет, но проверить содержимое.

Выровнять Astro во всех promo:

```bash
for dir in promos/*; do
  (cd "$dir" && npm install astro@7.4.11)
done
```

Убрать sitemap и robots у `pekarnya`:

```bash
cd promos/pekarnya
npm uninstall @astrojs/sitemap
rm -f src/pages/robots.txt.ts public/robots.txt public/sitemap-index.xml public/sitemap-0.xml
cd ../..
```

Удалить интеграцию sitemap из `promos/pekarnya/astro.config.mjs` и ссылку на sitemap из layout, если она есть.

Проверка: в `promos/*/package.json` Astro 7.4.11; lockfiles обновлены.

## 3.8 Promo: `base`, `site`, noindex

`promos/pekarnya/astro.config.mjs`:

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://style-logic.ru",
  base: "/promo/pekarnya",
  trailingSlash: "always",
  devToolbar: { enabled: false },
});
```

`promos/shkola-manikyura/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://style-logic.ru',
  base: '/promo/shkola-manikyura',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

`promos/kofeynya/astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://style-logic.ru',
  base: '/promo/kofeynya',
  trailingSlash: 'always',
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Добавить helper в каждый promo, например `src/lib/base.ts`:

```ts
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${base}${path}`;
}
```

В каждом layout в `<head>`:

```astro
<meta name="robots" content="noindex, follow" />
```

## 3.9 Promo: ссылки, ассеты, canonical

Найти root-absolute пути:

```bash
grep -rnE '(href|src|srcset|poster|content)="/' promos/*/src --include='*.astro' --include='*.ts'
grep -rnE "url\\(['\"]?/" promos/*/src --include='*.css' --include='*.astro'
grep -rnE "(fetch|new URL)\\(['\"]?/" promos/*/src --include='*.ts' --include='*.astro'
```

Заменить на `withBase(...)`, например:

```astro
<a href={withBase("/menu/")}>Меню</a>
<img src={withBase("/images/hero.webp")} alt="" />
```

Не забыть:

- `pekarnya`: `src/scripts/order-page.ts`, `Logo`, `Header`, `Footer`, `Hero`, `CtaPanel`, `CartBar`, `PageStub`, `FeaturedBake`, `OrderForm`, `404`, `contacts`.
- `shkola-manikyura`: `Header`, `Footer`, `404`, иконки в layout.
- `kofeynya`: `/images/*.webp` в `Bakery`, `Menu`, `About`, `Atmosphere`, `Hero`, `Location`, `FeaturedCoffee`, `Footer`, `404`, favicon в `Layout`.

Манифест и canonical:

- `promos/pekarnya/public/site.webmanifest`: `start_url` и `icons[].src` с `/promo/pekarnya/...`.
- `<link rel="manifest" href={withBase("/site.webmanifest")} />`.
- Canonical/OG: `new URL(Astro.url.pathname, Astro.site).href`; для изображений — абсолютный URL с base.
- `shkola-manikyura`: убрать дефолт `ogUrl = 'https://nailschool.ru'`, вычислять от `Astro.site` и `Astro.url`; `ogImage` прогнать через `withBase`.
- `kofeynya`: добавить canonical и абсолютный `og:image` с base.

Проверка:

```bash
grep -rnE '(href|src)="/' promos/*/src --include='*.astro' --include='*.ts'
```

Ожидаемо: остались только внешние URL или пути, которым base не нужен.

## 3.10 Сборка и smoke

```bash
npm install
npm run build

for dir in promos/*; do
  echo "=== $dir"
  (cd "$dir" && npm install && npm run build)
done
```

Smoke main-сборки:

```bash
ROOT=/home/max/projects/site-dev
rm -rf /tmp/style-logic-smoke
mkdir -p /tmp/style-logic-smoke
cp -a "$ROOT/dist" /tmp/style-logic-smoke/
cp "$ROOT/package.json" /tmp/style-logic-smoke/
ln -s "$ROOT/node_modules" /tmp/style-logic-smoke/node_modules
cd /tmp/style-logic-smoke
PORT=4399 HOST=127.0.0.1 node dist/server/entry.mjs &
SERVER_PID=$!
sleep 2
curl -fsS -o /dev/null http://127.0.0.1:4399/ && echo "smoke ok"
kill "$SERVER_PID"
```

Проверка promo:

```bash
ls promos/pekarnya/dist/index.html
ls promos/shkola-manikyura/dist/index.html
ls promos/kofeynya/dist/index.html
grep -o '<meta name="robots"[^>]*>' promos/*/dist/index.html
grep -o '/promo/[a-z-]*/_astro/[^"]*' promos/*/dist/index.html | head
```

Ожидаемо: все три `index.html` существуют; в каждом `noindex, follow`; `_astro` начинается с `/promo/<slug>/`.

## Критерии приёмки

- [x] Extraneous-адаптер удалён; посторонние изменения разведены коммитами, рабочее дерево чистое.
- [x] Astro 7.4.11 и `@astrojs/node` 11.1.12 установлены штатно, версии закреплены точно.
- [x] `@astrojs/vercel` и `vercel` удалены.
- [x] `astro.config.mjs` использует Node adapter и `astro:env`.
- [x] `send-lead.ts` не содержит `import.meta.env`.
- [x] Canonical и OG главной абсолютные.
- [x] `siteUrl` заполнены.
- [x] `promos/` содержит три проекта; исходники без `.git`, `node_modules` и `dist` (локальные `node_modules`/`dist` созданы сборкой и покрыты `.gitignore`).
- [x] Секретов в `promos/` нет.
- [x] Все три promo собираются с base и содержат noindex.
- [x] Smoke main-сборки проходит.

## Фактическое выполнение

- Main: Astro 7.4.11, `@astrojs/node` 11.1.12, `session: false`; `npm run build` успешен, `dist/client/` и `dist/server/entry.mjs` созданы.
- Pekarnya: Astro 7.4.11, `astro check` — 0 ошибок, 0 предупреждений; сборка 7 страниц; `vitest` — 42 теста пройдены.
- Manicure: Astro 7.4.11, `astro check` — 0 ошибок; сборка 5 страниц; исправлена типизация `prev`/`next` в `StudentWorks.astro`.
- Coffee: Astro 7.4.11; сборка 2 страниц.
- Smoke: `GET /` на `127.0.0.1:4399` — 200, `smoke ok`.
- Base/noindex: canonical, OG и ассеты всех promo начинаются с `/promo/<slug>/`; во всех `index.html` — `noindex, follow`.
- Известные аудиты: main — 1 high (`js-yaml`, транзитивная), coffee — 1 high (`sharp`, librsvg); не исправлялись в этом этапе.

## Откат

1. Изменения этапа 3 — локальные; откат через git:

```bash
git status
git diff
git restore <file>
```

2. Если промо уже скопированы, удалить каталоги `promos/` и вернуть `.gitignore`/lockfiles.
3. Не откатывать `package-lock.json` частично; либо полный откат коммита, либо новый коммит с исправлением.

## Артефакты

- Обновлённые `package.json`, `package-lock.json`, `astro.config.mjs`.
- `promos/` с тремя проектами.
- Запись результатов в `STATUS.md`.
