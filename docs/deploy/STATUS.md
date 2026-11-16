# Статус деплоя style-logic.ru

Обновляется после каждого подэтапа. Этап считается готовым только после прохождения гейта.

## Легенда

- `[ ]` — не начато.
- `[~]` — выполняется.
- `[x]` — готово, проверка пройдена.
- `[!]` — остановлено, нужен разбор.
- `[-]` — отменено или не требуется.

## Этапы

| Этап | Статус | Дата | Исполнитель | Заметки |
| --- | --- | --- | --- | --- |
| 0. Инвентарь | [x] | 2026-11-13 | opencode | read-only, сервер не изменялся |
| 1. Bootstrap | [x] | 2026-11-14 | opencode | завершён; reboot выполнен; снапшот пропущен по решению заказчика |
| 2. Заглушка и TLS | [x] | 2026-11-14 | opencode | сертификат до 2027-02-12; www HTTPS пока 200, редирект на этапе 5 |
| 3. Миграция репо | [x] | 2026-11-14 | opencode | 3.0 закрыт коммитами `f756cf6` и `3e03381`; 3.1–3.10 готовы, сборки и smoke пройдены |
| 4. Артефакты деплоя | [x] | 2026-11-14 | opencode | артефакты созданы и проверены локально; сервер не изменялся, `nginx -t` на сервере не запускался |
| 5. Первый деплой | [x] | 2026-11-14 | opencode | REV `3e03381-manual-20261114-201438`; сервис active, сайт и promo открываются, `nginx -t` на сервере успешен |
| 6. GitHub Actions | [x] | 2026-11-15 | opencode | workflow run `43729148642` успешен; REV `fb5c6ac-1`, симлинки переключены |
| 7. Приёмка | [x] | 2026-11-15 | opencode | пройдена; API ok, rate limit 429, reboot/certbot ок; mobile overflow исправлен в `5675765-1` |
| 8. Обслуживание | [x] | 2026-11-15 | opencode | 8.1–8.3, 8.5–8.6 готовы; 8.4 пропущен по решению заказчика, обсудить после общего плана |
| 9. Откат | [x] | 2026-11-16 | opencode | 9.1–9.3, 9.5 пройдены; 9.4 отложен вместе с 8.4 |

## Этап 1. Bootstrap

- [-] 1.1 Снапшот `pre-bootstrap`: пропущен по решению заказчика, fallback — переустановка сервера.
- [x] 1.2 Инвентарь записан.
- [x] 1.3 Обновления и пакеты.
- [x] 1.4 Swap проверен.
- [x] 1.5 Пользователь `deploy` и вход по ключу.
- [x] 1.6 SSH ужесточён, вход проверен из второй сессии.
- [x] 1.7 UFW включён.
- [x] 1.8 fail2ban активен.
- [x] 1.9 Node.js 22 установлен.
- [x] 1.10 Финальная проверка пройдена; reboot выполнен, сервисы проверены.

## Этап 2. Заглушка и TLS

- [x] 2.1 DNS A/AAAA проверены.
- [x] 2.2 Заглушка nginx отвечает по HTTP.
- [x] 2.3 Сертификат Let's Encrypt получен.
- [x] 2.4 `certbot renew --dry-run --no-random-sleep-on-renew` проходит.

## Этап 3. Миграция репозитория

- [x] 3.0 Extraneous-адаптер удалён; посторонние изменения разведены коммитами `f756cf6` и `3e03381`, рабочее дерево чистое.
- [x] 3.1 Astro 7.4.11 и `@astrojs/node` 11.1.12 установлены точно, Vercel удалён.
- [x] 3.2 `astro.config.mjs` обновлён: Node standalone, `site`, `session: false`, `astro:env`.
- [x] 3.3 `package.json` и runtime-зависимости; добавлен `start`.
- [x] 3.4 `send-lead.ts` переведён на `astro:env/server`.
- [x] 3.5 Canonical и OG главного сайта.
- [x] 3.6 `siteUrl` в `src/data/site.ts`.
- [x] 3.7 Promo перенесены в `promos/` без `.git`/`node_modules`/`dist`.
- [x] 3.8 Promo: `base`, `site`, noindex.
- [x] 3.9 Promo: ссылки и ассеты через `withBase`, sitemap/robots Pekarnya убраны, manifest обновлён.
- [x] 3.10 Сборки main и трёх promo, smoke-тест: `smoke ok`, `GET /` 200; `astro check` Pekarnya и Manicure — 0 ошибок; `vitest` Pekarnya — 42 теста.

## Этап 4. Артефакты деплоя

