# Этап 7. Приёмка

Статус: выполнен 2026-11-15. Приёмка пройдена; найден и исправлен overflow 280px на promo `shkola-manikyura`.

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

## Фактическое выполнение

- 7.1: HTTP apex 301 -> `https://style-logic.ru/`; HTTPS www 301 -> apex; HTTP www 301 -> apex; HTTPS apex 200; `/privacy/` 200.
- 7.2: все три promo 200; `X-Robots-Tag: noindex, follow` и meta robots совпадают; ассеты 27/24/14, все 200.
- 7.3: первый POST дал `{"ok":false}` из-за `ETIMEDOUT` к `api.telegram.org`; DNS возвращал недоступный `149.154.166.110`. В `/etc/hosts` закреплён доступный `149.154.167.220`, сервис перезапущен; повторный POST — `{"ok":true}`. Бот `@style_logic_studio_bot`, чат-группа заявок доступна. В логах только имена переменных, значений секретов нет.
- 7.4: 15 POST с `{}` — 6 ответов 400, 9 ответов 429; тело 429: `{"ok":false,"message":"Слишком много запросов. Попробуйте позже."}`.
- 7.5: reboot выполнен; SSH вернулся через 20с; `style-logic`, `nginx`, `fail2ban` active; UFW active; HTTPS 200.
- 7.6: `certbot renew --dry-run --no-random-sleep-on-renew` — success; `certbot.timer` active; сертификат до 2027-02-12.
- 7.7: canonical, `og:url`, `og:image`, `twitter:image` абсолютные; viewport есть; ссылки кейсов ведут на все три `/promo/...`; `/privacy/` 200; `logo.png` 200.
- 7.7: `verify_responsive` — OK для main, `/privacy/` и трёх promo на 280/320/414px; `verify_mobile_first` — OK; `verify_overflow` — OK для promo и `/privacy/`.
- 7.7: `verify_overflow` для main на 280/414px отметил перекрытие фиксированного cookie-баннера с ссылками hero; после `reject` баннер скрыт, `scrollWidth=390` при viewport 390. Это overlay, не layout-дефект; мобильное меню и форма проверены.
- 7.7: мобильный smoke: меню main открывается/закрывается, `aria-expanded` меняется; меню promo и модальная форма тарифа открываются/закрываются, 4 поля формы; пустой submit main даёт 3 ошибки валидации.
- 7.7: `sitemap-index.xml` и `robots.txt` main отдают 404; promo не индексируются через header/meta. Sitemap main отсутствует — отдельное SEO-улучшение, не блокер приёмки.
- 7.7: найден overflow `shkola-manikyura` на 280px; исправлены `min-w-0`/`break-words` в hero и `min-w-0` в тарифах; коммит `5675765`, workflow `43732040400` success, релиз `5675765-1`.

## Критерии приёмки

- [x] HTTP -> HTTPS, `www` -> apex.
- [x] Все три promo отдают 200 и noindex.
- [x] API возвращает `{"ok":true}`, сообщение приходит.
- [x] Rate limit даёт 429 с JSON.
- [x] После reboot сервисы активны.
- [x] `certbot renew --dry-run` проходит.
- [x] Секретов нет в git, CI-логах и ответах API.
- [x] Мобильная проверка пройдена; см. замечание про cookie-overlay и отсутствие sitemap main.

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
