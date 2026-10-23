export const CONTACTS = {
  phone: "+7 (929) 819-19-93",
  phoneUrl: "tel:+79298191993",
  telegram: "https://t.me/irinagerasimenkorrrr",
  telegramBot: "https://t.me/style_logic_studio_bot",
  email: "styleandlogic@yandex.ru",
  emailUrl: "mailto:styleandlogic@yandex.ru",
  whatsapp: "https://wa.me/79298191993",
  max: "https://max.ru/u/f9LHodD0cOIIBL1KQ1CBJGryu0p0sDA_Pt5v3vGcgfXaceNmPhSoPjt8lQ8",
};

export const CHANNELS = {
  telegram: "https://t.me/designpluscode1",
  max: "https://max.ru/join/fASMCoOMGHtI0WBZyUauHyVFumeeEil5998Vgtp0W0E",
};

export const CHECKLIST = {
  url: "/checklist.docx",
};

export const SITE = {
  demoMode: false,
  metrikaId: 44147844,
};

export const COOKIE_CONSENT = {
  enabled: true,
  storageKey: "sl-cookie-consent",
  text: "Мы используем cookie и Яндекс.Метрику, чтобы анализировать посещаемость и улучшать сайт. Подробнее — в",
  policyLabel: "политике конфиденциальности",
  policyHref: "/privacy",
  acceptAllLabel: "Принять все",
  rejectAllLabel: "Только необходимые",
  customizeLabel: "Настроить",
  saveLabel: "Сохранить выбор",
  categories: [
    {
      id: "necessary",
      title: "Необходимые",
      text: "Нужны для работы сайта: запоминают ваш выбор. Их нельзя отключить.",
      required: true,
    },
    {
      id: "analytics",
      title: "Аналитика",
      text: "Яндекс.Метрика: считает посещения, источники и клики, помогает улучшать сайт.",
      required: false,
    },
    {
      id: "webvisor",
      title: "Вебвизор",
      text: "Записывает сессию: движения и клики по странице. Помогает находить неудобные места.",
      required: false,
    },
  ],
};

