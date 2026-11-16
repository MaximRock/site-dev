# Этап 9. Откат

Статус: выполнен 2026-11-16. 9.4 отложен вместе с 8.4.

Где: VPS `root@62.173.152.100`.

Цель: иметь проверенный план отката main, promo, конфигов и полного сервера. Учебный откат выполняется до того, как он понадобится в бою.

Предусловия:

- Этапы 1–8 завершены.
- Есть минимум два релиза main и promo.
- Для 9.4 нужен снапшот; 8.4 отложен, поэтому полный откат из снапшота не проверялся.

Оценка: 30–45 минут.

## 9.1 Откат main

```bash
ls -1dt /srv/site/releases/*
ln -sfn /srv/site/releases/<PREVIOUS_REV> /srv/site/current
systemctl restart style-logic
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4321/
```

Проверить, что `current` указывает на предыдущий релиз и сервис активен.

Для атомарной замены:

```bash
ln -s /srv/site/releases/<PREVIOUS_REV> /srv/site/current.tmp
mv -T /srv/site/current.tmp /srv/site/current
```

После `restart` health-check делать с повтором: одиночный `curl` сразу может вернуть `connection refused`, пока Node поднимается. В `activate-release.sh` уже есть 10 попыток с паузой 2с.

Результат 2026-11-16: переключение `180f2b7-1` → `5675765-1`, restart, health-check — 320мс; `current` указывал на предыдущий релиз, сайт 200. Затем возвращён `180f2b7-1`.

## 9.2 Откат promo

```bash
ln -s /srv/www/releases/promo/pekarnya/<PREVIOUS_REV> /srv/www/promo/pekarnya.tmp
mv -T /srv/www/promo/pekarnya.tmp /srv/www/promo/pekarnya

ln -s /srv/www/releases/promo/shkola-manikyura/<PREVIOUS_REV> /srv/www/promo/shkola-manikyura.tmp
mv -T /srv/www/promo/shkola-manikyura.tmp /srv/www/promo/shkola-manikyura

ln -s /srv/www/releases/promo/kofeynya/<PREVIOUS_REV> /srv/www/promo/kofeynya.tmp
mv -T /srv/www/promo/kofeynya.tmp /srv/www/promo/kofeynya
```

Проверить:

```bash
readlink -f /srv/www/promo/pekarnya
curl -sS -o /dev/null -w '%{http_code}\n' https://style-logic.ru/promo/pekarnya/
```

Результат 2026-11-16: все три promo переключены `180f2b7-1` → `5675765-1`, `nginx -t` и reload, все три URL 200 — 224мс. Затем возвращены `180f2b7-1`.

## 9.3 Откат конфигов

- nginx: вернуть `style-logic.conf.bak.<date>`, проверить `nginx -t`, выполнить `systemctl reload nginx`.
- systemd: вернуть предыдущий unit, `systemctl daemon-reload`, `systemctl restart style-logic`.
- sudoers: вернуть предыдущий файл, `visudo -cf`.
- SSH: не закрывать текущую сессию, пока новый вход не проверен; при необходимости удалить `00-style-logic.conf` и перезапустить ssh.

Результат 2026-11-16:

- Созданы свежие бэкапы с меткой `2026-11-16-1806`: nginx config, `style-logic.service`, `deploy-style-logic`, `00-style-logic.conf`.
- nginx: добавлен безвредный комментарий, `nginx -t` и reload, публичные URL 200; восстановление из бэкапа, `nginx -t` и reload, снова 200 — 424мс.
- systemd: комментарий в unit, `daemon-reload`, restart, health-check; восстановление из бэкапа, `daemon-reload`, restart, health-check — 1573мс.
- sudoers: `visudo -cf` — `parsed OK`.
- SSH: `sshd -t` — без ошибок; текущая сессия не закрывалась.
- Старый `style-logic.conf.bak.2026-11-14-202041` — это заглушка до первого деплоя, не рабочий production-конфиг. Для отката использовать свежий бэкап.

## 9.4 Полный откат из снапшота

1. Открыть панель провайдера.
2. Восстановить снапшот `pre-bootstrap` или последний рабочий.
3. После восстановления проверить SSH, nginx, сервис, сертификаты.
4. Учесть, что изменения после снапшота будут потеряны; секреты и конфиги должны быть в менеджере паролей/GitHub.

Результат 2026-11-16: `[-]` отложен вместе с 8.4. Снапшот `pre-bootstrap` недоступен, текущий снапшот не подтверждён; полный откат из снапшота не проверялся. Fallback — переустановка сервера. Обсудить 8.4 после общего плана.

## 9.5 Учебный откат

Выполнить на тестовом релизе:

1. Задеплоить тестовый релиз.
2. Переключиться на предыдущий main и promo.
3. Проверить `/`, API и promo.
4. Вернуть актуальный релиз.
5. Записать время выполнения и замечания в `STATUS.md`.

Стоп-точка: учебный откат выполнен без простоя дольше ожидаемого.

Результат 2026-11-16:

- Отдельный тестовый релиз не создавался; использован существующий предыдущий `5675765-1`.
- Первый прогон прервался: health-check сразу после restart получил `connection refused`; сработал trap, текущий релиз восстановлен. Это выявило необходимость retry.
- Повторный прогон с retry: main 320мс, promo 224мс, полный цикл с возвратом — 1353мс.
- Проверены `/`, API `{}` → 400, все promo 200; финальные симлинки — `180f2b7-1`; `style-logic`, nginx, fail2ban и monitor timer active.
- Простоя дольше ожидаемого не было.

## Критерии приёмки

- [x] Откат main проверен.
- [x] Откат promo проверен.
- [x] Откат конфигов проверен.
- [-] Полный откат из снапшота отложен вместе с 8.4; не проверялся.
- [x] Учебный откат выполнен.
- [x] Время отката зафиксировано: main 320мс, promo 224мс, полный цикл 1353мс.

## Артефакты

- Запись в `STATUS.md`.
- Предыдущий REV: `5675765-1`; актуальный: `180f2b7-1`.
- Бэкапы: `/etc/nginx/sites-available/style-logic.conf.bak.2026-11-16-1806`, `/etc/systemd/system/style-logic.service.bak.2026-11-16-1806`, `/etc/sudoers.d/deploy-style-logic.bak.2026-11-16-1806`, `/etc/ssh/sshd_config.d/00-style-logic.conf.bak.2026-11-16-1806`.
- Снапшоты провайдера: отложены вместе с 8.4.
