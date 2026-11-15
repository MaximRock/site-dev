# Этап 8. Обслуживание

Статус: выполнен 2026-11-15, кроме ручного подтверждения 8.4.

Где: VPS `root@62.173.152.100`.

Цель: сервер сам ставит обновления безопасности, не забивает диск логами, сертификаты продлеваются, есть понятный план восстановления.

Предусловия:

- Этапы 1–7 завершены.
- Сайт работает по HTTPS.

Оценка: 20–30 минут.

## 8.1 Автообновления безопасности

`unattended-upgrades` уже установлен на этапе 1. Проверить и включить периодические обновления:

```bash
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable --now unattended-upgrades
systemctl status unattended-upgrades --no-pager
```

Ожидаемо: сервис активен, конфиг на месте.

Результат 2026-11-15: `/etc/apt/apt.conf.d/20auto-upgrades` уже содержал оба значения; `unattended-upgrades` — `enabled`, `active`; `apt list --upgradable` пуст. Изменений не потребовалось.

## 8.2 Ограничить journal

```bash
mkdir -p /etc/systemd/journald.conf.d

cat > /etc/systemd/journald.conf.d/99-size.conf <<'EOF'
[Journal]
SystemMaxUse=200M
EOF

systemctl restart systemd-journald
journalctl --disk-usage
```

Ожидаемо: размер journal в пределах 200M.

Результат 2026-11-15: создан `/etc/systemd/journald.conf.d/99-size.conf` с `SystemMaxUse=200M`; `systemd-journald` active; journal занимает 79.7M, `journalctl --vacuum-size=200M` освободил 0B. Лимит применён.

## 8.3 Регулярные проверки

Раз в месяц:

```bash
df -h /
free -h
systemctl --failed
journalctl -p err -n 50 --no-pager
fail2ban-client status sshd
certbot renew --dry-run --no-random-sleep-on-renew
```

Записывать результаты в `STATUS.md` или отдельный журнал.

Результат 2026-11-15:

- Диск: 5.3G из 40G, 15% занято, доступно 33G.
- RAM: 535Mi из 3.7Gi, swap 0 из 511Mi.
- `systemctl --failed`: пусто.
- `journalctl -p err`: только SSH-сканеры (`maximum authentication attempts`, `kex_*`, `Connection reset`) и `systemd-networkd-wait-online` timeouts; ошибок приложения нет.
- fail2ban sshd: 0 текущих failed, 4 всего failed, 1 всего banned, 0 текущих banned.
- `certbot renew --dry-run --no-random-sleep-on-renew`: `all simulated renewals succeeded`; сертификат до 2027-02-12.

## 8.4 Бэкапы

- Снапшот VPS в панели провайдера: перед крупными изменениями и раз в месяц.
- Секреты `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` — в менеджере паролей; `/etc/site/site.env` не единственная копия.
- Код и конфиги деплоя восстанавливаются из GitHub.
- Сертификаты Let's Encrypt восстановимы через `certbot`; отдельный бэкап не нужен.
- Проверить, что снапшот действительно создаётся и доступен для восстановления.

Результат 2026-11-15:

- [x] Код и конфиги: remote `github/main` на `180f2b7`; deploy-артефакты в GitHub.
- [x] Секреты: `/etc/site/site.env` — `600 root:root`, 2 ключа; значения не печатались.
- [x] Сертификат: `style-logic.ru` + `www`, ECDSA, действует до 2027-02-12; dry-run успешен; отдельный бэкап не нужен.
- [~] Снапшот VPS в панели Planetahost: из SSH-сессии не создаётся и не проверяется. По D12 снапшот `pre-bootstrap` уже был пропущен; для 8.4 нужно подтверждение заказчика.
- [~] Копия `TELEGRAM_*` в менеджере паролей: не проверялась.
- Offsite-инструменты `restic`/`borg`/`rclone` не установлены; внешнее восстановление пока зависит от снапшота провайдера.

## 8.5 Retention релизов и диск

- `activate-release.sh` оставляет 5 релизов main и 5 каждого promo.
- Проверять `du -sh /srv/site/releases/* | sort -h` и `du -sh /srv/www/releases/promo/*/* | sort -h`.
- При нехватке места: удалить старые релизы, `journalctl --vacuum-size=200M`, `apt clean`.
- Не удалять релиз, на который указывает `current` или promo-симлинк.