export const NAV = [
  { label: "Услуги", href: "/#services" },
  { label: "Кейсы", href: "/#cases" },
  { label: "Как работаем", href: "/#process" },
  { label: "О нас", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
  { label: "Контакты", href: "/#contacts" },
];

export const NAV_DESKTOP = [
  { label: "Услуги", href: "/#services" },
  { label: "Кейсы", href: "/#cases" },
  { label: "Как работаем", href: "/#process" },
];

export const SERVICES = [
  {
    title: "Лендинг",
    text: "Один экран за другим ведут посетителя к целевому действию.",
   适合: "услуги / эксперты / продукты / реклама",
    price: "от 15 000 ₽",
    cta: "Обсудить лендинг",
    popular: false,
  },
  {
    title: "Сайт-визитка",
    text: "Компактное представление специалиста или компании.",
   适合: "услуги / специалисты / небольшие компании",
    price: "от 20 000 ₽",
    cta: "Обсудить проект",
    popular: false,
  },
  {
    title: "Многостраничный",
    text: "Полноценное представление компании, услуг и направлений.",
   适合: "компании / несколько услуг / каталоги",
    price: "от 25 000 ₽",
    cta: "Обсудить проект",
    popular: true,
  },
  {
    title: "Индивидуальный",
    text: "Когда нужен нестандартный функционал.",
   适合: "сервисы / интеграции / сложные интерфейсы",
    price: "индивидуально",
    cta: "Обсудить задачу",
    popular: false,
  },
];

export const MISTAKES_CARDS = [
  { num: "01", text: "Посетитель не понимает предложение" },
  { num: "02", text: "Сайт не объясняет преимущества" },
  { num: "03", text: "Нет понятного пути к заявке" },
  { num: "04", text: "С мобильного неудобно пользоваться" },
  { num: "05", text: "Сайт похож на сайты конкурентов" },
  { num: "06", text: "Реклама приводит людей, но они не оставляют заявку" },
];

export const APPROACH_STEPS = [
  { num: "01", title: "Аудитория", text: "Кто ваш клиент и что для него важно?" },
  { num: "02", title: "Оффер", text: "Что именно вы предлагаете и почему должны выбрать вас?" },
  { num: "03", title: "Структура", text: "Как провести посетителя от первого экрана до заявки?" },
  { num: "04", title: "Конверсия", text: "Где и как человек должен совершить действие?" },
];

export const PLATFORMS = {
  tilda: {
    title: "Tilda",
    text: "Когда важны скорость запуска и разумный бюджет.",
    points: ["лендинги", "услуги", "эксперты", "небольшие компании", "рекламные кампании"],
    cta: "Хочу сайт на Tilda",
  },
  code: {
    title: "Индивидуальный код",
    text: "Когда нужен нестандартный функционал.",
    points: ["сложные интерфейсы", "интеграции", "веб-сервисы", "нестандартные решения"],
    cta: "Обсудить разработку",
  },
};

export const CASES = [
  {
    slug: "shkola-manikyura",
    title: "Сайт для школы маникюра",
    niche: "Школа маникюра",
    type: "Лендинг",
    siteUrl: "",
    desktop: [
      "/cases/shkola-manikyura/desktop-1.webp",
      "/cases/shkola-manikyura/desktop-2.webp",
      "/cases/shkola-manikyura/desktop-3.webp",
      "/cases/shkola-manikyura/desktop-4.webp",
    ],
    mobile: [
      "/cases/shkola-manikyura/mobile-1.webp",
      "/cases/shkola-manikyura/mobile-2.webp",
      "/cases/shkola-manikyura/mobile-3.webp",
      "/cases/shkola-manikyura/mobile-4.webp",
    ],
    description:
      "Дизайн построен на контрасте светлого и тёмного: тёплый кремовый фон, белые карточки, глубокий чёрный текст — и главный акцент, благородное золото в кнопках, иконках и тонких линиях с мягким свечением. Заголовки набраны элегантным шрифтом с засечками Playfair Display, основной текст — лёгким Inter. На сайте предусмотрена тёмная тема: глубокий чёрный фон с тем же золотым акцентом. В целом язык дизайна — дорогой, спокойный, «ювелирный», как и подобает beauty-школе.",
    cta: "Хочу такой же подход для своего бизнеса",
  },
  {
    slug: "kofeynya",
    title: "Сайт для кофейни",
    niche: "Кофейня",
    type: "Сайт с онлайн-меню",
    siteUrl: "",
    desktop: [
      "/cases/kofeynya/desktop-1.webp",
      "/cases/kofeynya/desktop-2.webp",
      "/cases/kofeynya/desktop-3.webp",
      "/cases/kofeynya/desktop-4.webp",
    ],
    mobile: [
      "/cases/kofeynya/mobile-1.webp",
      "/cases/kofeynya/mobile-2.webp",
      "/cases/kofeynya/mobile-3.webp",
      "/cases/kofeynya/mobile-4.webp",
    ],
    description:
      "Дизайн в духе бумажного постера: светлый фон цвета бумаги, почти чёрные «чернила» текста, хвойно-зелёный и сочный бруснично-красный в кнопках и акцентах. Заголовки набраны широким характерным шрифтом Unbounded, основной текст — аккуратным Golos Text, а цены и пометки в меню — моноширинным, как в печатном бланке. Блюда в меню разделены пунктирными линиями, а фирменные штампы добавляют живости. В целом — тёплая «афиша» с характером, которая сразу отличает кофейню от шаблонных сайтов.",
    cta: "Хочу такой же подход для своего бизнеса",
  },
];

export const REVIEWS = [
  {
    text: "Сайт стал удобнее, ученики сразу видят все курсы и могут записаться.",
    author: "Александра Михайленко",
    meta: "Клиент школы маникюра",
  },
];

export const ADVANTAGES = [
  { title: "Общение напрямую", text: "Без длинной цепочки менеджеров." },
  { title: "Дизайн + разработка", text: "Не нужно искать разных исполнителей." },
  { title: "Фиксированная стоимость", text: "Согласовываем состав проекта заранее." },
  { title: "Понятный процесс", text: "Вы понимаете, что происходит на каждом этапе." },
  { title: "Поддержка после запуска", text: "Сайт можно развивать и дорабатывать." },
  { title: "Честная рекомендация", text: "Если новый сайт вам сейчас не нужен — скажем об этом." },
];

export const PROCESS_STEPS = [
  {
    num: "01",
    title: "Разбираемся",
    text: "Обсуждаем бизнес, продукт, аудиторию и задачу сайта.",
  },
  {
    num: "02",
    title: "Формируем решение",
    text: "Определяем структуру, страницы, функционал и точки конверсии.",
  },
  {
    num: "03",
    title: "Создаём прототип",
    text: "Выстраиваем будущий сайт до полноценного дизайна.",
  },
  {
    num: "04",
    title: "Делаем дизайн",
    text: "Создаём визуальную концепцию и адаптацию.",
  },
  {
    num: "05",
    title: "Разрабатываем",
    text: "Собираем сайт, формы, домен, аналитику и необходимые сервисы.",
  },
  {
    num: "06",
    title: "Запускаем",
    text: "Тестируем, публикуем и передаём готовый проект.",
  },
];

export const WHAT_YOU_GET = [
  "Анализ задачи",
  "Структура сайта",
  "Прототип",
  "Дизайн",
  "Мобильная адаптация",
  "Разработка",
  "Формы",
  "Подключение домена",
  "SSL",
  "Аналитика",
  "Тестирование",
  "Публикация",
];

export const LEAD_MAGNET_ERRORS = [
  "Нет понятного предложения.",
  "Первый экран не отвечает на вопрос «что вы предлагаете?»",
  "Слишком много текста.",
  "Нет понятного CTA.",
  "Не продумана мобильная версия.",
  "Нет доказательств доверия.",
  "Не отслеживаются действия посетителей.",
];

export const DIAGNOSIS_POINTS = [
  "вашу задачу",
  "целевую аудиторию",
  "подходящий формат сайта",
  "необходимые блоки",
  "ориентировочную стоимость",
  "что можно улучшить в существующем сайте",
];

export const FAQ = [
  {
    q: "Сколько стоит сайт?",
    a: "Лендинг — от 15 000 ₽. Многостраничный сайт — от 25 000 ₽. Итоговая стоимость зависит от структуры, количества страниц и функционала.",
  },
  {
    q: "Сколько занимает разработка?",
    a: "От 7 дней. Точный срок зависит от объёма проекта и фиксируется до начала работы.",
  },
  {
    q: "Что входит в стоимость?",
    a: "В зависимости от проекта: структура, прототип, дизайн, адаптация, разработка, формы, подключение домена, SSL, аналитика, тестирование и публикация.",
  },
  {
    q: "Можно ли сделать сайт на Tilda?",
    a: "Да. Если Tilda оптимальна для вашей задачи, мы предложим этот вариант.",
  },
  {
    q: "А если нужен индивидуальный функционал?",
    a: "Рассмотрим индивидуальную разработку. Сначала определяем задачу, затем выбираем технологию.",
  },
  {
    q: "Можно ли заказать только дизайн?",
    a: "Да. Формат работы обсуждается в зависимости от проекта.",
  },
  {
    q: "Помогаете ли вы после запуска?",
    a: "Да. Можно заказать доработки, поддержку и дальнейшее развитие сайта.",
  },
  {
    q: "Можно ли заказать сайт, если нет готовых текстов?",
    a: "Да. На консультации определим, какие материалы необходимы и что можно подготовить в рамках проекта.",
  },
];

export const TEAM = [
  {
    name: "Ирина",
    role: "UX/UI-дизайнер",
    focus: ["структура", "пользовательский путь", "визуальная концепция", "интерфейс", "конверсионные блоки"],
  },
  {
    name: "Максим",
    role: "Frontend-разработчик",
    focus: ["разработка", "адаптивность", "функционал", "интеграции", "техническая реализация"],
  },
];

export const CALCULATOR_TYPES = [
  { value: "landing", label: "Лендинг" },
  { value: "visitka", label: "Сайт-визитка" },
  { value: "multipage", label: "Многостраничный" },
  { value: "shop", label: "Интернет-магазин" },
  { value: "custom", label: "Индивидуальный проект" },
  { value: "unknown", label: "Не знаю" },
];

export const CALCULATOR_PAGES = [
  { value: "1", label: "1" },
  { value: "2-5", label: "2–5" },
  { value: "6-10", label: "6–10" },
  { value: "10+", label: "10+" },
];

export const CALCULATOR_DESIGN = [
  { value: "ready", label: "По готовой структуре" },
  { value: "custom", label: "Индивидуальный дизайн" },
];

export const CALCULATOR_FEATURES = [
  { value: "forms", label: "Формы" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "crm", label: "CRM" },
  { value: "analytics", label: "Аналитика" },
  { value: "catalog", label: "Каталог" },
  { value: "integrations", label: "Интеграции" },
  { value: "other", label: "Другое" },
];

export const FORM_OPTIONS = [
  { value: "new", label: "Новый сайт" },
  { value: "redesign", label: "Переделать существующий" },
  { value: "landing", label: "Лендинг" },
  { value: "multipage", label: "Многостраничный сайт" },
  { value: "custom", label: "Индивидуальная разработка" },
  { value: "checklist", label: "Скачать чек-лист" },
  { value: "unknown", label: "Пока не знаю" },
];

// ── Temporary aliases (to be removed after component rewrites in Step 2) ──

export const DIRECTIONS = SERVICES;

export const MISTAKES = [
  { title: "Ошибка №1", text: "Посетитель не понимает предложение." },
  { title: "Ошибка №2", text: "Сайт не объясняет преимущества." },
  { title: "Ошибка №3", text: "Нет понятного пути к заявке." },
  { title: "Ошибка №4", text: "С мобильного неудобно пользоваться." },
  { title: "Ошибка №5", text: "Сайт похож на сайты конкурентов." },
  { title: "Ошибка №6", text: "Реклама приводит людей, но они не оставляют заявку." },
];

export const STEPS = PROCESS_STEPS;

export const LC_TABLE_ROWS = [
  { label: "Общение напрямую", we: "yes", agency: "no", freelance: "yes" },
  { label: "Дизайнер + разработчик", we: "yes", agency: "yes", freelance: "partial" },
  { label: "Фиксированная стоимость", we: "yes", agency: "yes", freelance: "partial" },
  { label: "Договор", we: "yes", agency: "yes", freelance: "partial" },
  { label: "Поддержка после запуска", we: "yes", agency: "partial", freelance: "partial" },
];

export const LEGAL_POINTS = [
  { title: "Лицензии на изображения", text: "Используем только легальные стоковые изображения." },
  { title: "Лицензии на шрифты", text: "Подключаем шрифты с корректной лицензией." },
  { title: "Политика конфиденциальности", text: "Раздел будет оформлен в ближайшее время." },
  { title: "Соответствие ФЗ-152", text: "Требования к персональным данным учитываем." },
];

export const QUIZ_RECOMMENDATIONS = {
  landing: "Подойдет для одного продукта, услуги или рекламной кампании.",
  visitka: "Подойдет для презентации специалиста или небольшой компании.",
  multipage: "Подойдет для компании с несколькими направлениями и услугами.",
  unknown: "Разберем задачи бизнеса и предложим подходящий формат.",
};
