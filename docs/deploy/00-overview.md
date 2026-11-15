# План деплоя style-logic.ru

Статус: этапы 1–8 выполнены 2026-11-15; 8.4 пропущен по решению заказчика, обсудить после общего плана; этап 9 не начат. Активен релиз `180f2b7-1`. Сервер изменялся в рамках этапов 1–2 и 5–8.

Связанные документы:

- `docs/deploy-runbook.md` — подробный справочник команд.
- `docs/deploy/01-bootstrap.md` … `09-rollback.md` — планы этапов.
- `docs/deploy/STATUS.md` — журнал выполнения и чек-листы.

## 1. Цель

Разместить main-сайт и три promo-проекта на одном VPS:

- `style-logic.ru` — Astro standalone Node-сервер за nginx, форма заявки уходит в Telegram.
- `/promo/pekarnya/` — статика из `promos/pekarnya`.
- `/promo/shkola-manikyura/` — статика из `promos/shkola-manikyura`.
- `/promo/kofeynya/` — статика из `promos/kofeynya`.

Условия:

- TLS для apex и `www`, `www` редиректит на apex.
- Секреты Telegram живут только на сервере.
- Деплой автоматический с ветки `main` через GitHub Actions.
- Активация релиза атомарная, с откатом при неудаче.
- Promo-сайты отдаются с `noindex, follow`.
- Почтовые DNS-записи SpaceWeb не меняются.

## 2. Текущее состояние

Проверено 2026-11-13; этапы 1–7 выполнены 2026-11-14…15 (этап 4 — локально, этап 6 — GitHub Actions, этап 7 — приёмка); этап 8 — 2026-11-15.

### VPS

- Ubuntu 24.04.4 LTS, kernel 6.8.0-111, KVM.
- 3.7 GiB RAM, 40 GB SSD, свободно 34 GB.
- `/swapfile` 512M, запись в `/etc/fstab` есть.
- Timezone `Europe/Moscow`, NTP синхронизирован.
- UFW активен: открыты 22, 80, 443.
- Установлены nginx 1.24.0, Node.js 22.23.5, npm 10.9.9, certbot 2.9.0, fail2ban; пользователь `deploy` есть; `/srv` и `/etc/site` созданы на этапе 5.
- Активен релиз `180f2b7-1`; `style-logic`, nginx и fail2ban active; автодеплой проверен run `43729148642`, фикс мобильного overflow — run `43732040400`, проверка обновлённых actions — run `43741416636`.
- root и `deploy` входят по ключу; `PermitRootLogin prohibit-password`, `PasswordAuthentication no` (override `00-style-logic.conf`).
- `unattended-upgrades` active/enabled; 0 pending-обновлений; reboot выполнен 2026-11-14, сервисы активны.
- journald ограничен 200M (фактически 79.7M); серверный monitor timer active, внешний GitHub uptime-check каждые 15 минут.

### Домен

- A-записи `style-logic.ru` и `www.style-logic.ru` указывают на `62.173.152.100`.
- AAAA-записей нет.
- Порты 80 и 443 открыты; HTTP редиректит на HTTPS, сертификат Let's Encrypt действует до 2027-02-12.

### Локальный репозиторий

- `gh` авторизован как `MaximRock`, доступ к `MaximRock/site-dev` есть.
- `.env` содержит ровно два ключа: `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.
- Артефакты этапов 4–5 закоммичены в `fb5c6ac`; мобильный фикс этапа 7 — в `5675765`; монитор этапа 8 — в `0c8d64a`; обновление actions — в `180f2b7`; после закрытия этапа 7 дерево было чистым.
- Следы прошлой попытки удалены: `astro.config.node-test.mjs` и extraneous `@astrojs/node` из `/tmp` больше нет; адаптер установлен штатно.

### Источники promo

| Источник | Куда в monorepo | Особенности |
| --- | --- | --- |
| `/home/max/projects/bakery-shop` | `promos/pekarnya` | Astro 7.4.4, нет `.git`; есть sitemap и `robots.txt.ts`, для promo убрать |
| `/home/max/projects/manicure-site` | `promos/shkola-manikyura` | Astro 6.4.7, есть `.git`; исключить `ansible/`, `.envrc`, `.aider*` |
| `/home/max/projects/coffee-shop` | `promos/kofeynya` | Astro 7.3.3, есть `.git`; `image/` — архив исходников, в сборке не участвует |

## 3. Целевая схема

```text
Интернет
  |
  v
