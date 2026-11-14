# Этап 7. Приёмка

Статус: план. Не выполнен.

Где: локально, VPS, браузер.

Цель: проверить не только главную, но и редиректы, promo, форму, лимиты, поведение после reboot и SEO.

Предусловия:

- Этапы 1–6 завершены.
- Telegram-бот добавлен в чат, токен и chat id корректны.

Оценка: 45–60 минут.

## 7.1 Домен и HTTPS

```bash
curl -sS -o /dev/null -w 'http apex: %{http_code} -> %{redirect_url}\n' http://style-logic.ru/
curl -sS -o /dev/null -w 'https www: %{http_code} -> %{redirect_url}\n' https://www.style-logic.ru/
curl -sS -o /dev/null -w 'https apex: %{http_code}\n' https://style-logic.ru/
```

Ожидаемо: 301, 301, 200.

## 7.2 Promo

```bash
for slug in pekarnya shkola-manikyura kofeynya; do
  echo "=== $slug"
  curl -sS -o /dev/null -w '%{http_code}\n' "https://style-logic.ru/promo/$slug/"
  curl -sSI "https://style-logic.ru/promo/$slug/" | grep -i '^x-robots-tag:'
  curl -sS "https://style-logic.ru/promo/$slug/" | grep -o '<meta name="robots"[^>]*>'
done
```

Ожидаемо: 200, `x-robots-tag: noindex, follow`, meta `noindex, follow`.

Проверить ассеты:

```bash
curl -sS "https://style-logic.ru/promo/kofeynya/" | grep -o '/promo/kofeynya/images/[^"]*' | sort -u | head
```

Затем открыть все три promo в браузере: картинки, шрифты, меню, формы.

## 7.3 API и Telegram

```bash
curl -sS -X POST https://style-logic.ru/api/send-lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Проверка деплоя","contact":"@deploy-test","consent":true}'
```

Ожидаемо: `{"ok":true}` и сообщение в Telegram.

Проверить, что секреты не попали в логи:

```bash
journalctl -u style-logic -n 100 --no-pager
```

Искать только имена переменных, не значения.

## 7.4 Rate limit

```bash
for i in $(seq 1 30); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -X POST https://style-logic.ru/api/send-lead \
    -H 'Content-Type: application/json' \
    -d '{}'
done
```

Ожидаемо: часть ответов 400, затем 429 с JSON-телом. Лимит снимется сам.

Проверить тело 429:

```bash
curl -sS -X POST https://style-logic.ru/api/send-lead \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## 7.5 Сервис после reboot

Выполнять только после подтверждения заказчика.

```bash
reboot
```

После переподключения:

```bash
systemctl is-active style-logic nginx fail2ban
ufw status
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/
```

Ожидаемо: всё `active`, HTTPS 200.

## 7.6 Сертификаты

```bash
certbot renew --dry-run --no-random-sleep-on-renew
systemctl list-timers | grep certbot
```

Ожидаемо: dry-run успешен, таймер активен.

## 7.7 SEO и мобильная проверка

- Canonical и `og:url` главной — абсолютные.
- `og:image` и `twitter:image` — абсолютные.
- Promo не попадают в sitemap main и не индексируются.
- Ссылки из кейсов ведут на `/promo/...`.
- Проверить сайт с телефона: вёрстка, форма, меню.
- Проверить `/privacy/`.

## 7.8 Записать результаты

Внести в `STATUS.md`:

- дату и время;
- коды ответов;
- результат отправки в Telegram;
- результат rate limit;
- состояние после reboot;
- замечания.

## Критерии приёмки

- [ ] HTTP -> HTTPS, `www` -> apex.
- [ ] Все три promo отдают 200 и noindex.
- [ ] API возвращает `{"ok":true}`, сообщение приходит.
- [ ] Rate limit даёт 429 с JSON.
- [ ] После reboot сервисы активны.
- [ ] `certbot renew --dry-run` проходит.
- [ ] Секретов нет в git, CI-логах и ответах API.
- [ ] Мобильная проверка пройдена.

## Откат

При проблемах на приёмке:

1. Зафиксировать шаг и ошибку в `STATUS.md`.
2. Вернуть предыдущий релиз по этапу 9.
3. Если проблема в конфиге — вернуть nginx из бэкапа и выполнить `nginx -t`.
4. Не отключать rate limit и не менять DNS без причины.

## Артефакты

- Заполненный чек-лист в `STATUS.md`.
- Скриншоты или логи проверок.
- Список замечаний и решений.