Результат 2026-11-15:

- Активен `180f2b7-1`; `current` и все три promo-симлинка указывают на него.
- Main: 4 релиза (188–203M каждый), promo: по 4 релиза (1.2–2.0M каждый); лимит 5 не превышен.
- `current` не удалён; старые релизы не трогались.
- `apt clean` выполнен, кэш 20K; диск 13%.
- Песочница `cleanup_releases`: из 6 каталогов оставлены 5 самых новых.

## 8.6 Мониторинг и алерты

Минимум:

- внешний uptime-check на `https://style-logic.ru/` и один promo;
- проверка `https://style-logic.ru/api/send-lead` с пустым телом (ожидать 400, не 5xx);
- уведомление в Telegram при падении.

Опционально:

- проверка срока сертификата;
- алерт по диску и памяти;
- проверка `systemctl --failed`.

Результат 2026-11-15:

- Серверный монитор: `deploy/monitor.sh` установлен в `/usr/local/sbin/style-logic-monitor`; units `style-logic-monitor.service` и `.timer`; таймер active/enabled, запуск каждые 5 минут. Проверяет main, `/promo/pekarnya/` и API с пустым телом; при ошибке отправляет Telegram-сообщение, состояние хранит в `/var/lib/style-logic-monitor/state`.
- Первый запуск сервиса упал с `226/NAMESPACE`, потому что `ReadWritePaths` требовал существующий каталог; исправлено через `StateDirectory=style-logic-monitor` + `StateDirectoryMode=0700`. Текущий запуск success, state `ok`; плановый запуск 20:33:36 MSK success.
- Внешний монитор: `.github/workflows/uptime.yml` запускается каждые 15 минут и вручную; проверяет main, promo и API (400). При падении создаёт GitHub issue, при восстановлении закрывает его. Ручной run `43741414243` — success за 6с.
- CI не получает Telegram-секреты; Telegram-алерт делает серверный монитор. При полной недоступности VPS внешний GitHub-монитор создаёт issue, но Telegram-сообщение с самого сервера не уйдёт.
- Actions обновлены: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/github-script@v9`; deploy run `43741416636` success за 2m16s, релиз `180f2b7-1`; Node.js 20 deprecation ушла, осталась только будущая миграция `ubuntu-latest` на Ubuntu 26.
- Failure-path монитора проверен с недоступным URL и фиктивным токеном: скрипт вернул 1 и залогировал `telegram alert failed`; реальное тестовое сообщение в Telegram не отправлялось.

## Критерии приёмки

- [x] `unattended-upgrades` активен.
- [x] journal ограничен 200M.
- [x] Регулярные проверки описаны и выполняются.
- [~] Бэкапы и снапшоты настроены: код/конфиги/сертификаты готовы; снапшот провайдера и менеджер паролей ждут подтверждения.
- [x] Retention релизов работает.
- [x] Внешний uptime-check настроен.

## Откат

1. Изменения обслуживания не влияют на релиз; при ошибке вернуть предыдущие конфиги.
2. `systemctl restart systemd-journald` безопасен; при проблемах проверить `journalctl -u systemd-journald`.
3. При сбое автообновлений временно отключить `unattended-upgrades` и обновляться вручную.
4. Монитор: `systemctl disable --now style-logic-monitor.timer`, затем удалить unit-файлы и `/usr/local/sbin/style-logic-monitor`; внешний workflow отключается удалением `.github/workflows/uptime.yml`.

## Артефакты

- `/etc/apt/apt.conf.d/20auto-upgrades`.
- `/etc/systemd/journald.conf.d/99-size.conf`.
- `deploy/monitor.sh`, `deploy/systemd/style-logic-monitor.service`, `deploy/systemd/style-logic-monitor.timer`.
- `.github/workflows/uptime.yml`.
- `/usr/local/sbin/style-logic-monitor`, `/etc/systemd/system/style-logic-monitor.*`, `/var/lib/style-logic-monitor/`.
- Запись в `STATUS.md`.
