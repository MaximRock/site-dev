export type MenuCategoryId = "bread" | "pastry" | "breakfast" | "drinks";

export interface MenuCategory {
  id: MenuCategoryId;
  label: string;
  note: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  weight: number;
  unit: string;
  category: MenuCategoryId;
  allergens: readonly string[];
  featured?: boolean;
  soldOut?: boolean;
}

export const menuCategories: readonly MenuCategory[] = [
  {
    id: "bread",
    label: "Хлеб",
    note: "На закваске, с длинной расстойкой. Режем по просьбе.",
  },
  {
    id: "pastry",
    label: "Выпечка",
    note: "Слоёная и сдобная. Лучше забирать в день покупки.",
  },
  {
    id: "breakfast",
    label: "К завтраку",
    note: "Готовим сразу после заказа. До 12:00.",
  },
  {
    id: "drinks",
    label: "Напитки",
    note: "Кофе, чай и какао. Без сиропов по умолчанию.",
  },
];

export const menuItems: readonly MenuItem[] = [
  {
    id: "stolyarny",
    name: "«Столярный» на закваске",
    description: "Пшенично-ржаной хлеб с тонкой коркой и мягким мякишем. Печём каждый день.",
    price: 420,
    weight: 900,
    unit: "г",
    category: "bread",
    allergens: ["глютен"],
    featured: true,
  },
  {
    id: "grechishny",
    name: "«Гречишный» с семечками",
    description: "Гречишная мука, семечки подсолнечника и льна. Плотный, с ореховым вкусом.",
    price: 380,
    weight: 700,
    unit: "г",
    category: "bread",
    allergens: ["глютен"],
  },
  {
    id: "borodinsky",
    name: "«Бородинский»",
    description: "Тёмный хлеб с кориандром и солодом. Кислинка и пряный аромат.",
    price: 300,
    weight: 700,
    unit: "г",
    category: "bread",
    allergens: ["глютен"],
  },
  {
    id: "focaccia",
    name: "«Фокачча с розмарином»",
    description: "Пышное тесто с оливковым маслом и розмарином. Хороша к супу.",
    price: 280,
    weight: 400,
    unit: "г",
    category: "bread",
    allergens: ["глютен"],
  },
  {
    id: "croissant",
    name: "«Круассан с маслом»",
    description: "Многослойный, с хрустящей коркой и сливочным маслом.",
    price: 180,
    weight: 1,
    unit: "шт.",
    category: "pastry",
    allergens: ["глютен", "молоко"],
    featured: true,
  },
  {
    id: "cinnamon",
    name: "«Булочка с корицей»",
    description: "Мягкая сдоба, корица и сливочная карамель.",
    price: 220,
    weight: 1,
    unit: "шт.",
    category: "pastry",
    allergens: ["глютен", "молоко"],
    featured: true,
  },
  {
    id: "walnut",
    name: "«Улитка с грецким орехом»",
    description: "Слоёная улитка с грецким орехом и тёмной карамелью.",
    price: 240,
    weight: 1,
    unit: "шт.",
    category: "pastry",
    allergens: ["глютен", "молоко", "орехи"],
  },
  {
    id: "bread-butter",
    name: "«Хлеб с маслом и солью»",
    description: "Ломоть нашего хлеба, сливочное масло и морская соль.",
    price: 150,
    weight: 1,
    unit: "шт.",
    category: "breakfast",
    allergens: ["глютен", "молоко"],
  },
  {
    id: "sandwich",
    name: "«Сэндвич с сыром и зеленью»",
    description: "Хлеб на закваске, сыр, зелень и горчичный соус.",
    price: 290,
    weight: 1,
    unit: "шт.",
    category: "breakfast",
    allergens: ["глютен", "молоко"],
  },
  {
    id: "porridge",
    name: "«Овсяная каша с грушей»",
    description: "Овсянка на молоке, печёная груша и корица.",
    price: 260,
    weight: 250,
    unit: "г",
    category: "breakfast",
    allergens: ["молоко"],
  },
  {
    id: "filter",
    name: "«Фильтр-кофе»",
    description: "Светлая обжарка, чистая чашка. Зерно меняем каждые две недели.",
    price: 200,
    weight: 250,
    unit: "мл",
    category: "drinks",
    allergens: [],
  },
  {
    id: "cocoa",
    name: "«Какао»",
    description: "Тёмный шоколад, молоко и щепотка соли.",
    price: 220,
    weight: 250,
    unit: "мл",
    category: "drinks",
    allergens: ["молоко"],
  },
  {
    id: "tea",
    name: "«Чай с чабрецом»",
    description: "Чёрный чай, чабрец и мёд. Без сиропов.",
    price: 180,
    weight: 300,
    unit: "мл",
    category: "drinks",
    allergens: [],
  },
];

export const featuredItems = menuItems.filter((item) => item.featured);

export function getMenuItemsByCategory(category: MenuCategoryId): readonly MenuItem[] {
  return menuItems.filter((item) => item.category === category);
}

export function getMenuItem(id: string): MenuItem | undefined {
  return menuItems.find((item) => item.id === id);
}
