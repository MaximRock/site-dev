export const site = {
  name: "Тёплый Уголок",
  legalName: "Пекарня «Тёплый Уголок»",
  title: "Тёплый Уголок. Пекарня на закваске в Москве",
  slogan: "Здесь пахнет уютом.",
  description:
    "Хлеб на закваске, выпечка и завтраки на Столярном переулке. Заберите заказ в пекарне ежедневно с 08:00 до 21:00.",
  url: import.meta.env.SITE ?? "https://style-logic.ru",
  locale: "ru_RU",
  city: "Москва",
  address: {
    street: "Столярный переулок, 7",
    district: "Басманный район",
    postalCode: "107031",
  },
  metro: {
    station: "Чистые пруды",
    walk: "7 минут пешком",
  },
  phone: {
    label: "+7 999 123-45-67",
    href: "tel:+79991234567",
  },
  email: {
    label: "hello@teply-ugolok.example",
    href: "mailto:hello@teply-ugolok.example",
  },
  telegram: {
    label: "@teply_ugolok",
    href: "https://t.me/teply_ugolok",
  },
  mapsUrl:
    "https://yandex.ru/maps/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D0%A1%D1%82%D0%BE%D0%BB%D1%8F%D1%80%D0%BD%D1%8B%D0%B9%20%D0%BF%D0%B5%D1%80%D0%B5%D1%83%D0%BB%D0%BE%D0%BA%2C%207",
  hours: {
    daily: "Ежедневно с 08:00 до 21:00",
    bread: "Хлеб с 07:30",
    note: "Если хлеб закончился раньше, напишите нам: подскажем, когда будет следующий.",
  },
  pickup: {
    label: "Самовывоз",
    note: "Забирайте в пекарне на Столярном. Доставки нет.",
    payment: "Оплата при получении.",
  },
  preorder: {
    days: 7,
    maxQuantity: 20,
    lead: "Заказ на завтра и на неделю вперёд.",
    slots: [
      "08:00-10:00",
      "10:00-12:00",
      "12:00-14:00",
      "14:00-16:00",
      "16:00-18:00",
      "18:00-20:00",
    ],
  },
  studio: {
    name: "Style | Logic",
    url: "",
  },
  demoNote: "Вымышленная пекарня. Данные демонстрационные.",
  nav: [
    { label: "Меню", href: "/menu/" },
    { label: "О пекарне", href: "/about/" },
    { label: "Контакты", href: "/contacts/" },
  ],
} as const;

export type Site = typeof site;