nginx :80/:443 (TLS, статика, rate limit)
  |-- /                         -> /srv/site/current/dist/client
  |-- /api/send-lead            -> 127.0.0.1:4321 (Astro standalone)
  |-- /promo/pekarnya/          -> /srv/www/promo/pekarnya/
  |-- /promo/shkola-manikyura/  -> /srv/www/promo/shkola-manikyura/
  `-- /promo/kofeynya/          -> /srv/www/promo/kofeynya/

GitHub Actions
  |-- сборка main + promos
  |-- rsync в /srv/site/releases/<rev> и /srv/www/releases/promo/<slug>/<rev>
  `-- атомарная смена симлинков + restart style-logic + reload nginx
```

## 4. Решения

| ID | Решение |
| --- | --- |
| D1 | Монорепо: три promo копируются в `site-dev/promos/`. |
| D2 | Astro 7.4.11 у main и всех promo; `manicure-site` обновляется с 6.4.7. |
| D3 | Runtime-зависимости: в CI `npm prune --omit=dev`, `node_modules` попадает в релиз через rsync. На сервере npm не нужен. |
| D4 | Активация: проверка всех релизов до переключения, `mv -T` для симлинков, trap с откатом при падении health-check. |
| D5 | TLS: `certbot --nginx`, бэкап конфига, проверка `options-ssl-nginx.conf` и `ssl-dhparams.pem`. |
| D6 | Promo: без sitemap/robots, `noindex, follow`, canonical на `https://style-logic.ru/promo/<slug>/`. |
| D7 | Rate limit: 20r/m, burst 5, JSON-ответ на 429. |
| D8 | REV: короткий SHA + `GITHUB_RUN_ATTEMPT`, чтобы re-run не перезаписывал живой релиз. |
| D9 | Секреты только в `/etc/site/site.env` (root:root, 0600); в CI не передаются. |
| D10 | Этапы выполняются только по команде заказчика, без автоперехода. |
| D11 | Swap остаётся 512M: при 3.7 GiB RAM этого достаточно для nginx и Node. |
| D12 | Перед этапом 1 создаётся снапшот `pre-bootstrap`; 2026-11-14 снапшот недоступен, по решению заказчика пропущен, fallback — переустановка сервера. |
| D13 | `astro.config.node-test.mjs` и extraneous-адаптер удалены на этапе 3. Посторонние изменения разведены коммитами `f756cf6` и `3e03381`; рабочее дерево чистое. |

## 5. Этапы

| Этап | Где | Результат | Гейт |
| --- | --- | --- | --- |
| 0. Инвентарь | локально + VPS | состояние зафиксировано | выполнен |
| 1. Bootstrap | VPS | deploy, SSH, UFW, fail2ban, Node 22, nginx | вход deploy, `sshd -T`, `ufw status`, `node -v` |
| 2. Заглушка и TLS | VPS | 80/443 отвечают, сертификат | `certbot renew --dry-run` |
| 3. Миграция репо | локально | Node adapter, env, promos, base, noindex | выполнен; smoke main + 3 promo пройден |
| 4. Артефакты деплоя | локально | nginx, systemd, sudoers, activate, workflow | выполнен; `bash -n`, `shellcheck`, `actionlint`, локальный nginx-тест |
| 5. Первый деплой | VPS | ручной релиз, сервис, боевой nginx | выполнен; API 400 на `{}`, promo 200, HTTPS apex 200 |
| 6. GitHub Actions | GitHub + VPS | автодеплой с main | выполнен; run `43729148642` success, `fb5c6ac-1` активен |
| 7. Приёмка | везде | форма, лимиты, ребут, SEO | выполнен; API ok, 429, reboot/certbot ок; mobile fix `5675765-1` |
| 8. Обслуживание | VPS + GitHub | обновления, journal, retention, мониторинг | выполнен; 8.4 пропущен по решению заказчика, обсудить после общего плана |
| 9. Откат | VPS | проверенный rollback | учебный откат |