- [x] 4.1 `deploy/promos.json`.
- [x] 4.2 nginx limits: 20r/m, burst 5, JSON 429; на этапе 5 добавлен `server_names_hash_bucket_size 64`.
- [x] 4.3 nginx headers.
- [x] 4.4 nginx app proxy.
- [x] 4.5 nginx site config: `^~ /api/`, promo-кэш 30d, отдельные promo-локации с корректным 404, HSTS выключен.
- [x] 4.6 systemd unit.
- [x] 4.7 sudoers; `visudo -cf` — parsed OK.
- [x] 4.8 `activate-release.sh`: атомарные симлинки, rollback, health-check, retention 5; проверен в песочнице.
- [x] 4.9 GitHub Actions workflow: main-only, staging `npm prune --omit=dev`, rsync, без секретов и npm на сервере.
- [x] 4.10 Валидация: `bash -n`, `shellcheck`, `actionlint`, локальный `nginx -t` на временной копии и функциональный тест nginx.

## Этап 5. Первый деплой

- [x] 5.1 Каталоги и права на VPS.
- [x] 5.2 Секреты в `/etc/site/site.env`: 600 root:root, 2 ключа.
- [x] 5.3 systemd и sudoers установлены; `visudo -cf` — parsed OK, unit enabled.
- [x] 5.4 Первый релиз загружен; `npm ci --omit=dev` в staging, не на сервере.
- [x] 5.5 Симлинки, запуск, health-check: active, `/` 200, API `{}` 400.
- [x] 5.6 Боевой nginx и проверка: HTTP/www 301, apex 200, promo 200; заглушка удалена.

## Этап 6. GitHub Actions

- [x] 6.1 Deploy-ключ создан и добавлен.
- [x] 6.2 `known_hosts` и отпечаток проверены.
- [x] 6.3 Секреты GitHub настроены.
- [x] 6.4 Первый прогон workflow успешен.
- [x] 6.5 Релиз и симлинки проверены.

## Этап 7. Приёмка

- [x] 7.1 Домен и HTTPS.
- [x] 7.2 Promo: 200, noindex, ассеты.
- [x] 7.3 API и Telegram.
- [x] 7.4 Rate limit и JSON 429.
- [x] 7.5 Сервисы после reboot.
- [x] 7.6 Сертификаты и продление.
- [x] 7.7 SEO и мобильная проверка.
- [x] 7.8 Результаты записаны.

## Этап 8. Обслуживание

- [x] 8.1 Автообновления безопасности: `unattended-upgrades` active/enabled, 0 upgradable.
- [x] 8.2 Ограничение journald: `SystemMaxUse=200M`, journal 79.7M.
- [x] 8.3 Регулярные проверки: диск 15%, swap 0, failed 0, fail2ban без текущих банов, certbot dry-run success.
- [-] 8.4 Бэкапы: GitHub и сертификат готовы; снапшот Planetahost и копия секретов в менеджере паролей пропущены по решению заказчика. Обсудить после общего плана.
- [x] 8.5 Retention релизов и диск: main 4, promo по 4, лимит 5; песочница 5 из 6; диск 13%.
- [x] 8.6 Мониторинг и алерты: серверный timer каждые 5 минут, внешний GitHub Actions каждые 15 минут, Telegram-алерт на сервере.

## Этап 9. Откат

- [x] 9.1 Откат main: `180f2b7-1` → `5675765-1` → `180f2b7-1`, 320мс.
- [x] 9.2 Откат promo: все три promo `180f2b7-1` → `5675765-1` → `180f2b7-1`, 224мс.
- [x] 9.3 Откат конфигов: nginx 424мс, systemd unit 1573мс, sudoers/sshd проверены.
- [-] 9.4 Полный откат из снапшота: отложен вместе с 8.4, не проверялся.
- [x] 9.5 Учебный откат выполнен: полный цикл 1353мс, без длительного простоя.

## Журнал выполнения

