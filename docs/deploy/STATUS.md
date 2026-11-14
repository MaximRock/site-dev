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
| 3. Миграция репо | [!] | 2026-11-14 | opencode | 3.1–3.10 готовы, сборки и smoke пройдены; 3.0 не закрыт: посторонние изменения дерева не тронуты |
| 4. Артефакты деплоя | [ ] | | | |
| 5. Первый деплой | [ ] | | | |
| 6. GitHub Actions | [ ] | | | |
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

- [!] 3.0 Extraneous-адаптер удалён; посторонние изменения (`README.md`, старые `docs/*`, `site-v3.md`, `public/logo1.png`) не тронуты, коммит/stash не делались.
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

- [ ] 4.1 `deploy/promos.json`.
- [ ] 4.2 nginx limits.
- [ ] 4.3 nginx headers.
- [ ] 4.4 nginx app proxy.
- [ ] 4.5 nginx site config.
- [ ] 4.6 systemd unit.
- [ ] 4.7 sudoers.
- [ ] 4.8 `activate-release.sh`.
- [ ] 4.9 GitHub Actions workflow.
- [ ] 4.10 Валидация файлов.

## Этап 5. Первый деплой

- [ ] 5.1 Каталоги и права на VPS.
- [ ] 5.2 Секреты в `/etc/site/site.env`.
- [ ] 5.3 systemd и sudoers установлены.
- [ ] 5.4 Первый релиз загружен.
- [ ] 5.5 Симлинки, запуск, health-check.
- [ ] 5.6 Боевой nginx и проверка.

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

## Открытые вопросы и риски

- Причина прошлого зависания неизвестна; все длинные команды выполняются с таймаутом и логом.
- Astro 6 -> 7 у `manicure-site` проверен: `astro check` и сборка проходят, типизация `StudentWorks.astro` исправлена.
- Этап 3.0 не закрыт: рабочее дерево содержит посторонние изменения; они не тронуты. Нужен отдельный коммит или stash по решению заказчика.
- Аудит зависимостей: main — 1 high (`js-yaml`), coffee — 1 high (`sharp`); в этом этапе не исправлялись.
- 512M swap; следить за `free -h` и OOM.
- Снапшот `pre-bootstrap` недоступен; по решению заказчика этап 1 выполняется без него, fallback — переустановка сервера.
- `certbot renew --dry-run` без `--no-random-sleep-on-renew` может ждать до ~2.5 минут; это не зависание.
