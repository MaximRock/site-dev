# Этап 6. GitHub Actions

Статус: выполнен 2026-11-15. Первый workflow-деплой прошёл, релиз `fb5c6ac-1` активен.

Где: локально, GitHub, VPS.

Цель: после push в `main` сайт обновляется автоматически. CI заходит на VPS по отдельному SSH-ключу, без пароля и без root.

Предусловия:

- Этап 5 завершён: ручной деплой работает.
- В GitHub-репозитории есть права на secrets и Actions.
- На сервере есть пользователь `deploy` и sudoers из этапа 5.

Оценка: 30–60 минут.

## 6.1 Deploy-ключ

Локально:

```bash
ssh-keygen -t ed25519 -C "github-actions@style-logic" \
  -f ~/.ssh/style-logic-deploy -N ""

cat ~/.ssh/style-logic-deploy.pub \
  | ssh root@62.173.152.100 'install -d -m 700 -o deploy -g deploy /home/deploy/.ssh && tee -a /home/deploy/.ssh/authorized_keys >/dev/null && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys'
```

Проверка входа:

```bash
ssh -i ~/.ssh/style-logic-deploy deploy@62.173.152.100 'id'
```

Стоп-точка: вход работает. Если нет — GitHub Actions тоже не сможет задеплоить.

## 6.2 known_hosts

```bash
ssh-keyscan -H 62.173.152.100 > ~/.ssh/known_hosts.style-logic
ssh-keygen -lf ~/.ssh/known_hosts.style-logic
```

Сверить отпечаток с сервером:

```bash
ssh root@62.173.152.100 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
```

Стоп-точка: отпечатки совпали. Если нет — остановиться и разобраться.

## 6.3 Secrets GitHub

```bash
gh secret set DEPLOY_HOST --repo MaximRock/site-dev --body "62.173.152.100"
gh secret set DEPLOY_USER --repo MaximRock/site-dev --body "deploy"
gh secret set DEPLOY_SSH_KEY --repo MaximRock/site-dev < ~/.ssh/style-logic-deploy
gh secret set SSH_KNOWN_HOSTS --repo MaximRock/site-dev < ~/.ssh/known_hosts.style-logic

gh secret list --repo MaximRock/site-dev
```

Ожидаемо: четыре секрета. Значения не печатать.

## 6.4 Первый прогон

Перед коммитом проверить diff и убедиться, что в него не попали секреты и посторонние изменения:

```bash
git status
git diff --stat
git add <конкретные файлы>
git commit -m "Add VPS deployment setup"
git push github main
```

Запуск:

```bash
gh run list --repo MaximRock/site-dev --limit 5
gh run watch --repo MaximRock/site-dev
```

Или вручную: Actions -> `deploy` -> Run workflow (только ветка `main`).

## 6.5 Проверка релиза и симлинков

Проверка на сервере:

```bash
ls -1dt /srv/site/releases/*
readlink -f /srv/site/current
readlink -f /srv/www/promo/pekarnya
```

Ожидаемо: появился новый релиз `<sha>-<attempt>`, симлинки переключились.

## Фактическое выполнение

- Ключ `~/.ssh/style-logic-deploy` создан; публичная часть добавлена пользователю `deploy`; вход по ключу работает.
- `known_hosts` получен через `ssh-keyscan`; ed25519-отпечаток совпал с сервером.
- В GitHub четыре секрета: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `SSH_KNOWN_HOSTS`; значения не выводились.
- Коммит `fb5c6ac` отправлен в `github/main`; workflow run `43729148642` завершился успешно за 1m24s.
- Новый релиз: `fb5c6ac-1`; `current` и все три promo-симлинка переключены на него.
- Публичные проверки: apex 200, HTTP/www 301, все promo 200, API `{}` 400; `nginx -t` и сервисы в порядке.
- Сканирование логов Actions на приватный ключ, Telegram-секреты и токены — чисто.

## Критерии приёмки

- [x] `ssh -i ~/.ssh/style-logic-deploy deploy@...` работает.
- [x] Отпечаток `known_hosts` совпал.
- [x] В GitHub четыре секрета.
- [x] Workflow `deploy` завершился успешно.
- [x] После прогона `current` и promo-симлинки указывают на новый REV.
- [x] В логах Actions нет секретов.

## Откат

1. Отключить workflow или удалить ветку-триггер.
2. Вернуть предыдущий релиз вручную по этапу 9.
3. При компрометации ключа удалить публичную часть из `/home/deploy/.ssh/authorized_keys` и заменить `DEPLOY_SSH_KEY` в GitHub.
4. Не удалять старые релизы до успешной проверки нового.

## Артефакты

- `~/.ssh/style-logic-deploy` и `.pub`.
- `~/.ssh/known_hosts.style-logic`.
- Четыре GitHub-секрета.
- Workflow run `43729148642`; релиз `fb5c6ac-1`.
- Запись результатов в `STATUS.md`.