## 6. Протокол выполнения

- Перед этапом перечитать `STATUS.md`, проверить предусловия, сделать бэкап или снапшот.
- Один подэтап за раз. После каждого — проверка, запись в `STATUS.md`, отчёт.
- Длинные команды (`apt`, `npm ci`, `astro build`, `certbot`) запускать с `timeout` и логом.
- Никаких интерактивных запросов: `DEBIAN_FRONTEND=noninteractive`, SSH `BatchMode=yes`, `ConnectTimeout`.
- SSH выполнять с проверенным `known_hosts`; не отключать проверку ключа сервера.
- Не использовать `git add -A`; только точечные коммиты.
- `reboot`, замена nginx, удаление релизов и секретов — только с отдельным подтверждением.
- При превышении таймаута: остановиться, прочитать лог, доложить; не повторять команду слепо.
- Следующий этап начинается только по команде заказчика.
- Этап считается готовым только после прохождения гейта; «почти работает» не считается.

## 7. Риски

| Риск | Мера |
| --- | --- |
| Причина прошлого зависания неизвестна | Таймауты, логи, чистый `npm install` без extraneous-адаптера |
| Astro 6 -> 7 у `manicure-site` | Проверено: `astro check` и сборка проходят; типизация `StudentWorks.astro` исправлена |
| Перезапись живого релиза при re-run | REV с `GITHUB_RUN_ATTEMPT`, проверка всех релизов до переключения |
| certbot при продлении правит nginx | Бэкап конфига, проверка `options-ssl-nginx.conf` и `ssl-dhparams.pem` |
| Telegram API DNS | DNS отдаёт недоступный с VPS `149.154.166.110`; в `/etc/hosts` закреплён `149.154.167.220`; при смене IP перепроверить форму |
| Sitemap main отсутствует | `sitemap-index.xml`/`robots.txt` — 404; promo закрыты noindex; добавить отдельной задачей |
| Грязное рабочее дерево | Артефакты 4–6, mobile fix и монитор закоммичены; коммитить точечно, без `git add -A` |
| Снапшот недоступен | По решению заказчика этап 1 выполнен без снапшота; 8.4 (снапшот провайдера и менеджер паролей) пропущен, вернуться после общего плана; fallback — переустановка сервера |
| Мониторинг при полном падении VPS | Серверный Telegram-монитор не сможет отправить алерт; внешний GitHub Actions создаёт issue, но не Telegram |
| 512M swap | Мониторинг `free -h` и OOM; при необходимости увеличить |
| Ошибки в путях promo | Широкий grep `href/src/srcset/poster/content`, `url()`, `fetch()`; проверка ассетов |
| Утечка секретов | `/etc/site/site.env` 0600, секреты не в CI, проверка journal на токены |

## 8. Артефакты

- `docs/deploy/00-overview.md` — этот файл.
- `docs/deploy/01-bootstrap.md` … `09-rollback.md` — планы этапов.
- `docs/deploy/STATUS.md` — журнал выполнения.
- `docs/deploy-runbook.md` — справочник команд.

## 9. Журнал изменений плана

| Дата | Изменение |
| --- | --- |
| 2026-11-13 | Создан общий план; зафиксированы инвентарь и решения D1–D13. |
| 2026-11-13 | Созданы планы этапов 01–09 и журнал `STATUS.md`. |
| 2026-11-14 | Этап 1 выполнен: пакеты, deploy, SSH, UFW, fail2ban, Node 22, reboot. |
| 2026-11-14 | Этап 2 выполнен: DNS проверен, заглушка nginx, сертификат Let's Encrypt. |
| 2026-11-14 | Этап 3: Astro 7.4.11, Node adapter, promo в `promos/`, base/noindex, сборки и smoke; 3.0 открыт. |
| 2026-11-15 | Этап 8: journald 200M, retention проверен, серверный и внешний мониторинг; 8.4 пропущен по решению заказчика, вернуться после общего плана. |
