# План закрытия 8.4/9.4 без снапшотов

Статус: запланировано, не выполнено. Дата: 2026-11-16.

Где: VPS `root@62.173.152.100`; временный тестовый VPS выдаётся отдельно.

Цель: закрыть 8.4 и 9.4 без снапшотов провайдера, S3 и Ansible. Восстановление сервера — cold rebuild по shell-скриптам, GitHub и KeePassXC.

## 1. Решения

- Снапшотов у провайдера нет; 9.4 — не восстановление снапшота, а cold rebuild.
- S3 не используем.
- Ansible не используем; `ansible/` не создаём.
- SOPS оставляем установленным, но в этом плане не используем.
- Для архива используем `age` с существующим ключом `~/.config/sops/age/keys.txt`.
- KeePassXC — основное хранилище секретов.
- Локальная база и архивы: `~/backups/style-logic/`.
- Retention: 12 последних архивов.
- Тестовый VPS после проверки остановить; удалять только с отдельным подтверждением.
- Production во время подготовки и локальных проверок не изменять.

## 2. Итоговая схема

| Компонент | Роль |
| --- | --- |
| VPS | рабочая система |
| GitHub public | код, nginx/systemd/sudoers, docs |
| KeePassXC | Telegram-секреты, deploy-ключ, 2FA-коды провайдера, age-ключ |
| GitHub private `style-logic-vault` | зашифрованная база KeePassXC |
| Этот компьютер | age-архив конфигов + база KeePassXC |
| `deploy/bootstrap.sh` | пересборка чистого VPS |
| `deploy/verify.sh` | read-only проверка |
| 9.4 | cold rebuild на временном VPS |

Полного образа сервера не будет. Кода и БД на сервере нет: приложение восстанавливается из GitHub, promo — из сборок, сертификаты можно перевыпустить, секреты — из KeePassXC.

## 3. Локальное размещение

```text
~/backups/style-logic/
  vault/                  # git clone приватного репозитория
    style-logic.kdbx      # база KeePassXC
    README.md             # как открыть и восстановить, без секретов
  configs/
    2026-11-16.tar.gz.age
  restore/                # временная проверка, потом удаляется
```

Права: каталоги `700`, файлы `600`. В `~/projects/site-dev` секретов нет: репозиторий публичный. Диск этого компьютера не зашифрован, поэтому в `~/backups` только зашифрованные файлы.

`~/.config/sops/age/keys.txt` остаётся на месте; его копия кладётся в KeePassXC как вложение. В Git ключ не коммитить.

## 4. Этапы

### 4.1 Документация

Обновить:

- `docs/deploy/00-overview.md` — статус 8.4/9.4 и ссылка на этот план;
- `docs/deploy/01-bootstrap.md` — снапшот `[-]`, fallback cold rebuild;
- `docs/deploy/05-first-deploy.md` — fallback cold rebuild;
- `docs/deploy/08-maintenance.md` — 8.4 без снапшота;
- `docs/deploy/09-rollback.md` — 9.4 = cold rebuild;
- `docs/deploy/STATUS.md` — stage 9 `[~]`, 8.4 `[x]` после проверки, 9.4 `[ ]` до cold rebuild;
- `docs/deploy-runbook.md` — 8.4/9.4 без снапшотов.

Коммит с `[skip ci]`, чтобы не запускать deploy.

### 4.2 KeePassXC и age

1. Добавить в `/etc/nixos/configuration.nix`:

```nix
environment.systemPackages = with pkgs; [
  vim
  wget
  git
  keepassxc
  age
];
```

2. `sudo nixos-rebuild switch`.
3. Создать `~/backups/style-logic/vault/style-logic.kdbx`.
4. Задать сильный мастер-пароль; без key file. Бумажную копию пароля убрать отдельно.
5. Создать записи:
   - `Telegram` — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`;
   - `VPS deploy` — приватный ключ вложением;
   - `Provider` — логин и backup-коды 2FA;
   - `Age key` — вложение `keys.txt`.
6. Включить 2FA на GitHub и у провайдера.
7. Скопировать `.kdbx` в приватный GitHub-репозиторий `style-logic-vault`.
8. Проверить открытие копии из репозитория.

### 4.3 Шифрованный архив

Публичный ключ:

```bash
AGE_RECIPIENT="$(age-keygen -y ~/.config/sops/age/keys.txt)"
```

Бэкапить только конфиги и секреты:

```bash
ssh root@62.173.152.100 'tar -C / -czf - \
  etc/site etc/nginx \
  etc/systemd/system/style-logic.service \
  etc/systemd/system/style-logic-monitor.service \
  etc/systemd/system/style-logic-monitor.timer \
  etc/systemd/journald.conf.d \
  etc/sudoers.d/deploy-style-logic \
  etc/ssh/sshd_config.d/00-style-logic.conf \
  etc/hosts etc/letsencrypt \
  home/deploy/.ssh/authorized_keys' \
| age -r "$AGE_RECIPIENT" \
  -o ~/backups/style-logic/configs/$(date +%F).tar.gz.age
```

Не бэкапить `/srv/site/releases` и `/srv/www/releases`: они восстанавливаются из GitHub.

Проверка:

```bash
mkdir -p /tmp/style-logic-restore
age -d -i ~/.config/sops/age/keys.txt \
  ~/backups/style-logic/configs/2026-11-16.tar.gz.age \
