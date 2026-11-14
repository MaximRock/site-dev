# Runbook: style-logic.ru на VPS

Статус: план. Реализация ещё не начата; изменён только этот файл.

Домен: `style-logic.ru` (DNS в SpaceWeb, A-записи `@` и `www` уже указывают на VPS).
VPS: Ubuntu 24.04, `62.173.152.100`, 2 vCPU, 2 GB RAM, 40 GB SSD.
Почта остаётся на SpaceWeb: MX, SPF, autoconfig/autodiscover не трогаем.

## Перед началом: как читать runbook

- `[VPS]` — команда выполняется на сервере по SSH. Если не указано иное, пользователь `root`.
- `[локально]` — команда выполняется на вашем компьютере в каталоге `/home/max/projects/site-dev`.
- `<EMAIL>`, `<REV>`, `<PREVIOUS_REV>` — подставить своё значение. Угловые скобки при подстановке не нужны.
- «Зачем» — что делает шаг. «Ожидаемо» — как понять, что всё получилось.
- «Стоп-точка» — не продолжать, пока проверка не пройдена. Это важнее скорости.
- Команды можно копировать целиком. Комментарии `#` внутри блоков не выполняются.
- Если команда вернула ошибку, не пропускайте её: сначала откройте «Приложение A. Если что-то пошло не так».

## 0. Итоговая схема

```
Интернет
  |
  v
nginx :80/:443 (TLS, статика, rate limit)
  |-- /                         -> /srv/site/current/dist/client   (статика Astro)
  |-- /api/send-lead            -> 127.0.0.1:4321                 (Node, Astro standalone)
  |-- /promo/pekarnya/          -> /srv/www/promo/pekarnya/       (статика)
  |-- /promo/shkola-manikyura/  -> /srv/www/promo/shkola-manikyura/
  `-- /promo/kofeynya/          -> /srv/www/promo/kofeynya/

GitHub Actions
  |-- сборка main + promos
  |-- rsync в /srv/site/releases/<sha> и /srv/www/releases/promo/<slug>/<sha>
  `-- атомарная смена симлинков + restart style-logic + reload nginx
```

Пути на сервере:

| Что | Путь |
| --- | --- |
| Релизы main | `/srv/site/releases/<sha>` |
| Текущий main | `/srv/site/current` |
| Релизы promo | `/srv/www/releases/promo/<slug>/<sha>` |
| Текущий promo | `/srv/www/promo/<slug>` |
| Секреты | `/etc/site/site.env` (root:root, 0600) |
| systemd unit | `/etc/systemd/system/style-logic.service` |
| sudoers | `/etc/sudoers.d/deploy-style-logic` |
| nginx site | `/etc/nginx/sites-available/style-logic.conf` |
| nginx snippets | `/etc/nginx/snippets/style-logic-*.conf` |
| rate limit zones | `/etc/nginx/conf.d/style-logic-limits.conf` |

Принципы:

- Секреты Telegram живут только на сервере. В GitHub и в репозитории их нет.
- Сборка в CI не требует Telegram-переменных: `astro:env` с `optional: true`.
- Promo-сайты отдаются с `noindex, follow` (демо-кейсы, не для индекса).
- `www` редиректит на apex. HTTP редиректит на HTTPS.
- Почтовые DNS-записи SpaceWeb не меняются.

## 0.1 Что понадобится

- Email для Let's Encrypt (подставить вместо `<EMAIL>`).
- Локальный `.env` с `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.
- Доступ к GitHub-репозиторию `MaximRock/site-dev`.
- Снапшот VPS в панели провайдера перед началом.

## 0.2 Порядок этапов

| Этап | Где выполняется | Что делает |
| --- | --- | --- |
| 1 | VPS (root) | Базовый bootstrap: обновления, swap, deploy, SSH, UFW, fail2ban, Node, nginx |
| 2 | VPS (root) | Заглушка и HTTPS, чтобы домен перестал быть недоступным |
| 3 | локально | Миграция репозитория: Node adapter, env, promos, base, noindex |
| 4 | локально | Файлы деплоя: nginx, systemd, sudoers, workflow, скрипт активации |
| 5 | VPS (root) + локально | Первый ручной деплой, запуск сервиса, боевой nginx |
| 6 | GitHub + VPS | Ключ CI, secrets, первый прогон Actions |
| 7 | везде | Приёмка: домен, HTTPS, promo, форма, лимиты |
| 8 | VPS (root) | Обслуживание: автообновления, journal, сертификаты, бэкапы |
| 9 | везде | Финальный чек-лист и откат |

---

## Этап 1. Bootstrap VPS

### 1.1 Снапшот и исходные данные

**Зачем:** зафиксировать состояние сервера для отката и понять, хватает ли ресурсов.

**Стоп-точка:** без снапшота дальше не идти.

Сделать снапшот в панели провайдера (имя `pre-bootstrap`), затем `[VPS]`:

```bash
hostnamectl
free -h
df -h /
ss -tulpn | grep -E ':(80|443|22)\b' || true
```

Ожидаемо: Ubuntu 24.04, ~2 GB RAM, ~40 GB диска, порты 22 и, возможно, 80 свободны.

### 1.2 Обновление и базовые пакеты

**Зачем:** закрыть известные уязвимости, поставить nginx, Node-инструменты, firewall и утилиты, выставить московское время.

`[VPS]`

```bash
export DEBIAN_FRONTEND=noninteractive   # не задавать вопросы при установке
apt update                              # обновить список пакетов
apt -y full-upgrade                     # обновить уже установленные пакеты
# поставить всё, что понадобится дальше
apt -y install \
  curl ca-certificates gnupg dnsutils ufw fail2ban rsync \
  nginx certbot python3-certbot-nginx git htop unzip jq

timedatectl set-timezone Europe/Moscow  # время в логах и на сертификатах
timedatectl
```

**Ожидаемо:** `Time zone: Europe/Moscow`, установка завершилась без ошибок.

Если обновилось ядро, проверить:

```bash
cat /var/run/reboot-required 2>/dev/null || echo "reboot not required"
```

Ребутнуть можно после этапа 1 целиком.

### 1.3 Swap 2 GB

**Зачем:** на 2 GB RAM запасной swap спасает от падения при пиках памяти. `swappiness=10` просит систему использовать его только при необходимости.

`[VPS]`

```bash
fallocate -l 2G /swapfile                 # создать файл подкачки на 2 GB
chmod 600 /swapfile                       # читать может только root
mkswap /swapfile                          # разметить файл как swap
swapon /swapfile                          # включить swap сейчас
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab  # включать после ребута
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
sysctl --system                           # применить настройку
```

**Ожидаемо:** `swapon --show` показывает `/swapfile`, в `free -h` появилась строка `Swap`.

Если `fallocate` выдал ошибку (редко, на не-ext4), создать файл через `dd`:

```bash
dd if=/dev/zero of=/swapfile bs=1M count=2048
```

Проверка:

```bash
swapon --show
free -h
```

### 1.4 Пользователь deploy

**Зачем:** приложения и деплой не должны работать под root. `deploy` будет владельцем релизов и запускать Node-сервис.

**Стоп-точка:** проверить вход под `deploy` до продолжения. Если вход не работает, SSH-настройки дальше не менять.

`[VPS]`

```bash
adduser --disabled-password --gecos "" deploy          # пользователь без пароля
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh  # каталог ключей
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys  # тот же ключ, что у root
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

**Ожидаемо:** пользователь создан, ключ на месте.

Проверить вход **из второго терминала**, не закрывая текущую сессию:

```bash
ssh deploy@62.173.152.100 'id'
```

