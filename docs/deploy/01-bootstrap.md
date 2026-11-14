# Этап 1. Bootstrap VPS

Статус: выполнен 2026-11-14 (без снапшота, по решению заказчика).

Где: VPS, `root@62.173.152.100`.

Цель: подготовить чистый Ubuntu 24.04 к деплою: обновления, пакеты, пользователь `deploy`, SSH по ключам, UFW, fail2ban, Node.js 22, nginx.

Предусловия:

- Снапшот `pre-bootstrap` создан в панели провайдера.
- Вход `ssh root@62.173.152.100` по ключу работает.
- Текущая root-сессия не закрывается до проверки нового входа.

Оценка: 30–45 минут плюс возможный reboot.

## 1.1 Снапшот

Действие в панели провайдера: создать снапшот с именем `pre-bootstrap`.

Стоп-точка: снапшот виден в панели. Без него дальше не идти.

Отклонение 2026-11-14: снапшот недоступен; по решению заказчика этап выполняется без него. Fallback — переустановка сервера. Отклонение зафиксировано в `STATUS.md`.

## 1.2 Зафиксировать инвентарь

Записать в `STATUS.md`:

- дату и время начала;
- вывод `hostnamectl`, `free -h`, `df -h /`, `swapon --show`;
- состояние `ufw status`, `ss -tulpn`;
- версии `node -v`, `nginx -v`, `certbot --version`.

Ожидаемо: Ubuntu 24.04.4, 3.7 GiB RAM, 40 GB SSD, swap 512M, открыт только 22.

## 1.3 Обновление и пакеты

```bash
export DEBIAN_FRONTEND=noninteractive

apt update
apt -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" full-upgrade

apt -y install \
  curl ca-certificates gnupg dnsutils ufw fail2ban python3-systemd rsync \
  nginx certbot python3-certbot-nginx git htop unzip jq

timedatectl
```

Пояснения:

- `unattended-upgrades` уже установлен; отдельно ставить не нужно.
- Timezone уже `Europe/Moscow`; `set-timezone` не требуется.
- `full-upgrade` может обновить ядро; reboot проверяется в 1.10.

Ожидаемо: установка завершилась без ошибок, `timedatectl` показывает `Europe/Moscow`.

## 1.4 Swap

Ничего не менять. Проверить:

```bash
swapon --show
free -h
grep '^/swapfile ' /etc/fstab
```

Ожидаемо: `/swapfile` 512M, строка в fstab есть. Решение D11: 512M достаточно при 3.7 GiB RAM.

## 1.5 Пользователь deploy

```bash
adduser --disabled-password --gecos "" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

Проверить вход из второго терминала, не закрывая текущую root-сессию:

```bash
ssh deploy@62.173.152.100 'id'
```

Стоп-точка: вход `deploy` по ключу работает. Если нет — SSH-настройки в 1.6 не менять.

## 1.6 Ужесточение SSH

```bash
cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F)

cat > /etc/ssh/sshd_config.d/00-style-logic.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF

sshd -t
systemctl reload ssh
```

Проверить эффективные значения:

```bash
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries) '
```

Ожидаемо: `permitrootlogin prohibit-password`, `passwordauthentication no`, `maxauthtries 3`.

Важно: файл `00-` читается раньше `50-cloud-init.conf`, поэтому переопределяет `PasswordAuthentication yes`.

Стоп-точка: проверить вход root и deploy по ключу из второго терминала. Текущую root-сессию не закрывать, пока проверка не пройдена.

## 1.7 UFW

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status verbose
```

Ожидаемо: разрешены 22, 80, 443; входящие по умолчанию запрещены.

Стоп-точка: после включения UFW SSH-сессия не рвётся, новый вход работает.

## 1.8 fail2ban

```bash
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
EOF

systemctl enable --now fail2ban
fail2ban-client status
fail2ban-client status sshd
```

Ожидаемо: jail `sshd` активен, есть поля `Currently banned` и `Total banned`.

## 1.9 Node.js 22

```bash
install -d -m 0755 /etc/apt/keyrings

curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list

apt update
apt -y install nodejs

node -v
npm -v
```

Ожидаемо: Node.js `>=22.12.0`.

## 1.10 Финальная проверка и reboot

```bash
node -v
npm -v
nginx -v
certbot --version
rsync --version | head -1
free -h
swapon --show
systemctl is-active nginx fail2ban
ufw status

[ -f /var/run/reboot-required ] && reboot || echo "reboot not required"
```

Если reboot нужен, выполнять только после подтверждения заказчика. После переподключения:

```bash
uptime
free -h
swapon --show
systemctl is-active nginx fail2ban
ufw status
ss -tulpn | grep -E ':(80|443|22)\b' || true
```

Ожидаемо: все сервисы `active`, swap виден, UFW включает 22/80/443.

## Критерии приёмки

- [-] Снапшот `pre-bootstrap` создан: пропущен по решению заказчика, fallback — переустановка сервера.
- [x] `deploy` и root входят по ключу.
- [x] `sshd -T` показывает `passwordauthentication no`.
- [x] `ufw status` показывает 22, 80, 443.
- [x] `fail2ban-client status sshd` работает.
- [x] `node -v` >= 22.12.0.
- [x] `nginx -v` и `certbot --version` отвечают.
- [x] swap включён и виден в `free -h`.
- [x] После reboot сервисы и SSH работают.

## Откат

1. Открыть консоль VPS в панели провайдера.
2. При потере SSH удалить override и вернуть доступ:

```bash
rm -f /etc/ssh/sshd_config.d/00-style-logic.conf
sshd -t
systemctl restart ssh
```

3. При проблемах с UFW: `ufw disable`.
4. Полный откат: восстановить снапшот `pre-bootstrap`.
5. Не закрывать текущую сессию, пока новый вход не проверен.

## Артефакты

- Запись инвентаря и результатов в `STATUS.md`.
- `sshd_config.bak.<date>` на сервере.
- `/etc/ssh/sshd_config.d/00-style-logic.conf`.
- `/etc/fail2ban/jail.local`.
- `/etc/apt/sources.list.d/nodesource.list`.