| Дата | Этап | Команда или действие | Результат | Отклонения |
| --- | --- | --- | --- | --- |
| 2026-11-13 | 0 | `hostnamectl`, `free -h`, `df -h /`, `swapon --show`, `ss -tulpn`, `ufw status`, версии | сервер чистый, только SSH 22 | нет |
| 2026-11-13 | 0 | `getaddrinfo` для домена | A -> 62.173.152.100, AAAA нет | нет |
| 2026-11-13 | 0 | Созданы `docs/deploy/00-09` и `STATUS.md` | план готов, сервер не изменялся | нет |
| 2026-11-14 | 1.2 | Повторный read-only инвентарь | Ubuntu 24.04.4, 3.8G/40G, swap 512M, только SSH 22, pending reboot | снапшот недоступен, пропущен по решению заказчика |
| 2026-11-14 | 1.3 | `apt update`, `full-upgrade`, установка nginx/certbot/fail2ban/ufw/git/rsync | APT_RC=0, 0 пакетов к обновлению | needrestart отложил часть рестартов до reboot |
| 2026-11-14 | 1.4 | Проверка swap | `/swapfile` 512M, fstab в порядке | нет |
| 2026-11-14 | 1.5 | Создан `deploy`, скопирован `authorized_keys` | вход `deploy` по ключу работает | нет |
| 2026-11-14 | 1.6 | SSH override `00-style-logic.conf`, `sshd -t`, reload | `passwordauthentication no`, root/deploy входят | нет |
| 2026-11-14 | 1.7 | UFW: deny incoming, allow 22/80/443 | UFW active, SSH не потерян | 443 открыт в UFW, listener появится на этапе 2 |
| 2026-11-14 | 1.8 | fail2ban `jail.local`, sshd jail | active, 2 IP уже забанены | journal содержит старые неудачные попытки |
| 2026-11-14 | 1.9 | NodeSource Node.js 22 | v22.23.5, npm 10.9.9 | нет |
| 2026-11-14 | 1.10 | Финальная проверка | сервисы active, 0 failed, 0 upgrades, диск 13% | требуется reboot |
| 2026-11-14 | 1.10 | Reboot и проверка после старта | SSH поднялся через 9с; nginx/fail2ban active; UFW active; 0 failed; reboot-required снят | 443 открыт в UFW, listener появится на этапе 2 |
| 2026-11-14 | 2.1 | DNS apex/www | A -> 62.173.152.100, AAAA нет | резолвер 1.1.1.1 с сервера недоступен, использован системный |
| 2026-11-14 | 2.2 | Заглушка nginx | HTTP apex/www 200, default site убран | нет |
| 2026-11-14 | 2.3 | `certbot --nginx` для apex/www | сертификат до 2027-02-12, HTTP 301 на HTTPS | www HTTPS пока 200, редирект на этапе 5 |
| 2026-11-14 | 2.4 | `certbot renew --dry-run` | успешно, но был random delay ~128с | использовать `--no-random-sleep-on-renew` |
| 2026-11-14 | 3.0 | Удалены `astro.config.node-test.mjs` и extraneous `node_modules/@astrojs/node` | адаптер ставится штатно | посторонние изменения дерева не тронуты, 3.0 не закрыт |
| 2026-11-14 | 3.1–3.6 | Astro 7.4.11 exact, `@astrojs/node` 11.1.12, Vercel удалён; config/env/SEO/siteUrl | сборка main успешна, canonical и OG абсолютные | `astro` закреплён точной версией |
| 2026-11-14 | 3.7–3.9 | Три promo в `promos/`; base/site/noindex/withBase; sitemap и robots Pekarnya убраны | все ссылки и ассеты с `/promo/<slug>/` | `node_modules`/`dist` созданы сборкой и покрыты `.gitignore` |
| 2026-11-14 | 3.10 | Сборки main + 3 promo, smoke, `astro check`, `vitest` | `smoke ok`; Pekarnya и Manicure — 0 ошибок; 42 теста | audit: main 1 high `js-yaml`, coffee 1 high `sharp`; не исправлялись |
| 2026-11-14 | 3.0 | Коммиты `f756cf6`, `3e03381`, push в `github/main` | рабочее дерево чистое | посторонние изменения разведены отдельным коммитом |
| 2026-11-14 | 4.1–4.9 | Созданы `deploy/promos.json`, 4 nginx-файла, unit, sudoers, `activate-release.sh`, `.github/workflows/deploy.yml` | `bash -n` и `visudo -cf` проходят; `shellcheck` и `actionlint` — 0 замечаний | сервер не изменялся |
| 2026-11-14 | 4.10 | Локальная проверка nginx на временной копии: порты, пути и сертификаты заменены | syntax ok; promo 200/404 с `X-Robots-Tag`, кэш 30d, 7-й POST — 429 JSON | `nginx -t` на сервере не запускался; это этап 5 |
| 2026-11-14 | 4.10 | Песочница `activate-release.sh`: успешная активация и отказ health-check | симлинки переключились и откатились; retention 5 | пути и `sudo` заменены заглушками |
| 2026-11-14 | 4.10 | Staging-копия: `npm prune --omit=dev`, запуск `dist/server/entry.mjs` | Astro 7.4.11 и адаптер 11.1.12 на месте; `GET /` 200 | без Telegram-секретов |
| 2026-11-14 | 5.1 | Созданы `/srv/site/releases`, `/srv/www/...`, `/etc/site`; владелец `deploy:deploy` | права каталогов проверены | нет |
| 2026-11-14 | 5.2 | `.env` -> `/etc/site/site.env` через SSH | 600 root:root, 2 строки, значения не печатались | нет |
| 2026-11-14 | 5.3 | Установлены unit и sudoers; `daemon-reload`, `enable` | `visudo -cf` parsed OK; unit enabled | нет |
| 2026-11-14 | 5.4 | Сборки main + 3 promo; staging `npm ci --omit=dev`; REV `3e03381-manual-20261114-201438`; rsync | main 188M, promo 1.2–2.0M; entry.mjs и node_modules на месте | на сервере npm не запускался |
| 2026-11-14 | 5.5 | `ln -sfn` для current и трёх promo; restart `style-logic` | active; `/` 200; API `{}` 400; симлинки на один REV | нет |
| 2026-11-14 | 5.6 | Бэкап nginx; замена конфига; первый `nginx -t` | ошибка `server_names_hash_bucket_size` 32 | добавлен `server_names_hash_bucket_size 64` в limits |
| 2026-11-14 | 5.6 | Повторный `nginx -t` и reload; публичные проверки | syntax ok; HTTP/www 301, apex 200, promo 200; заглушка удалена | нет |
| 2026-11-15 | 6.1 | Создан `~/.ssh/style-logic-deploy`; pub добавлен `deploy` | вход по ключу работает | ключ без пароля, только для CI |
| 2026-11-15 | 6.2 | `ssh-keyscan`, сверка ed25519-отпечатка | отпечатки совпали | нет |
| 2026-11-15 | 6.3 | `gh secret set` для четырёх секретов | 4 секрета, значения не печатались | нет |
| 2026-11-15 | 6.4 | Коммит `fb5c6ac`, push `github/main`, workflow `43729148642` | success за 1m24s | без секретов в diff |
| 2026-11-15 | 6.5 | Проверка релиза, симлинков и публичных URL | `fb5c6ac-1`; apex 200, HTTP/www 301, promo 200, API 400; логи чисты | нет |
| 2026-11-15 | 7.1–7.2 | HTTPS/www/promo и ассеты | 301/301/200; promo 200, noindex; ассеты 27/24/14 — все 200 | нет |
| 2026-11-15 | 7.3 | POST заявки в Telegram | первый раз `ETIMEDOUT`; DNS `api.telegram.org` -> недоступный `149.154.166.110`; закреплён `149.154.167.220` в `/etc/hosts`; повторно `{"ok":true}` | сетевой обход через hosts, следить за сменой IP |
| 2026-11-15 | 7.4 | 15 POST с `{}` | 6x400, 9x429; JSON 429 корректен | rate limit снялся после reboot |
| 2026-11-15 | 7.5 | `systemctl reboot` | SSH через 20с; style-logic/nginx/fail2ban active; UFW active; HTTPS 200 | нет |
| 2026-11-15 | 7.6 | `certbot renew --dry-run --no-random-sleep-on-renew` | success; timer active; сертификат до 2027-02-12 | нет |
| 2026-11-15 | 7.7 | SEO, responsive, mobile menu/form | canonical/OG абсолютные; gates responsive/mobile-first OK; promo overflow OK; main cookie-overlay — ложное срабатывание | sitemap/robots main 404 |
| 2026-11-15 | 7.7 | Найден overflow 280px на `shkola-manikyura`; фикс hero/pricing; commit `5675765`, workflow `43732040400` | release `5675765-1`; gates 280/320/414 OK; mobile menu/form smoke OK | нет |
| 2026-11-15 | 8.1 | Проверены `20auto-upgrades` и `unattended-upgrades` | конфиг уже верный; active/enabled; 0 upgradable | изменений не потребовалось |
| 2026-11-15 | 8.2 | Создан `/etc/systemd/journald.conf.d/99-size.conf`, restart journald | active; journal 79.7M; vacuum 0B | нет |
| 2026-11-15 | 8.3 | `df`, `free`, `systemctl --failed`, `journalctl -p err`, fail2ban, certbot dry-run | диск 15%, swap 0, failed 0; ошибки только SSH-сканеры и networkd wait; certbot success | нет |
| 2026-11-15 | 8.4 | Проверены GitHub, `/etc/site/site.env`, сертификат | remote `180f2b7`; 600 root:root, 2 ключа; cert до 2027-02-12 | снапшот провайдера и менеджер паролей пропущены по решению заказчика; вернуться после общего плана |
| 2026-11-15 | 8.5 | Проверены релизы, диск, retention в песочнице | main 4, promo по 4; `current` `180f2b7-1`; sandbox 5 из 6; диск 13% | старые релизы не удалялись |
| 2026-11-15 | 8.6 | Установлены `style-logic-monitor` и timer; создан `.github/workflows/uptime.yml` | timer active/enabled; state `ok`; ручной run `43741414243` success | первый старт упал `226/NAMESPACE`, исправлено `StateDirectory` |
| 2026-11-15 | 8.6 | Actions обновлены до `checkout@v7`, `setup-node@v7`, `github-script@v9`; deploy run `43741416636` | success 2m16s; release `180f2b7-1`; Node 20 warning ушла | осталась аннотация миграции `ubuntu-latest` на Ubuntu 26 |
| 2026-11-16 | 9.1 | Откат main `180f2b7-1` → `5675765-1`, restart, health; возврат `180f2b7-1` | 320мс; current и сервис проверены | health-check требует retry |
| 2026-11-16 | 9.2 | Откат трёх promo `180f2b7-1` → `5675765-1`, nginx reload; возврат | 224мс; все promo 200 | нет |
| 2026-11-16 | 9.3 | Созданы бэкапы `2026-11-16-1806`; nginx и systemd restore probe; sudoers/sshd | nginx 424мс, unit 1573мс; `nginx -t`, `visudo`, `sshd -t` OK | старый nginx backup — заглушка до этапа 5, не использовать |
| 2026-11-16 | 9.4 | Полный откат из снапшота | отложен вместе с 8.4; снапшот не подтверждён | не проверялся; fallback — переустановка |
| 2026-11-16 | 9.5 | Учебный откат main+promo с retry и возвратом | полный цикл 1353мс; API 400; финальный релиз `180f2b7-1`; сервисы active | первый прогон прервался из-за health-check без retry; trap восстановил current |

