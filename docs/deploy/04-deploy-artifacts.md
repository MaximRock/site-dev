# Этап 4. Артефакты деплоя

Статус: план. Не выполнен.

Где: локально, `/home/max/projects/site-dev`.

Цель: подготовить все файлы деплоя, чтобы сервер настраивался копированием, а не ручными правками. Базовая версия — `docs/deploy-runbook.md`, разделы 4.1–4.9; ниже перечислены обязательные изменения.

Предусловия:

- Этап 3 завершён: main и promo собираются.
- Решения D3, D4, D7, D8 зафиксированы.

Оценка: 2–3 часа.

## 4.1 `deploy/promos.json`

Единственный источник списка promo:

```json
{
  "pekarnya": "promos/pekarnya",
  "shkola-manikyura": "promos/shkola-manikyura",
  "kofeynya": "promos/kofeynya"
}
```

Workflow передаёт slug'и в `activate-release.sh` из этого файла; второй список в скрипте не держим.

## 4.2 `deploy/nginx/style-logic-limits.conf`

```nginx
limit_req_zone $binary_remote_addr zone=send_lead:10m rate=20r/m;
limit_req_status 429;
```

Решение D7: 20 запросов в минуту, burst 5 в location.

## 4.3 `deploy/nginx/style-logic-headers.conf`

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## 4.4 `deploy/nginx/style-logic-app.conf`

```nginx
proxy_pass http://style_logic_app;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Connection "";
proxy_connect_timeout 5s;
proxy_read_timeout 15s;
```

## 4.5 `deploy/nginx/style-logic.conf`

Взять конфиг из runbook 4.5 и внести правки:

- `location ^~ /api/` вместо `location /api/`, чтобы regex-локация статики не перехватывала будущие API-маршруты.
- В `location ^~ /promo/` добавить кэш для `_astro` и изображений: вложенная regex-локация с `expires 30d`, без собственных `add_header`, чтобы унаследовать `X-Robots-Tag` и защитные заголовки.
- Для promo сделать корректный 404: `error_page 404` не должен уводить в `/404.html` главного сайта. Использовать named location с `map $uri` на `/promo/<slug>/404.html` или отдельные location для каждого slug.
- Для 429 отдавать JSON, а не HTML:

```nginx
error_page 429 = @rate_limited;

location @rate_limited {
    default_type application/json;
    return 429 '{"ok":false,"message":"Слишком много запросов. Попробуйте позже."}';
}
```

- `limit_req zone=send_lead burst=5 nodelay;` только на точном `/api/send-lead`.
- Перед заменой конфига на сервере делать бэкап `style-logic.conf.bak.<date>`.
- HSTS не включать: `includeSubDomains` опасен для `autoconfig`/`autodiscover` SpaceWeb.

## 4.6 `deploy/systemd/style-logic.service`

Взять из runbook 4.6. Проверить:

- `User=deploy`, `Group=deploy`.
- `WorkingDirectory=/srv/site/current`.
- `EnvironmentFile=/etc/site/site.env`.
- `HOST=127.0.0.1`, `PORT=4321`.
- `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, `NoNewPrivileges=true`.

## 4.7 `deploy/sudoers/deploy-style-logic`

```sudoers
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart style-logic, /usr/bin/systemctl is-active style-logic, /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
```

Права на сервере: `0440 root:root`, проверка `visudo -cf`.

## 4.8 `deploy/activate-release.sh`

Взять за основу runbook 4.8 и обязательно внести:

- Проверить все релизы (main и все promo) до любого переключения.
- Симлинки менять атомарно: `ln -s target link.tmp && mv -T link.tmp link`.
- `trap` на ERR/EXIT: вернуть предыдущие цели симлинков и перезапустить сервис.
- Health-check: `curl /` и `POST /api/send-lead` с `{}` -> ожидать 400; это доказывает, что новый релиз и API живы.
- Проверить права: `umask 022`, после загрузки `chmod -R a+rX` на релиз, чтобы nginx читал файлы.
- Уникальный REV: короткий SHA + `GITHUB_RUN_ATTEMPT`; в ручном деплое — дата/время.
- Чистка старых релизов после успешного health-check, оставлять 5 main и 5 каждого promo.
- Slug'и принимать аргументами или читать из `deploy/promos.json`, не держать второй список.

## 4.9 `.github/workflows/deploy.yml`

Взять за основу runbook 4.9 и внести:

- `if: github.ref == 'refs/heads/main'` для job, чтобы `workflow_dispatch` не деплоил другую ветку.
- `REV="${GITHUB_SHA::7}-${GITHUB_RUN_ATTEMPT}"`.
- После сборки main: `npm prune --omit=dev` в отдельной staging-копии, затем rsync `dist`, `node_modules`, `package.json`, `package-lock.json` в релиз.
- Promo: сборка и rsync только `dist`.
- SSH: `BatchMode=yes`, `ConnectTimeout`, проверенный `known_hosts`.
- Секреты Telegram не передаются.
- Smoke-тест standalone до загрузки.
- Не запускать `npm ci` на сервере.

## 4.10 Валидация

```bash
bash -n deploy/activate-release.sh
```

Проверить вручную:

- В workflow нет `git add -A` и секретов.
- `deploy/promos.json` — единственный список promo.
- Все пути в `activate-release.sh` совпадают с runbook и workflow.

## Критерии приёмки

- [ ] Созданы `deploy/promos.json`, четыре nginx-файла, unit, sudoers, скрипт активации.
- [ ] Создан `.github/workflows/deploy.yml`.
- [ ] `bash -n deploy/activate-release.sh` проходит.
- [ ] В скрипте и workflow нет секретов.
- [ ] `nginx -t` на сервере ещё не запускался: это этап 5.

## Откат

1. Все файлы — в git; откат через `git revert` или `git restore`.
2. Не применять конфиги на сервере до этапа 5.
3. Если файлы уже скопированы на сервер, вернуть предыдущие версии из бэкапа и выполнить `nginx -t` перед reload.

## Артефакты

- `deploy/nginx/*.conf`.
- `deploy/systemd/style-logic.service`.
- `deploy/sudoers/deploy-style-logic`.
- `deploy/activate-release.sh`.
- `.github/workflows/deploy.yml`.
- Запись результатов в `STATUS.md`.