CI-ключ добавим позже, на этапе 6.

### 1.5 Ужесточение SSH

**Зачем:** оставить вход только по ключам, запретить пароли и ограничить число попыток. Root остаётся доступен по ключу.

**Стоп-точка:** не закрывать текущую root-сессию, пока новый вход не проверен. При ошибке в конфиге легко потерять доступ.

`[VPS]`

```bash
cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F)  # резервная копия

cat > /etc/ssh/sshd_config.d/00-style-logic.conf <<'EOF'
# root только по ключу
PermitRootLogin prohibit-password
# вход по паролю запрещён
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF

sshd -t                    # проверить синтаксис, пока ничего не применяя
systemctl reload ssh       # применить без разрыва текущих сессий
```

Проверить эффективные значения:

```bash
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries) '
```

Важно: файл называется `00-`, чтобы читаться раньше `50-cloud-init.conf`. У OpenSSH выигрывает первое встреченное значение.

Проверить новый вход по ключу из второго терминала. Текущую root-сессию не закрывать, пока проверка не пройдена.

### 1.6 UFW

**Зачем:** открыть только SSH, HTTP и HTTPS, всё остальное входящее закрыть.

`[VPS]`

```bash
ufw default deny incoming    # входящие по умолчанию запрещены
ufw default allow outgoing   # исходящие разрешены
ufw allow OpenSSH            # сначала SSH, иначе можно потерять доступ
ufw allow 'Nginx Full'       # порты 80 и 443
ufw --force enable
ufw status verbose
```

Ожидаемо: разрешены 22, 80, 443; входящие по умолчанию запрещены.

### 1.7 fail2ban

**Зачем:** временно блокировать IP, которые подбирают SSH-пароли. `backend = systemd` нужен, чтобы fail2ban читал журнал на Ubuntu 24.04.

`[VPS]`

```bash
cat > /etc/fail2ban/jail.local <<'EOF'
# банить на час, считать попытки за 10 минут, после 5 неудач
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
# читать journald, а не auth.log
backend = systemd

[sshd]
enabled = true
EOF

systemctl enable --now fail2ban   # включить и запустить
fail2ban-client status            # список активных jail
fail2ban-client status sshd       # статистика по SSH
```

**Ожидаемо:** в статусе `sshd` есть `Currently banned` и `Total banned`.

### 1.8 Node.js 22

**Зачем:** Astro 7 требует Node `>=22.12.0`. Ставим LTS-ветку 22 из официального репозитория NodeSource.

`[VPS]`

```bash
install -d -m 0755 /etc/apt/keyrings   # каталог для ключей репозиториев

curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg   # подписной ключ

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list             # репозиторий Node 22

apt update
apt -y install nodejs

node -v
npm -v
```

Требование проекта: Node `>=22.12.0`. Если версия ниже, обновить NodeSource-пакет.

### 1.9 Проверка и ребут

```bash
node -v
npm -v
nginx -v
certbot --version
rsync --version | head -1

[ -f /var/run/reboot-required ] && reboot || echo "reboot not required"
```

После ребута (если был) проверить:

```bash
uptime
free -h
swapon --show
systemctl is-active nginx fail2ban
ufw status
```

### Итог этапа 1

Этап готов, если:

- [ ] `deploy` входит по ключу, root входит по ключу.
- [ ] `sshd -T` показывает `passwordauthentication no`.
- [ ] `ufw status` показывает 22, 80, 443.
- [ ] `fail2ban-client status sshd` работает.
- [ ] `node -v` >= 22.12.0, `nginx -v`, `certbot --version` отвечают.
- [ ] swap включён и виден в `free -h`.

---

## Этап 2. Заглушка и HTTPS

**Зачем:** домен уже указывает на VPS, но nginx ещё не настроен. Заглушка и сертификат быстро убирают `connection refused`, пока мы делаем боевой деплой.

Цель: домен быстро перестаёт отдавать `connection refused`, Let's Encrypt получает сертификат на `style-logic.ru` и `www.style-logic.ru`. Боевой конфиг заменит заглушку на этапе 5.

### 2.1 Проверить DNS

**Зачем:** certbot не выдаст сертификат, если домен ещё не указывает на этот сервер.

**Стоп-точка:** если ответ не `62.173.152.100`, подождать DNS и не запускать certbot.

`[локально или VPS]`

```bash
dig +short style-logic.ru @1.1.1.1
dig +short www.style-logic.ru @1.1.1.1
```

**Ожидаемо:** `62.173.152.100` в обоих случаях.

### 2.2 Временная заглушка

**Зачем:** получить сертификат можно только когда nginx уже отвечает на порту 80.

`[VPS]`

```bash
mkdir -p /var/www/style-logic-placeholder

cat > /var/www/style-logic-placeholder/index.html <<'EOF'
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>style-logic.ru</title>
  </head>
  <body>
    <h1>style-logic.ru</h1>
    <p>Сайт скоро вернётся.</p>
  </body>
</html>
EOF

cat > /etc/nginx/sites-available/style-logic.conf <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name style-logic.ru www.style-logic.ru;

    root /var/www/style-logic-placeholder;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default   # убрать стандартную заглушку nginx
ln -sfn /etc/nginx/sites-available/style-logic.conf /etc/nginx/sites-enabled/style-logic.conf

nginx -t              # проверить конфиг до применения
systemctl reload nginx
```

**Ожидаемо:** `curl` отдаёт HTML заглушки и HTTP 200.

Проверка:

```bash
curl -I http://style-logic.ru
curl -I http://www.style-logic.ru
```

### 2.3 Сертификат Let's Encrypt

**Зачем:** certbot сам получит сертификат, добавит его в nginx и настроит продление.

`[VPS]`

```bash
# --nginx: плагин nginx; -d: домены; --redirect: HTTP -> HTTPS; -m: email
certbot --nginx \
  -d style-logic.ru \
  -d www.style-logic.ru \
  --redirect \
  --agree-tos \
  --no-eff-email \
  -m <EMAIL>
```

**Ожидаемо:** certbot пишет `Congratulations`, оба домена открываются по HTTPS.

Проверка:

```bash
curl -I https://style-logic.ru
curl -I https://www.style-logic.ru
certbot renew --dry-run
```

На этом этапе `www` может ещё не редиректить на apex: это добавит боевой конфиг на этапе 5.

### Итог этапа 2

Этап готов, если:

- [ ] `http://style-logic.ru` и `http://www.style-logic.ru` отвечают.
- [ ] `https://style-logic.ru` и `https://www.style-logic.ru` открываются без предупреждения браузера.
- [ ] `certbot renew --dry-run` завершился успешно.

---

## Этап 3. Миграция репозитория (локально)

**Зачем:** превратить проект из Vercel-сборки в self-hosted Node-приложение, добавить promo в один репозиторий и починить пути под `/promo/...`.

Все команды ниже выполняются `[локально]` в `/home/max/projects/site-dev`, если не указано иное.

### 3.1 Adapter и версии

**Зачем:** Vercel-адаптер на VPS не нужен. Вместо него ставим официальный Node-адаптер в standalone-режиме.

`@astrojs/node@11.1.12` требует `astro ^7.2.1`, а в репозитории стоит `7.1.6`. Поэтому обновляем и Astro:

```bash
npm install astro@^7.4.11 @astrojs/node@^11.1.12  # обновить Astro и добавить Node adapter
npm uninstall @astrojs/vercel vercel               # убрать Vercel-зависимости
```

Проверка:

```bash
node -p "require('./node_modules/astro/package.json').version"
node -p "require('./node_modules/@astrojs/node/package.json').version"
```