## Открытые вопросы и риски

- Причина прошлого зависания неизвестна; все длинные команды выполняются с таймаутом и логом.
- Astro 6 -> 7 у `manicure-site` проверен: `astro check` и сборка проходят, типизация `StudentWorks.astro` исправлена.
- Аудит зависимостей: main — 1 high (`js-yaml`), coffee — 1 high (`sharp`); в этом этапе не исправлялись.
- Этап 5: `nginx -t` на сервере прошёл после добавления `server_names_hash_bucket_size 64`; исходная ошибка — дефолтное значение 32.
- `activate-release.sh` успешно отработал в workflow run `43729148642`; релиз `fb5c6ac-1` активен, логи Actions проверены на секреты.
- Telegram API: DNS `api.telegram.org` отдаёт недоступный с VPS `149.154.166.110`; в `/etc/hosts` закреплён `149.154.167.220`. При смене IP Telegram форму перепроверить.
- `sitemap-index.xml` и `robots.txt` main отдают 404; promo закрыты noindex. Добавить sitemap/robots main отдельной задачей, если нужно.
- `verify_overflow` для main флагует фиксированный cookie-баннер, перекрывающий hero-ссылки; после reject баннер скрыт. Это overlay, не layout-дефект.
- GitHub Actions: Node.js 20 deprecation закрыта обновлением до `checkout@v7`, `setup-node@v7`, `github-script@v9`; осталась будущая миграция `ubuntu-latest` на Ubuntu 26 (октябрь 2026).
- Мониторинг: серверный Telegram-алерт не сработает при полной недоступности VPS; для этого внешний GitHub Actions создаёт issue. Telegram-секреты в CI не передаются.
- Снапшот этапов 8/9.4: снапшот VPS в панели Planetahost и копия `TELEGRAM_*` в менеджере паролей пропущены по решению заказчика; 9.4 не проверялся. Вернуться к обсуждению после общего плана. Fallback — переустановка сервера.
- Откат: одиночный `curl` сразу после `systemctl restart style-logic` может вернуть `connection refused`; health-check делать с retry. В `activate-release.sh` уже 10 попыток по 2с.
- Конфиги: старый `/etc/nginx/sites-available/style-logic.conf.bak.2026-11-14-202041` — заглушка до этапа 5; для отката использовать свежий бэкап `2026-11-16-1806`.
- 512M swap; следить за `free -h` и OOM.
- Снапшот `pre-bootstrap` недоступен; по решению заказчика этап 1 выполняется без него, fallback — переустановка сервера.
- `certbot renew --dry-run` без `--no-random-sleep-on-renew` может ждать до ~2.5 минут; это не зависание.
