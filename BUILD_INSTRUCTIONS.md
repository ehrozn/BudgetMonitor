# Инструкция: Сборка Android APK через GitHub Actions

## Шаг 1: Создайте аккаунт Expo

1. Перейдите на https://expo.dev/
2. Зарегистрируйтесь или войдите
3. Создайте новый проект (или используйте существующий)

## Шаг 2: Получите Expo Access Token

1. Откройте https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Нажмите "Create Token"
3. Дайте имя токену (например, "GitHub Actions")
4. Скопируйте созданный токен

## Шаг 3: Настройте GitHub Repository

1. Создайте новый репозиторий на GitHub
2. Перейдите в Settings → Secrets and variables → Actions
3. Нажмите "New repository secret"
4. Имя: `EXPO_TOKEN`
5. Значение: вставьте скопированный токен из Expo
6. Нажмите "Add secret"

## Шаг 4: Загрузите код в GitHub

Выполните команды в терминале:

```bash
# Инициализируйте git (если ещё не сделали)
git init

# Добавьте все файлы
git add .

# Создайте коммит
git commit -m "Initial commit"

# Добавьте удалённый репозиторий (замените YOUR_USERNAME и YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Отправьте код
git branch -M main
git push -u origin main
```

## Шаг 5: Запустите сборку

### Автоматически:
- Сборка запустится автоматически при каждом push в ветку main/master

### Вручную:
1. Перейдите на GitHub в ваш репозиторий
2. Откройте вкладку "Actions"
3. Выберите workflow "Build Android APK"
4. Нажмите "Run workflow"
5. Выберите ветку и нажмите "Run workflow"

## Шаг 6: Скачайте APK

1. Дождитесь завершения сборки (обычно 10-15 минут)
2. Откройте завершённый workflow
3. Прокрутите вниз до секции "Artifacts"
4. Скачайте "android-apk"

## Альтернативный метод: Локальная сборка через EAS

Если хотите собрать локально:

```bash
# Установите EAS CLI
npm install -g eas-cli

# Войдите в Expo
eas login

# Настройте проект
eas build:configure

# Соберите APK
eas build --platform android --profile preview
```

## Примечания

- **Первая сборка** может занять до 20 минут
- **Последующие сборки** будут быстрее благодаря кэшированию
- APK будет доступен для скачивания в течение 30 дней
- Для production сборки используйте профиль `production` вместо `preview`

## Troubleshooting

### Ошибка "EXPO_TOKEN not found"
- Проверьте, что вы добавили secret в настройках репозитория
- Убедитесь, что имя secret точно `EXPO_TOKEN`

### Ошибка сборки
- Проверьте логи в GitHub Actions
- Убедитесь, что все зависимости установлены корректно
- Проверьте, что `app.json` и `eas.json` настроены правильно

### APK не создаётся
- Проверьте, что в `eas.json` указан `"buildType": "apk"`
- Для AAB (Google Play) используйте `"buildType": "aab"`
