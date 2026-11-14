# Этап 5. Первый ручной деплой

Статус: план. Не выполнен.

Где: VPS `root@62.173.152.100` и локально `/home/max/projects/site-dev`.

Цель: проверить всю схему без GitHub Actions: каталоги, секреты, systemd, первый релиз, симлинки, боевой nginx. Если что-то сломается, понятно, на каком шаге.

Предусловия:

- Этапы 1–4 завершены.
- Этап 2 завершён: сертификат есть, `options-ssl-nginx.conf` и `ssl-dhparams.pem` на месте.
- Main и три promo собираются локально.
- `.env` содержит `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.

Оценка: 45–90 минут.

## 5.1 Каталоги и права на VPS

```bash
mkdir -p /srv/site/releases /srv/www/releases/promo /srv/www/promo /etc/site
chown -R deploy:deploy /srv/site /srv/www
chmod 755 /srv/site /srv/www
```

Проверка:

```bash
ls -ld /srv/site /srv/www /srv/site/releases /srv/www/releases/promo
```

Ожидаемо: владелец `deploy:deploy`, каталоги доступны на чтение nginx.

## 5.2 Секреты

Из локального каталога репозитория:

```bash
grep -E '^(export[[:space:]]+)?TELEGRAM_(BOT_TOKEN|CHAT_ID)=' .env \
  | sed -E 's/^export[[:space:]]+//' \
  | tr -d '\r' \
  | ssh root@62.173.152.100 'umask 077; mkdir -p /etc/site; cat > /etc/site/site.env'