### 3.2 `astro.config.mjs`

**Зачем:** указать домен, включить Node-адаптер, отключить сессии и описать Telegram-переменные как runtime-секреты.

Привести к виду:

```js
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

  // Сайт не использует сессии. Отключаем файловый session driver,
  // чтобы standalone-сервер ничего не писал на диск.
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

Почему не `output: 'server'`: страницы остаются prerendered, на лету работает только `/api/send-lead` (`prerender = false`). Адаптер нужен именно для этого маршрута.

### 3.3 `package.json`

**Зачем:** добавить удобную команду локального запуска того же сервера, который будет работать на VPS.

Добавить скрипт запуска standalone-сервера:

```json
"start": "node ./dist/server/entry.mjs"
```

`@astrojs/vercel` и `vercel` должны исчезнуть из зависимостей.

Важно: `dist/server` импортирует пакеты Astro (`piccolore`, `cookie`, `zod` и другие) из `node_modules`. Одного `dist` для запуска недостаточно. На сервере рядом с `dist` должен лежать `node_modules`, установленный через `npm ci --omit=dev`. Это делает деплой (шаги 5.4 и 4.9).

### 3.4 `src/pages/api/send-lead.ts`

**Зачем:** секреты должны читаться на сервере в момент запроса, а не вшиваться в сборку. Иначе CI без секретов соберёт неработающую форму.

Заменить чтение `import.meta.env` на `astro:env/server`:

```ts
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from 'astro:env/server';
```

Удалить строки:

```ts
const botToken = import.meta.env.TELEGRAM_BOT_TOKEN as string | undefined;
const chatId = import.meta.env.TELEGRAM_CHAT_ID as string | undefined;
```

и заменить обращения `botToken` / `chatId` на импортированные значения. Проверка на отсутствие значений остаётся, но теперь это runtime-проверка.

Подробнее: `import.meta.env` приватные значения Astro инлайнит на этапе сборки. CI собирал бы сайт без Telegram-секретов. `astro:env` с `access: 'secret'` читает `process.env` в рантайме, а systemd передаёт переменные из `/etc/site/site.env`.

### 3.5 Canonical и OG главного сайта

**Зачем:** поисковики должны знать основной адрес страницы, а соцсети — правильный URL.

В `src/layouts/main.astro` добавить canonical и `og:url` (если их ещё нет).

В frontmatter, между `---`, после объявления `title`/`description`:

```astro
const canonical = new URL(Astro.url.pathname, Astro.site);
```

В `<head>`, рядом с остальными `og:`-тегами:

```astro
<link rel="canonical" href={canonical} />
<meta property="og:url" content={canonical} />
```

`site` в конфиге уже задан (шаг 3.2), поэтому `Astro.site` определён.

### 3.6 Ссылки на promo в `src/data/site.ts`

**Зачем:** на главной у кейсов должны появиться рабочие ссылки «Перейти на сайт».

Заполнить пустые `siteUrl`:

```ts
siteUrl: "/promo/pekarnya/",
```

```ts
siteUrl: "/promo/shkola-manikyura/",
```

```ts
siteUrl: "/promo/kofeynya/",
```

Ссылки в `Cases.astro` открываются в новой вкладке; относительный путь от корня работает.

### 3.7 Перенос promo в monorepo

**Зачем:** один репозиторий и один деплой на три promo-сайта. Копируем только исходники, без сборок и локальных секретов.

Копируем без `node_modules`, `dist`, `.git`, `.astro` и без локального мусора. У `manicure-site` отдельно исключаем `ansible/` и `.envrc`, у всех — `.aider*` и файлы агентов.

```bash
mkdir -p promos   # каталог для трёх promo

# -a: сохранить структуру и права
rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .git \
  --exclude .agents --exclude .opencode --exclude opencode.json \
  --exclude skills-lock.json --exclude '.aider*' \
  /home/max/projects/bakery-shop/ promos/pekarnya/

rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .git \
  --exclude .agents --exclude .opencode --exclude opencode.json \
  --exclude skills-lock.json --exclude '.aider*' \
  --exclude ansible --exclude .envrc \
  /home/max/projects/manicure-site/ promos/shkola-manikyura/

rsync -a \
  --exclude node_modules --exclude dist --exclude .astro --exclude .git \
  --exclude .agents --exclude .opencode --exclude opencode.json \
  --exclude skills-lock.json --exclude '.aider*' \
  /home/max/projects/coffee-shop/ promos/kofeynya/
```

**Ожидаемо:** в `promos/` три каталога с `src`, `public`, `package.json`, `astro.config.mjs`.

Проверить, что секреты не попали:

```bash
find promos -name '.env*' -o -name '*.pem' -o -name '*.key'
```

Ожидаемо: пусто.

### 3.8 Promo: `base`, `site`, noindex

**Зачем:** promo живут не в корне, а по адресам `/promo/<slug>/`. `base` заставляет Astro строить ссылки и ассеты с этим префиксом. `noindex` оставляет кейсы демонстрационными и не пускает их в поиск.

Каждый promo должен знать свой URL-префикс и канонический домен.

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

Интеграцию `@astrojs/sitemap` и `sitemap-index.xml` убрать: promo не индексируются. Удалить `src/pages/robots.txt.ts`, ссылку `<link rel="sitemap" ...>` и зависимость:

```bash
cd promos/pekarnya
npm uninstall @astrojs/sitemap
cd ../..
```

`promos/shkola-manikyura/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://style-logic.ru',
  base: '/promo/shkola-manikyura',
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

В каждом layout в `<head>` добавить:

```astro
<meta name="robots" content="noindex, follow" />
```

### 3.9 Promo: починить root-absolute ссылки и ассеты

**Зачем:** `base` не переписывает вручную прописанные `href="/..."` и `src="/..."`. Без правки они уведут на главный сайт или дадут 404. `withBase` добавляет `/promo/<slug>` к таким путям.

Найти все места:

```bash
grep -rnE '(href|src)="/' promos/pekarnya/src --include='*.astro' --include='*.ts'
grep -rnE '(href|src)="/' promos/shkola-manikyura/src --include='*.astro' --include='*.ts'
grep -rnE '(href|src)="/' promos/kofeynya/src --include='*.astro' --include='*.ts'
```

Заменить на `withBase(...)`, например:

```astro
<a href={withBase("/menu/")}>Меню</a>
<img src={withBase("/images/hero.webp")} alt="" />
```

Не забыть:

- `promos/pekarnya`: `src/scripts/order-page.ts` (внутри JS-строки), `Logo.astro`, `Header`, `Footer`, `Hero`, `CtaPanel`, `CartBar`, `PageStub`, `FeaturedBake`, `OrderForm`, `404`, `contacts`.
- `promos/shkola-manikyura`: `Header`, `Footer` (`/`, `/politika`, `/cookie`, `/politica-2`), `404`, иконки в layout.
- `promos/kofeynya`: все `/images/*.webp` в `Bakery`, `Menu`, `About`, `Atmosphere`, `Hero`, `Location`, `FeaturedCoffee`, `Footer`; `404`; favicon в `Layout`.

Манифест и canonical:

- `promos/pekarnya/public/site.webmanifest`: `start_url` и `icons[].src` заменить на `/promo/pekarnya/...`.
- `<link rel="manifest" href={withBase("/site.webmanifest")} />`.
- Canonical/OG должны указывать на `https://style-logic.ru/promo/<slug>/...`.
- `promos/shkola-manikyura/src/layouts/BaseLayout.astro`: дефолт `ogUrl = 'https://nailschool.ru'` заменить на вычисление от `Astro.site` и `Astro.url`; `ogImage` прогнать через `withBase`.
- `promos/kofeynya/src/layouts/Layout.astro`: добавить canonical и заменить `og:image` на абсолютный URL с base.

