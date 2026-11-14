# Этап 2. Заглушка и TLS

Статус: выполнен 2026-11-14.

Где: VPS, `root@62.173.152.100`.

Цель: домен перестаёт отдавать `connection refused`, nginx отвечает по HTTP, Let's Encrypt выдаёт сертификат на apex и `www`. Боевой конфиг заменит заглушку на этапе 5.

Предусловия:

- Этап 1 завершён: nginx установлен, UFW открывает 22/80/443.
- A-записи домена указывают на VPS; AAAA-записей нет.

Оценка: 15–30 минут плюс ожидание DNS, если записи ещё не разошлись.

## 2.1 Проверить DNS

```bash
dig +short style-logic.ru @1.1.1.1
dig +short www.style-logic.ru @1.1.1.1
dig +short AAAA style-logic.ru @1.1.1.1
dig +short AAAA www.style-logic.ru @1.1.1.1
```

Ожидаемо:

- A-записи дают `62.173.152.100`.
- AAAA-записей нет. Если появятся — направить на VPS или удалить, иначе часть клиентов и Let's Encrypt пойдут мимо.

Стоп-точка: A-записи верные. Если нет — ждать DNS и не запускать certbot.

## 2.2 Временная заглушка

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

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/style-logic.conf /etc/nginx/sites-enabled/style-logic.conf

nginx -t
systemctl reload nginx
```

Проверка:

```bash
curl -I http://style-logic.ru
curl -I http://www.style-logic.ru
```

Ожидаемо: HTTP 200 и HTML заглушки.

Стоп-точка: `nginx -t` проходит. При ошибке не делать reload.

## 2.3 Сертификат Let's Encrypt

```bash
certbot --nginx \
  -d style-logic.ru \
  -d www.style-logic.ru \
  --redirect \
  --agree-tos \
  --no-eff-email \
  -m <EMAIL>
```

Проверка:

```bash
curl -I https://style-logic.ru
curl -I https://www.style-logic.ru
certbot renew --dry-run --no-random-sleep-on-renew
ls -l /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/ssl-dhparams.pem
```

Ожидаемо:

- certbot пишет `Congratulations`.
- Оба домена открываются по HTTPS.
- `certbot renew --dry-run --no-random-sleep-on-renew` успешен. Флаг убирает случайную задержку до ~2.5 минут, из-за которой команда выглядит зависшей.
- Файлы `options-ssl-nginx.conf` и `ssl-dhparams.pem` существуют; они понадобятся боевому конфигу на этапе 5.

Стоп-точка: dry-run успешен. Если файлов нет — не переходить к этапу 5, разобраться с certbot.

## Критерии приёмки

- [x] A-записи указывают на VPS, AAAA нет.
- [x] `http://style-logic.ru` и `http://www.style-logic.ru` отвечают.
- [x] HTTPS открывается без предупреждения браузера.
- [x] `certbot renew --dry-run --no-random-sleep-on-renew` проходит.
- [x] `options-ssl-nginx.conf` и `ssl-dhparams.pem` на месте.

## Откат

1. Вернуть заглушку или остановить nginx:

```bash
systemctl stop nginx
```

2. Если certbot изменил конфиг и nginx не стартует, восстановить предыдущий файл из `deploy/nginx/` или из бэкапа.
3. Сертификат можно удалить отдельно, но при повторном запуске Let's Encrypt есть лимиты; без необходимости не удалять.

## Артефакты

- `/var/www/style-logic-placeholder/index.html`.
- `/etc/nginx/sites-available/style-logic.conf` (временный).
- `/etc/letsencrypt/live/style-logic.ru/`.
- Запись результатов в `STATUS.md`.
