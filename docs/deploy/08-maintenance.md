# Этап 8. Обслуживание

Статус: план. Не выполнен.

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

## 8.4 Бэкапы

- Снапшот VPS в панели провайдера: перед крупными изменениями и раз в месяц.
- Секреты `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` — в менеджере паролей; `/etc/site/site.env` не единственная копия.
- Код и конфиги деплоя восстанавливаются из GitHub.
- Сертификаты Let's Encrypt восстановимы через `certbot`; отдельный бэкап не нужен.
- Проверить, что снапшот действительно создаётся и доступен для восстановления.

## 8.5 Retention релизов и диск

- `activate-release.sh` оставляет 5 релизов main и 5 каждого promo.
- Проверять `du -sh /srv/site/releases/* | sort -h` и `du -sh /srv/www/releases/promo/*/* | sort -h`.
- При нехватке места: удалить старые релизы, `journalctl --vacuum-size=200M`, `apt clean`.
- Не удалять релиз, на который указывает `current` или promo-симлинк.

## 8.6 Мониторинг и алерты

Минимум:

- внешний uptime-check на `https://style-logic.ru/` и один promo;
- проверка `https://style-logic.ru/api/send-lead` с пустым телом (ожидать 400, не 5xx);
- уведомление в Telegram при падении.

Опционально:

- проверка срока сертификата;
- алерт по диску и памяти;
- проверка `systemctl --failed`.

## Критерии приёмки

- [ ] `unattended-upgrades` активен.
- [ ] journal ограничен 200M.
- [ ] Регулярные проверки описаны и выполняются.
- [ ] Бэкапы и снапшоты настроены.
- [ ] Retention релизов работает.
- [ ] Внешний uptime-check настроен.

## Откат

1. Изменения обслуживания не влияют на релиз; при ошибке вернуть предыдущие конфиги.
2. `systemctl restart systemd-journald` безопасен; при проблемах проверить `journalctl -u systemd-journald`.
3. При сбое автообновлений временно отключить `unattended-upgrades` и обновляться вручную.

## Артефакты

- `/etc/apt/apt.conf.d/20auto-upgrades`.
- `/etc/systemd/journald.conf.d/99-size.conf`.
- Запись в `STATUS.md`.