### 3.10 Сборка локально

**Зачем:** проверить, что main и все promo собираются до того, как что-то трогать на сервере.

`[локально]`

```bash
npm install        # зависимости главного сайта
npm run build      # сборка главного сайта

for dir in promos/*; do
  echo "=== $dir"
  (cd "$dir" && npm install && npm run build)   # сборка каждого promo
done
```

**Ожидаемо:** у main и у каждого promo появился `dist/`, ошибок в консоли нет.

Проверка main-сборки как отдельного релиза:

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

Почему нужен `node_modules`: `dist/server` импортирует пакеты Astro (`piccolore`, `cookie`, `zod` и другие) по имени, а не включает их в бандл. На сервере эти зависимости ставит `npm ci --omit=dev` (шаги 4.9 и 5.4). Локально можно переиспользовать уже установленный `node_modules` через симлинк.

Проверка promo-сборок:

```bash
ls promos/pekarnya/dist/index.html
ls promos/shkola-manikyura/dist/index.html
ls promos/kofeynya/dist/index.html
grep -o '<meta name="robots"[^>]*>' promos/*/dist/index.html
grep -o '/promo/[a-z-]*/_astro/[^"]*' promos/*/dist/index.html | head
```

**Ожидаемо:** все три `index.html` существуют, в каждом есть `noindex, follow`, ссылки на `_astro` начинаются с `/promo/<slug>/`.

### Итог этапа 3

Этап готов, если:

- [ ] `astro` обновлён, `@astrojs/vercel` и `vercel` удалены.
- [ ] `astro.config.mjs` использует `@astrojs/node` и `astro:env`.
- [ ] `send-lead.ts` не содержит `import.meta.env`.
- [ ] `promos/` содержит три проекта без `.git`, `node_modules`, `dist`.
- [ ] Секретов в `promos/` нет.
- [ ] Все три promo собираются с `base` и содержат `noindex, follow`.
- [ ] Smoke-тест main-сборки проходит, `dist` умеет работать с `node_modules` рядом.

---

## Этап 4. Файлы деплоя (локально)

**Зачем:** заранее положить в репозиторий все конфиги, чтобы сервер настраивался копированием файлов, а не ручными правками.

`[локально]` Создать структуру:

```bash
mkdir -p deploy/nginx deploy/systemd deploy/sudoers .github/workflows
```

### 4.1 `deploy/promos.json`

**Зачем:** один список, по которому CI собирает и раскладывает promo. Добавили новый promo — добавили строку сюда.

```json
{
  "pekarnya": "promos/pekarnya",
  "shkola-manikyura": "promos/shkola-manikyura",
  "kofeynya": "promos/kofeynya"
}
```

### 4.2 `deploy/nginx/style-logic-limits.conf`

**Зачем:** не дать одному IP заваливать форму заявками. `10r/m` — примерно 10 запросов в минуту, `zone=send_lead` — отдельная зона для этого маршрута.

Устанавливается в `/etc/nginx/conf.d/style-logic-limits.conf` (контекст `http`):

```nginx
limit_req_zone $binary_remote_addr zone=send_lead:10m rate=10r/m;  # считать запросы по IP
limit_req_status 429;                                              # отвечать 429, а не 503
```

### 4.3 `deploy/nginx/style-logic-headers.conf`

**Зачем:** базовые защитные заголовки для браузера. Одинаковые для main и promo.

Устанавливается в `/etc/nginx/snippets/style-logic-headers.conf`:

```nginx
add_header X-Content-Type-Options "nosniff" always;              # не угадывать MIME-тип
add_header X-Frame-Options "SAMEORIGIN" always;                  # запретить чужие iframe
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

### 4.4 `deploy/nginx/style-logic-app.conf`

**Зачем:** nginx принимает HTTPS и статику, а запросы к API передаёт Node-серверу на `127.0.0.1:4321`. Node наружу не смотрит.

Устанавливается в `/etc/nginx/snippets/style-logic-app.conf`:

```nginx
proxy_pass http://style_logic_app;                       # куда передавать запрос
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;                 # настоящий IP клиента
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;              # сообщить Node, что снаружи HTTPS
proxy_set_header Connection "";                          # keepalive до Node
proxy_connect_timeout 5s;
proxy_read_timeout 15s;                                  # Telegram может отвечать не сразу
```

### 4.5 `deploy/nginx/style-logic.conf`

**Зачем:** это главный конфиг nginx. Он делает HTTPS, редирект `www`, отдаёт статику main и promo и проксирует только API в Node.

Устанавливается в `/etc/nginx/sites-available/style-logic.conf`:

```nginx
upstream style_logic_app {
    server 127.0.0.1:4321;   # Node слушает только localhost
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name style-logic.ru www.style-logic.ru;

    return 301 https://style-logic.ru$request_uri;   # весь HTTP -> HTTPS apex
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.style-logic.ru;

    ssl_certificate /etc/letsencrypt/live/style-logic.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/style-logic.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://style-logic.ru$request_uri;   # www -> apex
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name style-logic.ru;

    ssl_certificate /etc/letsencrypt/live/style-logic.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/style-logic.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    server_tokens off;
    root /srv/site/current/dist/client;   # статика главного сайта
    index index.html;
    client_max_body_size 1m;

    include /etc/nginx/snippets/style-logic-headers.conf;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location = /api/send-lead {
        limit_req zone=send_lead burst=5 nodelay;   # защита формы от флуда
        include /etc/nginx/snippets/style-logic-app.conf;
    }

    location /api/ {
        include /etc/nginx/snippets/style-logic-app.conf;
    }

    location ^~ /promo/ {
        root /srv/www;                # /promo/<slug>/ -> /srv/www/promo/<slug>/
        index index.html;
        try_files $uri $uri/ =404;

        add_header X-Robots-Tag "noindex, follow" always;   # не индексировать promo
        include /etc/nginx/snippets/style-logic-headers.conf;
    }

    location ~* \.(?:css|js|mjs|woff2?|webp|avif|png|jpe?g|gif|svg|ico)$ {
        expires 30d;                  # кэш статики на 30 дней
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
}
```

Пояснения:

- `root /srv/www` в promo-локации даёт маппинг `/promo/<slug>/...` → `/srv/www/promo/<slug>/...` без `alias` и его ловушек.
- `^~` отключает regex-локацию для promo-ассетов, чтобы заголовки и `X-Robots-Tag` не терялись.
- `limit_req` стоит только на точном `/api/send-lead`.
- HSTS не включаем: `includeSubDomains` опасен для `autoconfig`/`autodiscover`, которые живут на SpaceWeb.

### 4.6 `deploy/systemd/style-logic.service`

**Зачем:** systemd держит Node-сервер запущенным, передаёт ему секреты и перезапускает при падении. Работает от `deploy`, а не от root.

Устанавливается в `/etc/systemd/system/style-logic.service`:

```ini
[Unit]
Description=style-logic.ru Astro standalone server
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
# симлинк на активный релиз
WorkingDirectory=/srv/site/current
# Telegram-секреты
EnvironmentFile=/etc/site/site.env
Environment=NODE_ENV=production
# наружу смотрит только nginx
Environment=HOST=127.0.0.1
Environment=PORT=4321
ExecStart=/usr/bin/node /srv/site/current/dist/server/entry.mjs
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
# файловая система только для чтения
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Сессии отключены в конфиге (`session: false`), поэтому сервер не пишет на диск и `ProtectSystem=strict` ему не мешает.

### 4.7 `deploy/sudoers/deploy-style-logic`

**Зачем:** CI-пользователь `deploy` должен уметь перезапустить свой сервис и проверить nginx, но не получать полный root. Здесь перечислены только эти команды.

Устанавливается в `/etc/sudoers.d/deploy-style-logic` с правами `0440 root:root`:

```sudoers
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart style-logic, /usr/bin/systemctl is-active style-logic, /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
```

Проверка синтаксиса:

```bash
visudo -cf /etc/sudoers.d/deploy-style-logic
```

### 4.8 `deploy/activate-release.sh`

**Зачем:** один сценарий переключения релиза. Сначала проверяет, что файлы на месте, потом атомарно меняет симлинк, перезапускает сервис и проверяет здоровье. Если что-то не так — падает с ошибкой и не оставляет сайт в полурабочем состоянии.

```bash
#!/usr/bin/env bash
set -euo pipefail   # остановиться на первой ошибке

REV="${1:?usage: activate-release.sh <revision>}"
MAIN_RELEASE="/srv/site/releases/${REV}"
PROMO_RELEASES="/srv/www/releases/promo"
PROMO_SLUGS=(pekarnya shkola-manikyura kofeynya)

# не переключаться на неполный релиз
test -f "${MAIN_RELEASE}/dist/server/entry.mjs"
test -f "${MAIN_RELEASE}/package.json"
test -d "${MAIN_RELEASE}/node_modules"

# атомарно переключить main и перезапустить Node
ln -sfn "${MAIN_RELEASE}" /srv/site/current
sudo /usr/bin/systemctl restart style-logic

# проверить и переключить каждый promo
for slug in "${PROMO_SLUGS[@]}"; do
  test -f "${PROMO_RELEASES}/${slug}/${REV}/index.html"
  ln -sfn "${PROMO_RELEASES}/${slug}/${REV}" "/srv/www/promo/${slug}"
done

# проверить nginx и применить
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx

# подождать, пока Node поднимется
for _ in 1 2 3 4 5; do
  if curl -fsS -o /dev/null http://127.0.0.1:4321/; then
    break
  fi
  sleep 2
done
curl -fsS -o /dev/null http://127.0.0.1:4321/

# оставить 5 последних релизов main и каждого promo
ls -1dt /srv/site/releases/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
for slug in "${PROMO_SLUGS[@]}"; do
  ls -1dt "${PROMO_RELEASES}/${slug}"/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
done
```

Скрипт хранится в репозитории и исполняется на сервере через `ssh ... 'bash -s' < deploy/activate-release.sh`.

### 4.9 `.github/workflows/deploy.yml`

**Зачем:** автоматизировать деплой. На каждый push в `main` GitHub собирает main и promo, проверяет Node-сервер и раскладывает релиз на VPS.

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
      DEPLOY_USER: ${{ secrets.DEPLOY_USER }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: |
            package-lock.json
            promos/*/package-lock.json

      - name: Install main dependencies
        run: npm ci

      - name: Build main site
        run: npm run build

      - name: Build promos
        run: |
          set -euo pipefail
          while IFS=' ' read -r slug dir; do
            echo "::group::${slug} (${dir})"
            (cd "$dir" && npm ci && npm run build)
            echo "::endgroup::"
          done < <(jq -r 'to_entries[] | "\(.key) \(.value)"' deploy/promos.json)

      - name: Smoke test standalone server
        run: |
          set -euo pipefail
          rm -rf /tmp/release-smoke
          mkdir -p /tmp/release-smoke
          cp -a dist /tmp/release-smoke/
          cp package.json /tmp/release-smoke/
          ln -s "$GITHUB_WORKSPACE/node_modules" /tmp/release-smoke/node_modules
          cd /tmp/release-smoke
          PORT=4399 HOST=127.0.0.1 node dist/server/entry.mjs &
          SERVER_PID=$!
          trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
          for _ in $(seq 1 20); do
            if curl -fsS -o /dev/null http://127.0.0.1:4399/; then
              exit 0
            fi
            sleep 1
          done
          echo "standalone smoke test failed" >&2
          exit 1

      - name: Configure SSH
        run: |
          set -euo pipefail
          install -d -m 700 ~/.ssh
          printf '%s\n' "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/known_hosts

      - name: Upload releases
        run: |
          set -euo pipefail
          REV="${GITHUB_SHA::7}"

          ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p /srv/site/releases/${REV}"
          rsync -az --delete dist/ "${DEPLOY_USER}@${DEPLOY_HOST}:/srv/site/releases/${REV}/dist/"
          rsync -az package.json package-lock.json "${DEPLOY_USER}@${DEPLOY_HOST}:/srv/site/releases/${REV}/"

          while IFS=' ' read -r slug dir; do
            ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p /srv/www/releases/promo/${slug}/${REV}"
            rsync -az --delete "${dir}/dist/" "${DEPLOY_USER}@${DEPLOY_HOST}:/srv/www/releases/promo/${slug}/${REV}/"
          done < <(jq -r 'to_entries[] | "\(.key) \(.value)"' deploy/promos.json)

      - name: Install runtime dependencies
        run: |
          ssh "${DEPLOY_USER}@${DEPLOY_HOST}" \
            "cd /srv/site/releases/${GITHUB_SHA::7} && npm ci --omit=dev --no-audit --no-fund"

      - name: Activate release
        run: |
          ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s -- ${GITHUB_SHA::7}" \
            < deploy/activate-release.sh
```

Замечания:

- Деплой идёт только с `main`.
- `concurrency` не отменяет уже начатый деплой.
- Секреты Telegram в CI не нужны и не передаются.
- Старые релизы чистит скрипт активации (оставляет 5).

### Итог этапа 4

Этап готов, если:

- [ ] Созданы `deploy/promos.json`, четыре nginx-файла, unit, sudoers, скрипт активации.
- [ ] Создан `.github/workflows/deploy.yml`.
- [ ] `nginx -t` на сервере ещё не запускался: это будет на этапе 5.
- [ ] `deploy/activate-release.sh` не содержит секретов.

---

## Этап 5. Первый ручной деплой

**Зачем:** проверить всю схему без GitHub Actions. Если что-то сломается, понятно, на каком шаге. После успешного ручного деплоя автоматизация будет повторять те же действия.

### 5.1 Каталоги и права на VPS

**Зачем:** создать места для релизов и отдать их пользователю `deploy`, чтобы CI мог писать туда без root.

`[VPS]`

```bash
mkdir -p /srv/site/releases /srv/www/releases/promo /srv/www/promo /etc/site
chown -R deploy:deploy /srv/site /srv/www   # deploy владеет релизами
chmod 755 /srv/site /srv/www                # nginx сможет читать
```

### 5.2 Секреты

**Зачем:** Node-серверу нужны Telegram-токены. Они копируются из локального `.env` сразу в защищённый файл на сервере.

**Стоп-точка:** не выводить содержимое `.env` в терминал и не коммитить его.

`[локально]` из каталога репозитория:

```bash
grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' .env \
  | tr -d '\r' \
  | ssh root@62.173.152.100 'umask 077; mkdir -p /etc/site; cat > /etc/site/site.env'
```

`[VPS]` проверка (значения не печатать):

```bash
stat -c '%a %U:%G %n' /etc/site/site.env
grep -c '^TELEGRAM_' /etc/site/site.env
```

**Ожидаемо:** `600 root:root`, две строки.

### 5.3 systemd и sudoers

**Зачем:** установить unit, чтобы сервис поднимался после ребута, и узкие sudo-права для деплоя.

`[локально]`

```bash
scp deploy/systemd/style-logic.service root@62.173.152.100:/etc/systemd/system/style-logic.service
scp deploy/sudoers/deploy-style-logic root@62.173.152.100:/etc/sudoers.d/deploy-style-logic
```

`[VPS]`

```bash
chmod 440 /etc/sudoers.d/deploy-style-logic
visudo -cf /etc/sudoers.d/deploy-style-logic   # проверить синтаксис sudoers
systemctl daemon-reload
systemctl enable style-logic
```

### 5.4 Загрузить первый релиз

**Зачем:** положить собранные файлы в отдельный каталог релиза и переключить симлинки. Старый релиз при этом не трогается.

`[локально]` собрать (если ещё не собрано) и загрузить:

```bash
cd /home/max/projects/site-dev
npm run build                                      # main
for dir in promos/*; do (cd "$dir" && npm run build); done   # promo

REV=$(git rev-parse --short=7 HEAD)                # короткий SHA для имени релиза

# создать каталоги под новый релиз
ssh root@62.173.152.100 "mkdir -p /srv/site/releases/$REV /srv/www/releases/promo/pekarnya/$REV /srv/www/releases/promo/shkola-manikyura/$REV /srv/www/releases/promo/kofeynya/$REV"

# загрузить main и promo
rsync -az --delete dist/ root@62.173.152.100:/srv/site/releases/$REV/dist/
rsync -az package.json package-lock.json root@62.173.152.100:/srv/site/releases/$REV/
rsync -az --delete promos/pekarnya/dist/ root@62.173.152.100:/srv/www/releases/promo/pekarnya/$REV/
rsync -az --delete promos/shkola-manikyura/dist/ root@62.173.152.100:/srv/www/releases/promo/shkola-manikyura/$REV/
rsync -az --delete promos/kofeynya/dist/ root@62.173.152.100:/srv/www/releases/promo/kofeynya/$REV/

# поставить production-зависимости рядом с dist
ssh root@62.173.152.100 "cd /srv/site/releases/$REV && npm ci --omit=dev --no-audit --no-fund"
```

**Зачем `npm ci`:** `dist/server` импортирует пакеты из `node_modules`. Без них сервер упадёт с `ERR_MODULE_NOT_FOUND`. `--omit=dev` не ставит инструменты сборки.

`[VPS]` включить симлинки и права:

```bash
chown -R deploy:deploy /srv/site /srv/www

ln -sfn /srv/site/releases/<REV> /srv/site/current
ln -sfn /srv/www/releases/promo/pekarnya/<REV> /srv/www/promo/pekarnya
ln -sfn /srv/www/releases/promo/shkola-manikyura/<REV> /srv/www/promo/shkola-manikyura
ln -sfn /srv/www/releases/promo/kofeynya/<REV> /srv/www/promo/kofeynya
```

Подставить фактический `<REV>` из команды выше.

### 5.5 Запуск и локальная проверка сервиса

**Зачем:** убедиться, что Node-сервер запускается и отвечает, до того как на него переключится nginx.

`[VPS]`

```bash
systemctl restart style-logic
systemctl status style-logic --no-pager
journalctl -u style-logic -n 50 --no-pager

curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4321/
```

**Ожидаемо:** `active (running)`, HTTP 200.

**Стоп-точка:** если сервис не запустился, смотреть `journalctl` и не переключать nginx.

### 5.6 Боевой nginx

**Зачем:** заменить заглушку на конфиг с проксированием API, promo и редиректами.

`[локально]`

```bash
scp deploy/nginx/style-logic.conf root@62.173.152.100:/etc/nginx/sites-available/style-logic.conf
scp deploy/nginx/style-logic-limits.conf root@62.173.152.100:/etc/nginx/conf.d/style-logic-limits.conf
scp deploy/nginx/style-logic-app.conf root@62.173.152.100:/etc/nginx/snippets/style-logic-app.conf
scp deploy/nginx/style-logic-headers.conf root@62.173.152.100:/etc/nginx/snippets/style-logic-headers.conf
```

`[VPS]`

```bash
ln -sfn /etc/nginx/sites-available/style-logic.conf /etc/nginx/sites-enabled/style-logic.conf
nginx -t              # проверить конфиг
systemctl reload nginx
```

**Стоп-точка:** если `nginx -t` вернул ошибку, не делать `reload` и не закрывать сессию. Исправить конфиг или вернуть предыдущий.

Проверка:

```bash
curl -I http://style-logic.ru
curl -I https://style-logic.ru
curl -I https://www.style-logic.ru
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/promo/pekarnya/
```

**Ожидаемо:** HTTP → 301 на HTTPS, `www` → 301 на apex, promo → 200.

Заглушку можно убрать:

```bash
rm -rf /var/www/style-logic-placeholder
```

### Итог этапа 5

Этап готов, если:

- [ ] Релиз лежит в `/srv/site/releases/<REV>`, симлинк `current` указывает на него.
- [ ] Все три promo-симлинка указывают на тот же `<REV>`.
- [ ] `style-logic` активен, `curl 127.0.0.1:4321` отдаёт 200.
- [ ] `https://style-logic.ru` и promo открываются.
- [ ] `http` и `www` редиректят на `https://style-logic.ru`.
- [ ] `/etc/site/site.env` имеет права `600`.

---

## Этап 6. GitHub Actions

**Зачем:** после push в `main` сайт должен обновляться сам. GitHub Actions собирает проект и заходит на VPS по отдельному SSH-ключу, без пароля и без root.

### 6.1 Ключ деплоя

**Зачем:** CI нужен собственный ключ, чтобы не использовать ваш личный. Ключ добавляется только пользователю `deploy`.

`[локально]`

```bash
ssh-keygen -t ed25519 -C "github-actions@style-logic" \
  -f ~/.ssh/style-logic-deploy -N ""   # ключ без пароля: его использует CI

# публичную часть добавить deploy на сервер
cat ~/.ssh/style-logic-deploy.pub \
  | ssh root@62.173.152.100 'install -d -m 700 -o deploy -g deploy /home/deploy/.ssh && tee -a /home/deploy/.ssh/authorized_keys >/dev/null && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys'
```

**Стоп-точка:** проверить вход новым ключом до настройки GitHub. Если вход не работает, Actions тоже не сможет задеплоить.

Проверка входа под deploy с новым ключом:

```bash
ssh -i ~/.ssh/style-logic-deploy deploy@62.173.152.100 'id'
```

### 6.2 known_hosts

**Зачем:** CI должен заранее знать отпечаток SSH-сервера, иначе он либо спросит подтверждение, либо станет уязвим к подмене.

`[локально]`

```bash
ssh-keyscan -H 62.173.152.100 > ~/.ssh/known_hosts.style-logic   # получить ключ сервера
ssh-keygen -lf ~/.ssh/known_hosts.style-logic                    # показать отпечаток
```

Сверить отпечаток с сервером `[VPS]`:

```bash
ssh root@62.173.152.100 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
```

**Стоп-точка:** отпечатки должны совпасть. Если нет, остановиться и разобраться.

### 6.3 Secrets в GitHub

**Зачем:** ключ и адрес сервера хранятся в GitHub Secrets, а не в коде.

`[локально]`

```bash
gh secret set DEPLOY_HOST --repo MaximRock/site-dev --body "62.173.152.100"
gh secret set DEPLOY_USER --repo MaximRock/site-dev --body "deploy"
gh secret set DEPLOY_SSH_KEY --repo MaximRock/site-dev < ~/.ssh/style-logic-deploy
gh secret set SSH_KNOWN_HOSTS --repo MaximRock/site-dev < ~/.ssh/known_hosts.style-logic

gh secret list --repo MaximRock/site-dev
```

**Ожидаемо:** четыре секрета.

### 6.4 Первый прогон

**Зачем:** проверить весь путь CI → сервер → переключение релиза.

Закоммитить и запушить изменения (только после ревью плана и проверки `git diff`):

```bash
git add -A
git status
git commit -m "Add VPS deployment setup"
git push github main
```

Затем:

```bash
gh run list --repo MaximRock/site-dev --limit 5
gh run watch --repo MaximRock/site-dev
```

Или вручную: Actions → `deploy` → Run workflow.

Проверить, что после прогона на сервере появился новый релиз и симлинк переключился:

```bash
ls -1dt /srv/site/releases/*
readlink -f /srv/site/current
readlink -f /srv/www/promo/pekarnya
```

### Итог этапа 6

Этап готов, если:

- [ ] `ssh -i ~/.ssh/style-logic-deploy deploy@...` работает.
- [ ] Отпечаток known_hosts совпал.
- [ ] В GitHub четыре секрета.
- [ ] Workflow `deploy` завершился успешно.
- [ ] После прогона `current` и promo-симлинки указывают на новый `<REV>`.

---

## Этап 7. Приёмка

**Зачем:** проверить не только «главная открылась», но и редиректы, promo, форму, лимиты и поведение после ребута. Если что-то не так — сразу в «Приложение A».

### 7.1 Домен и HTTPS

`[локально]`

```bash
curl -sS -o /dev/null -w 'http apex: %{http_code} -> %{redirect_url}\n' http://style-logic.ru/
curl -sS -o /dev/null -w 'https www: %{http_code} -> %{redirect_url}\n' https://www.style-logic.ru/
curl -sS -o /dev/null -w 'https apex: %{http_code}\n' https://style-logic.ru/
```

**Ожидаемо:** 301, 301, 200.

### 7.2 Promo

`[локально]`

```bash
for slug in pekarnya shkola-manikyura kofeynya; do
  echo "=== $slug"
  curl -sS -o /dev/null -w '%{http_code}\n' "https://style-logic.ru/promo/$slug/"
  curl -sSI "https://style-logic.ru/promo/$slug/" | grep -i '^x-robots-tag:'
  curl -sS "https://style-logic.ru/promo/$slug/" | grep -o '<meta name="robots"[^>]*>'
done
```

**Ожидаемо:** 200, `x-robots-tag: noindex, follow`, meta `noindex, follow`.

Проверить, что ассеты не 404:

```bash
curl -sS "https://style-logic.ru/promo/kofeynya/" | grep -o '/promo/kofeynya/images/[^"]*' | sort -u | head
```

Затем открыть страницы в браузере и проверить картинки, шрифты, меню, формы.

### 7.3 API и Telegram

**Зачем:** проверить, что форма реально доходит до Telegram через Node и секреты подхватились.

`[локально]` безопасный тест (реальное сообщение в Telegram):

```bash
curl -sS -X POST https://style-logic.ru/api/send-lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Проверка деплоя","contact":"@deploy-test","consent":true}'
```

**Ожидаемо:** `{"ok":true}` и сообщение в Telegram.

`[VPS]` проверить, что секреты не попали в логи:

```bash
journalctl -u style-logic -n 100 --no-pager
```

### 7.4 Rate limit

**Зачем:** убедиться, что защита формы работает. Пустые запросы не доходят до Telegram (API вернёт 400), но nginx их считает.

`[локально]`

```bash
for i in $(seq 1 15); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -X POST https://style-logic.ru/api/send-lead \
    -H 'Content-Type: application/json' \
    -d '{}'
done
```

**Ожидаемо:** часть ответов `400`, затем `429`. Это нормально; лимит снимется сам.

### 7.5 Сервис после ребута

**Зачем:** проверить, что сервисы включены в автозапуск, а не просто запущены вручную.

`[VPS]`

```bash
reboot
```

После переподключения `[локально или VPS]`:

```bash
systemctl is-active style-logic nginx fail2ban
ufw status
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/
```

**Ожидаемо:** всё `active`, HTTPS 200.

### 7.6 Сертификаты

**Зачем:** убедиться, что Let's Encrypt будет продлевать сертификат автоматически.

`[VPS]`

```bash
certbot renew --dry-run
systemctl list-timers | grep certbot
```

**Ожидаемо:** dry-run завершён успешно, таймер certbot активен.

---

## Этап 8. Обслуживание

**Зачем:** сервер должен сам ставить обновления безопасности, не забивать диск логами и иметь понятный план восстановления.

### 8.1 Автообновления безопасности

**Зачем:** Ubuntu будет сама ставить security-обновления. Это не заменяет ручные проверки, но закрывает основные дыры.

`[VPS]`

```bash
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable --now unattended-upgrades
systemctl status unattended-upgrades --no-pager
```

### 8.2 Ограничить journal

**Зачем:** journald не должен разрастаться и занимать весь диск. 200 MB достаточно для диагностики.

`[VPS]`

```bash
mkdir -p /etc/systemd/journald.conf.d

cat > /etc/systemd/journald.conf.d/99-size.conf <<'EOF'
[Journal]
SystemMaxUse=200M
EOF

systemctl restart systemd-journald
journalctl --disk-usage
```

### 8.3 Регулярные проверки

**Зачем:** раз в месяц быстро посмотреть, что сервер здоров.

`[VPS]`

```bash
df -h /                              # место на диске
free -h                              # память и swap
systemctl --failed                   # упавшие сервисы
journalctl -p err -n 50 --no-pager   # последние ошибки
fail2ban-client status sshd          # блокировки SSH
```

### 8.4 Бэкапы

- Снапшот VPS в панели провайдера: перед крупными изменениями и раз в месяц.
- Секреты: `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` хранить в менеджере паролей. `/etc/site/site.env` — не единственная копия.
- Код и конфиги деплоя восстанавливаются из GitHub.
- Сертификаты Let's Encrypt восстановимы через `certbot`; отдельный бэкап не нужен.

---

## Этап 9. Чек-лист и откат

### 9.1 Финальный чек-лист

- [ ] DNS `@` и `www` указывают на `62.173.152.100`.
- [ ] MX/SPF/autoconfig не изменены, почта работает.
- [ ] `http://style-logic.ru` → 301 `https://style-logic.ru`.
- [ ] `https://www.style-logic.ru` → 301 `https://style-logic.ru`.
- [ ] `https://style-logic.ru` → 200, главная и `/privacy/` открываются.
- [ ] `/api/send-lead` возвращает `{"ok":true}` и сообщение приходит в Telegram.
- [ ] Rate limit на `/api/send-lead` даёт 429 при флуде.
- [ ] `/promo/pekarnya/` → 200, стили и картинки на месте, `noindex, follow`.
- [ ] `/promo/shkola-manikyura/` → 200, стили и картинки на месте, `noindex, follow`.
- [ ] `/promo/kofeynya/` → 200, стили и картинки на месте, `noindex, follow`.
- [ ] `www` и promo не индексируются (проверить `curl` заголовки и meta).
- [ ] Секретов нет в git, в CI-логах и в ответах API.
- [ ] `style-logic`, `nginx`, `fail2ban` поднимаются после ребута.
- [ ] `certbot renew --dry-run` проходит.
- [ ] GitHub Actions деплоит с `main` и оставляет 5 последних релизов.
- [ ] Rollback проверен на тестовом релизе (см. 9.2).

### 9.2 Откат main

```bash
ls -1dt /srv/site/releases/*
ln -sfn /srv/site/releases/<PREVIOUS_REV> /srv/site/current
sudo systemctl restart style-logic
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4321/
```

Откат promo:

```bash
ln -sfn /srv/www/releases/promo/pekarnya/<PREVIOUS_REV> /srv/www/promo/pekarnya
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx
```

### 9.3 Откат конфигов

- nginx: держать копию предыдущего `style-logic.conf` рядом (`style-logic.conf.bak.<date>`), после правок всегда `nginx -t`.
- systemd: `systemctl daemon-reload` после изменения unit.
- SSH: не закрывать текущую сессию, пока новый вход не проверен. Резервная копия `sshd_config` уже создана на этапе 1.5.
- Полный откат сервера: снапшот `pre-bootstrap` из панели провайдера.

### 9.4 Что сделать после первого успешного деплоя

- Проверить сайт с телефона (мобильная вёрстка, форма).
- Проверить promo-страницы на телефоне и в другом браузере.
- Убедиться, что ссылки из кейсов на главной ведут на `/promo/...`.
- Добавить домен в Яндекс.Вебмастер и Google Search Console (main site, не promo).
- Проверить, что sitemap/robots main-сайта не ссылаются на promo.

---

## Приложение A. Если что-то пошло не так

Сначала посмотреть логи `[VPS]`:

```bash
journalctl -u style-logic -n 100 --no-pager   # ошибки Node-сервера
tail -n 100 /var/log/nginx/error.log          # ошибки nginx
tail -n 100 /var/log/nginx/access.log         # запросы и коды ответов
fail2ban-client status sshd                   # блокировки SSH
```

### A.1 Потерян SSH-доступ

Симптом: `Connection refused` или `Permission denied (publickey)`.

1. Открыть консоль VPS в панели провайдера (не зависит от SSH).
2. Проверить эффективный конфиг:

```bash
sshd -T | grep -E '^(passwordauthentication|permitrootlogin|pubkeyauthentication) '
```

3. Если конфиг сломан, временно убрать override и вернуть доступ:

```bash
rm -f /etc/ssh/sshd_config.d/00-style-logic.conf
sshd -t
systemctl restart ssh
```

4. Проверить UFW: `ufw status`; при необходимости `ufw allow OpenSSH`.
5. Проверить ключ: `cat /home/deploy/.ssh/authorized_keys` (только наличие, не копировать в чат).
6. Права: `chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys`.
7. Не закрывать текущую сессию, пока новый вход не проверен.

### A.2 nginx не принимает конфиг

Симптом: `nginx: [emerg] ...` или `nginx -t` падает.

1. Не делать `systemctl reload nginx`.
2. `nginx -t` покажет файл и строку.
3. Частые причины: нет файла сертификата, опечатка в `server_name`, пропущена `;`, конфликт `limit_req_zone`.
4. Вернуть предыдущий конфиг:

```bash
cp /etc/nginx/sites-available/style-logic.conf.bak.<date> /etc/nginx/sites-available/style-logic.conf
nginx -t && systemctl reload nginx
```

### A.3 502 Bad Gateway на API

Симптом: сайт открывается, но `/api/send-lead` отдаёт 502.

1. `systemctl status style-logic --no-pager`.
2. `journalctl -u style-logic -n 100 --no-pager`.
3. `curl -v http://127.0.0.1:4321/`.
4. Проверить файл секретов: `stat -c '%a %U:%G %n' /etc/site/site.env` (должно быть `600 root:root`).
5. Если в логе `ERR_MODULE_NOT_FOUND`, в релизе нет `node_modules`:

```bash
cd /srv/site/current
npm ci --omit=dev --no-audit --no-fund
systemctl restart style-logic
```

6. Перезапустить: `systemctl restart style-logic`.

### A.4 Promo отдаёт 404

1. `readlink -f /srv/www/promo/pekarnya` — симлинк должен указывать на существующий релиз.
2. `ls -l /srv/www/releases/promo/pekarnya/<REV>/index.html`.
3. `nginx -T | grep -A8 'location \^~ /promo/'`.
4. Проверить, что workflow положил именно этот slug из `deploy/promos.json`.

### A.5 Promo без стилей или картинок

Симптом: страница открылась, но выглядит «голой», в консоли 404 на `_astro` или `/images`.

1. Посмотреть пути в HTML:

```bash
curl -sS https://style-logic.ru/promo/kofeynya/ | grep -o '/[^"]*images[^"]*' | head
```

2. Если пути без `/promo/kofeynya`, значит не все `href`/`src` обёрнуты в `withBase`.
3. Пересобрать promo, закоммитить и повторить деплой.
4. Проверить, что `base` в `astro.config.mjs` совпадает со slug.

### A.6 certbot не выдал сертификат

Симптом: `Failed authorization procedure` или `Timeout during connect`.

1. `dig +short style-logic.ru @1.1.1.1` — должен быть IP VPS.
2. `ss -tulpn | grep ':80'` — nginx слушает 80.
3. `ufw status` — 80 и 443 открыты.
4. `curl -I http://style-logic.ru/` — nginx отвечает.
5. Если было много неудачных попыток, подождать: у Let's Encrypt есть лимиты.

### A.7 Форма отвечает `{"ok":false}`

1. `grep -c '^TELEGRAM_' /etc/site/site.env` — должно быть 2.
2. `systemctl restart style-logic`.
3. `journalctl -u style-logic -n 100 --no-pager` — искать `telegram rejected` или `invalid TELEGRAM_CHAT_ID`.
4. Проверить, что бот добавлен в чат, а `TELEGRAM_CHAT_ID` — числовой id.
5. Не печатать токен в терминал и не коммитить `.env`.

### A.8 Форма отдаёт 429

1. Это rate limit: 10 запросов в минуту с одного IP, burst 5.
2. Подождать минуту.
3. Не отключать лимит без причины. Если нужно изменить, править `rate`/`burst` в `deploy/nginx/style-logic-limits.conf` и `style-logic.conf`, затем `nginx -t && systemctl reload nginx`.

### A.9 GitHub Actions падает на `npm ci`

1. Локально выполнить `npm install` в нужном каталоге (main или promo).
2. Закоммитить обновлённый `package-lock.json`.
3. Повторить прогон.

### A.10 После ребута сайт не открылся

1. `systemctl is-enabled style-logic nginx fail2ban`.
2. `systemctl is-active style-logic nginx fail2ban`.
3. `journalctl -u style-logic -b -n 100 --no-pager`.
4. `nginx -t`.
5. `readlink -f /srv/site/current` — симлинк должен существовать.

### A.11 Кончилось место на диске

1. `df -h /`.
2. `du -sh /srv/site/releases/* | sort -h`.
3. `du -sh /srv/www/releases/promo/*/* | sort -h`.
4. Удалить старые релизы, оставить 5.
5. `journalctl --vacuum-size=200M`.
6. `apt clean`.

---

## Приложение B. Быстрые команды

```bash
# статус и логи приложения
systemctl status style-logic --no-pager
journalctl -u style-logic -f

# проверка и перезагрузка nginx
nginx -t
systemctl reload nginx

# куда смотрит текущий релиз
readlink -f /srv/site/current
readlink -f /srv/www/promo/pekarnya

# проверить сайт с сервера
curl -I https://style-logic.ru/
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/promo/pekarnya/

# проверить сертификат
certbot renew --dry-run

# проверить firewall и SSH-защиту
ufw status verbose
fail2ban-client status sshd
```
