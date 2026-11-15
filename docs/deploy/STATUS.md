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
| 6. GitHub Actions | [~] | 2026-11-14 | opencode | выполняется |
| 7. Приёмка | [ ] | | | |
| 8. Обслуживание | [ ] | | | |
| 9. Откат | [ ] | | | |

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

- [ ] 6.1 Deploy-ключ создан и добавлен.
- [ ] 6.2 `known_hosts` и отпечаток проверены.
- [ ] 6.3 Секреты GitHub настроены.
- [ ] 6.4 Первый прогон workflow успешен.
- [ ] 6.5 Релиз и симлинки проверены.

## Этап 7. Приёмка

- [ ] 7.1 Домен и HTTPS.
- [ ] 7.2 Promo: 200, noindex, ассеты.
- [ ] 7.3 API и Telegram.
- [ ] 7.4 Rate limit и JSON 429.
- [ ] 7.5 Сервисы после reboot.
- [ ] 7.6 Сертификаты и продление.
- [ ] 7.7 SEO и мобильная проверка.
- [ ] 7.8 Результаты записаны.

## Этап 8. Обслуживание

- [ ] 8.1 Автообновления безопасности.
- [ ] 8.2 Ограничение journald.
- [ ] 8.3 Регулярные проверки.
- [ ] 8.4 Бэкапы.
- [ ] 8.5 Retention релизов и диск.
- [ ] 8.6 Мониторинг и алерты.

## Этап 9. Откат

- [ ] 9.1 Откат main.
- [ ] 9.2 Откат promo.
- [ ] 9.3 Откат конфигов.
- [ ] 9.4 Полный откат из снапшота.
- [ ] 9.5 Учебный откат выполнен.

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

## Открытые вопросы и риски

- Причина прошлого зависания неизвестна; все длинные команды выполняются с таймаутом и логом.
- Astro 6 -> 7 у `manicure-site` проверен: `astro check` и сборка проходят, типизация `StudentWorks.astro` исправлена.
- Аудит зависимостей: main — 1 high (`js-yaml`), coffee — 1 high (`sharp`); в этом этапе не исправлялись.
- Этап 5: `nginx -t` на сервере прошёл после добавления `server_names_hash_bucket_size 64`; исходная ошибка — дефолтное значение 32.
- `activate-release.sh` проверен в песочнице; на реальном сервере пока не запускался (этап 6).
- 512M swap; следить за `free -h` и OOM.
- Снапшот `pre-bootstrap` недоступен; по решению заказчика этап 1 выполняется без него, fallback — переустановка сервера.
- `certbot renew --dry-run` без `--no-random-sleep-on-renew` может ждать до ~2.5 минут; это не зависание.