```

Проверка на VPS, значения не печатать:

```bash
stat -c '%a %U:%G %n' /etc/site/site.env
grep -c '^TELEGRAM_' /etc/site/site.env
```

Ожидаемо: `600 root:root`, две строки.

Стоп-точка: если строк не две, не запускать сервис; проверить `.env` и повторить.

## 5.3 systemd и sudoers

Локально:

```bash
scp deploy/systemd/style-logic.service root@62.173.152.100:/etc/systemd/system/style-logic.service
scp deploy/sudoers/deploy-style-logic root@62.173.152.100:/etc/sudoers.d/deploy-style-logic
```

На VPS:

```bash
chmod 440 /etc/sudoers.d/deploy-style-logic
visudo -cf /etc/sudoers.d/deploy-style-logic
systemctl daemon-reload
systemctl enable style-logic
```

Ожидаемо: `visudo` без ошибок, unit включён.

## 5.4 Первый релиз

Собрать локально:

```bash
npm run build
for dir in promos/*; do (cd "$dir" && npm run build); done
```

Подготовить runtime-зависимости в отдельном staging-каталоге, не мутируя локальный `node_modules`:

```bash
ROOT=/home/max/projects/site-dev
REV="$(git rev-parse --short=7 HEAD)-manual-$(date +%Y%m%d-%H%M%S)"
STAGE=/tmp/style-logic-release

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$ROOT/dist" "$STAGE/dist"
cp "$ROOT/package.json" "$ROOT/package-lock.json" "$STAGE/"
cd "$STAGE"
npm ci --omit=dev --no-audit --no-fund
cd "$ROOT"
```

Создать каталоги релиза на сервере:

```bash
ssh root@62.173.152.100 "mkdir -p /srv/site/releases/$REV /srv/www/releases/promo/pekarnya/$REV /srv/www/releases/promo/shkola-manikyura/$REV /srv/www/releases/promo/kofeynya/$REV"
```

Загрузить main:

```bash
rsync -az --delete "$STAGE/dist/" root@62.173.152.100:/srv/site/releases/$REV/dist/
rsync -az "$STAGE/node_modules" root@62.173.152.100:/srv/site/releases/$REV/
rsync -az "$STAGE/package.json" "$STAGE/package-lock.json" root@62.173.152.100:/srv/site/releases/$REV/
```

Загрузить promo:

```bash
rsync -az --delete promos/pekarnya/dist/ root@62.173.152.100:/srv/www/releases/promo/pekarnya/$REV/
rsync -az --delete promos/shkola-manikyura/dist/ root@62.173.152.100:/srv/www/releases/promo/shkola-manikyura/$REV/
rsync -az --delete promos/kofeynya/dist/ root@62.173.152.100:/srv/www/releases/promo/kofeynya/$REV/
```

Права:

```bash
ssh root@62.173.152.100 "chown -R deploy:deploy /srv/site /srv/www && chmod -R a+rX /srv/site/releases/$REV /srv/www/releases/promo/*/$REV"
```

Проверка:

```bash
ssh root@62.173.152.100 "test -f /srv/site/releases/$REV/dist/server/entry.mjs && test -d /srv/site/releases/$REV/node_modules && echo ok"
```

## 5.5 Симлинки, запуск, health-check

На VPS:

```bash
ln -sfn /srv/site/releases/<REV> /srv/site/current
ln -sfn /srv/www/releases/promo/pekarnya/<REV> /srv/www/promo/pekarnya
ln -sfn /srv/www/releases/promo/shkola-manikyura/<REV> /srv/www/promo/shkola-manikyura
ln -sfn /srv/www/releases/promo/kofeynya/<REV> /srv/www/promo/kofeynya
```

Для первого ручного деплоя допустимо `ln -sfn`; атомарная замена с `mv -T` обязательна в `activate-release.sh` на этапе 6.

```bash
systemctl restart style-logic
systemctl status style-logic --no-pager
journalctl -u style-logic -n 50 --no-pager
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4321/
curl -sS -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:4321/api/send-lead -H 'Content-Type: application/json' -d '{}'
```

Ожидаемо: сервис `active (running)`, `/` -> 200, `/api/send-lead` с пустым телом -> 400.

Стоп-точка: если сервис не запустился или health-check не прошёл, не переключать nginx.

## 5.6 Боевой nginx

Сначала бэкап текущего конфига на сервере:

```bash
ssh root@62.173.152.100 "cp -a /etc/nginx/sites-available/style-logic.conf /etc/nginx/sites-available/style-logic.conf.bak.$(date +%F)"
```

Загрузить файлы:

```bash
scp deploy/nginx/style-logic.conf root@62.173.152.100:/etc/nginx/sites-available/style-logic.conf
scp deploy/nginx/style-logic-limits.conf root@62.173.152.100:/etc/nginx/conf.d/style-logic-limits.conf
scp deploy/nginx/style-logic-app.conf root@62.173.152.100:/etc/nginx/snippets/style-logic-app.conf
scp deploy/nginx/style-logic-headers.conf root@62.173.152.100:/etc/nginx/snippets/style-logic-headers.conf
```

На VPS:

```bash
ln -sfn /etc/nginx/sites-available/style-logic.conf /etc/nginx/sites-enabled/style-logic.conf
nginx -t
systemctl reload nginx
```

Стоп-точка: `nginx -t` проходит. При ошибке не делать reload; вернуть бэкап.

Проверка:

```bash
curl -I http://style-logic.ru
curl -I https://style-logic.ru
curl -I https://www.style-logic.ru
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/promo/pekarnya/
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/promo/shkola-manikyura/
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/promo/kofeynya/
```

Ожидаемо: HTTP -> 301, `www` -> 301, promo -> 200.

Убрать заглушку:

```bash
rm -rf /var/www/style-logic-placeholder
```

## Критерии приёмки

- [ ] Релиз лежит в `/srv/site/releases/<REV>`, `current` указывает на него.
- [ ] Все три promo-симлинка указывают на тот же `<REV>`.
- [ ] `style-logic` активен, `/` и API отвечают.
- [ ] `https://style-logic.ru` и promo открываются.
- [ ] `http` и `www` редиректят на HTTPS apex.
- [ ] `/etc/site/site.env` имеет права `600 root:root`.

## Откат

1. Вернуть предыдущий релиз:

```bash
ls -1dt /srv/site/releases/*
ln -sfn /srv/site/releases/<PREVIOUS_REV> /srv/site/current
systemctl restart style-logic
```

2. Вернуть promo-симлинки на предыдущий REV.
3. Вернуть nginx из `style-logic.conf.bak.<date>`, выполнить `nginx -t` и reload.
4. При полной неудаче — снапшот `pre-bootstrap`.

## Артефакты

- `/srv/site/releases/<REV>`.
- `/srv/www/releases/promo/<slug>/<REV>`.
- `/etc/site/site.env`.
- `/etc/systemd/system/style-logic.service`.
- `/etc/sudoers.d/deploy-style-logic`.
- Бэкап nginx-конфига.
- Запись результатов в `STATUS.md`.