| tar -C /tmp/style-logic-restore -xzf -
```

Сравнить хэши нескольких файлов с сервером, не печатая секреты, затем удалить `/tmp/style-logic-restore`.

Retention: после успешного архива оставлять 12 последних файлов; более старые удалять. Не удалять старые, пока новый архив не проверен.

### 4.4 Shell-скрипты

`deploy/bootstrap.sh`:

- только чистый VPS, запуск от root;
- отказывается работать, если уже есть `/srv/site/current`, без `--force`;
- `set -euo pipefail`, `umask 077`;
- swap 512M, timezone `Europe/Moscow`;
- пакеты, `deploy`, SSH, UFW, fail2ban, Node.js 22, nginx, certbot;
- конфиги nginx/systemd/sudoers/monitor из `deploy/`;
- `/etc/site` с `0700`, но без `site.env`;
- `/etc/hosts` с Telegram IP;
- monitor timer по умолчанию не включает;
- не деплоит приложение;
- идемпотентен.

`deploy/verify.sh`:

- read-only;
- проверяет `current`, promo-симлинки, сервисы, локальный 200, API 400, публичные URL, monitor state, сертификат, диск;
- возвращает ненулевой код при ошибке.

`ops/backup-configs.sh`:

- делает age-архив;
- проверяет, что архив читается;
- применяет retention 12.

`ops/restore-test.sh`:

- расшифровывает в `/tmp`;
- проверяет наличие ключевых файлов;
- не печатает секреты;
- удаляет временный каталог.

`Makefile`:

```make
verify:
	./deploy/verify.sh

backup:
	./ops/backup-configs.sh

restore-test:
	./ops/restore-test.sh

lint:
	bash -n deploy/*.sh ops/*.sh
```

Проверки: `bash -n`, `shellcheck` через `nix shell nixpkgs#shellcheck`.

### 4.5 Локальная проверка

- [ ] `make verify` против production — только чтение.
- [ ] `make backup` — первый архив.
- [ ] `make restore-test` — восстановление в `/tmp`.
- [ ] Открыть копию KeePassXC из приватного репозитория.
- [ ] Проверить, что секретов нет в `git diff`, логах и архиве без ключа.
- [ ] `STATUS.md`: 8.4 `[x]`, 9.4 `[ ]`, stage 9 `[~]`.
- [ ] Коммит с `[skip ci]`.

### 4.6 Cold rebuild

Тестовый VPS проверен read-only: Ubuntu 24.04.5, 1 vCPU, 961 MiB RAM, 8.7G диск, 6.3G свободно, swap 0, nginx/Node/certbot нет, UFW выключен, timezone UTC. IP в публичный репозиторий не записывается.

1. Скопировать на VPS репозиторий без `node_modules`, `dist`, `.git`.
2. Запустить `deploy/bootstrap.sh`; повторить второй раз для проверки идемпотентности.
3. Проверить swap 512M и timezone `Europe/Moscow`.
4. Восстановить `/etc/site/site.env` из KeePassXC вручную; `chmod 600`, `chown root:root`.
5. Восстановить `/etc/letsencrypt` из age-архива или использовать self-signed.
6. Разложить полный nginx-конфиг, `nginx -t`, reload.
7. Скопировать релиз `180f2b7-1` с production через `rsync`; не собирать на VPS.
8. Активировать релиз, запустить `style-logic`.
9. Monitor timer не включать, чтобы не спамить Telegram.
10. Проверить `verify.sh`, main/promo/API, HTTPS через `curl --resolve` или `-k`.
11. Записать время, ошибки и отличия от docs.
12. Остановить сервисы. VPS не удалять без отдельного подтверждения.
13. Обновить docs/STATUS: 9.4 `[x]`, stage 9 `[x]`; коммит с `[skip ci]`.

Если cold rebuild не пройдёт — 9.4 `[!]`, разбор, не ставить `[x]`.

## 5. Критерии приёмки

- [ ] 8.4: KeePassXC создан, записи заполнены, 2FA включена, приватная копия открывается.
- [ ] 8.4: age-ключ сохранён в KeePassXC; архив создан и восстановление проверено.
- [ ] 8.4: секреты не в Git/CI/логах; `site.env` только на сервере и в KeePassXC.
- [ ] 8.4: снапшот помечен `[-]`, не используется как критерий.
- [ ] 9.4: cold rebuild на временном VPS проходит, `verify.sh` зелёный.
- [ ] 9.4: повторный `bootstrap.sh` не меняет систему.
- [ ] 9.4: время восстановления зафиксировано.
- [ ] Production не изменялся во время проверок.

## 6. Риски

| Риск | Мера |
| --- | --- |
| Потерян мастер-пароль KeePassXC | бумажная копия в отдельном месте |
| Потерян age-ключ | копия `keys.txt` в KeePassXC |
| Умер этот компьютер | GitHub + приватный vault + age-ключ в KeePassXC |
| Секреты в Git/логах | `umask 077`, не печатать значения, проверять diff |
| `bootstrap.sh` на production | отказ без `--force`; запускать только на temp |
| OOM на 1 ГБ VPS | swap 512M; не собирать приложение на VPS |
| Монитор спамит | timer на temp не включать |
| TLS/DNS на temp | `curl --resolve`/`-k`; DNS production не менять |

## 7. Текущий статус

- 8.4: не закрыт; план выше.
- 9.1–9.3, 9.5: выполнены 2026-11-16.
- 9.4: ожидает cold rebuild на временном VPS.
- Stage 9: `[~]`, пока 9.4 не проверен.
