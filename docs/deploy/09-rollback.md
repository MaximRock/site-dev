# Этап 9. Откат

Статус: план. Не выполнен.

Где: VPS `root@62.173.152.100`.

Цель: иметь проверенный план отката main, promo, конфигов и полного сервера. Учебный откат выполняется до того, как он понадобится в бою.

Предусловия:

- Этапы 1–8 завершены.
- Есть минимум два релиза main и promo.
- Есть снапшот `pre-bootstrap` и текущий снапшот.

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

## 9.3 Откат конфигов

- nginx: вернуть `style-logic.conf.bak.<date>`, проверить `nginx -t`, выполнить `systemctl reload nginx`.
- systemd: вернуть предыдущий unit, `systemctl daemon-reload`, `systemctl restart style-logic`.
- sudoers: вернуть предыдущий файл, `visudo -cf`.
- SSH: не закрывать текущую сессию, пока новый вход не проверен; при необходимости удалить `00-style-logic.conf` и перезапустить ssh.

## 9.4 Полный откат из снапшота

1. Открыть панель провайдера.
2. Восстановить снапшот `pre-bootstrap` или последний рабочий.
3. После восстановления проверить SSH, nginx, сервис, сертификаты.
4. Учесть, что изменения после снапшота будут потеряны; секреты и конфиги должны быть в менеджере паролей/GitHub.

## 9.5 Учебный откат

Выполнить на тестовом релизе:

1. Задеплоить тестовый релиз.
2. Переключиться на предыдущий main и promo.
3. Проверить `/`, API и promo.
4. Вернуть актуальный релиз.
5. Записать время выполнения и замечания в `STATUS.md`.

Стоп-точка: учебный откат выполнен без простоя дольше ожидаемого.

## Критерии приёмки

- [ ] Откат main проверен.
- [ ] Откат promo проверен.
- [ ] Откат конфигов проверен.
- [ ] Полный откат из снапшота описан и доступен.
- [ ] Учебный откат выполнен.
- [ ] Время отката зафиксировано.

## Артефакты

- Запись в `STATUS.md`.
- Список предыдущих REV.
- Бэкапы конфигов.
- Снапшоты провайдера.
