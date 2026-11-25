export type Kind = "pot" | "pan" | "kettle" | "kazan" | "bowl" | "cup";

export interface ColorOption {
  name: string;
  hex: string;
}

export interface ProductImage {
  src: string;
  thumb: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category: string;
  kind: Kind;
  price: number;
  oldPrice?: number;
  colors: ColorOption[];
  sizes: string[];
  description: string;
  specs: { label: string; value: string }[];
  stock: "many" | "few" | "out";
  installment: boolean;
  images: ProductImage[];
}

const C = {
  graphite: { name: "Графит", hex: "#5a5148" },
  milk: { name: "Молочный", hex: "#e9e2d6" },
  terracotta: { name: "Терракота", hex: "#b47e60" },
  sage: { name: "Шалфей", hex: "#9aa08a" },
  sand: { name: "Песок", hex: "#c9b8a0" },
};

/** Демо-данные для seed (prisma/seed.ts). Витрина берёт товары из БД. */
export const seedProducts: Omit<Product, "id" | "images">[] = [
  {
    slug: "kastryulya-seramika-3l",
    name: "Кастрюля керамическая с крышкой",
    category: "Кастрюли",
    kind: "pot",
    price: 4900,
    oldPrice: 6200,
    colors: [C.milk, C.terracotta, C.sage],
    sizes: ["2 л", "3 л", "5 л"],
    description:
      "Толстое керамическое покрытие без PFOA равномерно держит тепло и подходит для всех типов плит, включая индукцию. Тихая крышка с силиконовым ободом.",
    specs: [
      { label: "Материал", value: "Алюминий с керамическим покрытием" },
      { label: "Объём", value: "2 / 3 / 5 л" },
      { label: "Комплектация", value: "Кастрюля, стеклянная крышка" },
      { label: "Страна", value: "Турция" },
    ],
    stock: "many",
    installment: true,
  },
  {
    slug: "skovoroda-gril-28",
    name: "Сковорода-гриль, 28 см",
    category: "Сковородки",
    kind: "pan",
    price: 3600,
    colors: [C.graphite, C.terracotta],
    sizes: ["24 см", "28 см"],
    description:
      "Литой корпус с рифлёным дном для сочных стейков и овощей. Съёмная эргономичная ручка не нагревается.",
    specs: [
      { label: "Материал", value: "Литой алюминий, антипригарное покрытие" },
      { label: "Диаметр", value: "24 / 28 см" },
      { label: "Комплектация", value: "Сковорода" },
      { label: "Страна", value: "Китай" },
    ],
    stock: "many",
    installment: true,
  },
  {
    slug: "chaynik-emal-2l",
    name: "Эмалированный чайник со свистком",
    category: "Чайники",
    kind: "kettle",
    price: 2800,
    colors: [C.milk, C.sand, C.sage],
    sizes: ["2 л", "3 л"],
    description:
      "Классический чайник с деревянной ручкой и мелодичным свистком. Эмаль не передаёт вкус и легко моется.",
    specs: [
      { label: "Материал", value: "Углеродистая сталь, эмаль" },
      { label: "Объём", value: "2 / 3 л" },
      { label: "Комплектация", value: "Чайник со свистком" },
      { label: "Страна", value: "Турция" },
    ],
    stock: "few",
    installment: false,
  },
  {
    slug: "kazan-chugun-5l",
    name: "Казан чугунный, 5 л",
    category: "Казаны",
    kind: "kazan",
    price: 7400,
    oldPrice: 8500,
    colors: [C.graphite],
    sizes: ["5 л", "8 л", "12 л"],
    description:
      "Классический плоскодонный казан для плова и шурпы. Толстые стенки долго держат жар, чугун со временем только лучше.",
    specs: [
      { label: "Материал", value: "Чугун" },
      { label: "Объём", value: "5 / 8 / 12 л" },
      { label: "Комплектация", value: "Казан, крышка" },
      { label: "Страна", value: "Узбекистан" },
    ],
    stock: "many",
    installment: true,
  },
  {
    slug: "salatnik-keramika",
    name: "Салатник ручной работы",
    category: "Сервизы",
    kind: "bowl",
    price: 1900,
    colors: [C.milk, C.terracotta, C.sand],
    sizes: ["22 см", "28 см"],
    description:
      "Глубокая миска с мягкой матовой глазурью. Подходит для салатов, фруктов и подачи горячего.",
    specs: [
      { label: "Материал", value: "Фаянс" },
      { label: "Диаметр", value: "22 / 28 см" },
      { label: "Комплектация", value: "1 шт." },
      { label: "Страна", value: "Португалия" },
    ],
    stock: "many",
    installment: false,
  },
  {
    slug: "chaynyy-servis-6",
    name: "Чайный сервиз на 6 персон",
    category: "Сервизы",
    kind: "cup",
    price: 5900,
    oldPrice: 7100,
    colors: [C.milk, C.sand],
    sizes: ["6 персон"],
    description:
      "Шесть чашек с блюдцами из тонкого фарфора. Лёгкий матовый оттенок и мягкий свет делают подачу чая особенным ритуалом.",
    specs: [
      { label: "Материал", value: "Фарфор" },
      { label: "Объём чашки", value: "220 мл" },
      { label: "Комплектация", value: "6 чашек, 6 блюдец" },
      { label: "Страна", value: "Китай" },
    ],
    stock: "few",
    installment: true,
  },
  {
    slug: "skovoroda-vok-32",
    name: "Сковорода-вок, 32 см",
    category: "Сковородки",
    kind: "pan",
    price: 4200,
    colors: [C.graphite, C.sage],
    sizes: ["28 см", "32 см"],
    description:
      "Глубокий вок с плоским дном для индукции. Быстро нагревается и подходит для жарки на сильном огне.",
    specs: [
      { label: "Материал", value: "Кованый алюминий" },
      { label: "Диаметр", value: "28 / 32 см" },
      { label: "Комплектация", value: "Вок, стеклянная крышка" },
      { label: "Страна", value: "Китай" },
    ],
    stock: "many",
    installment: true,
  },
  {
    slug: "kastryulya-nabor-3",
    name: "Набор кастрюль из 3 предметов",
    category: "Кастрюли",
    kind: "pot",
    price: 9800,
    colors: [C.graphite, C.milk],
    sizes: ["набор 3 шт."],
    description:
      "Три кастрюли разного объёма, которые вкладываются друг в друга и экономят место в шкафу.",
    specs: [
      { label: "Материал", value: "Нержавеющая сталь" },
      { label: "Объём", value: "2 / 3 / 4 л" },
      { label: "Комплектация", value: "3 кастрюли, 3 крышки" },
      { label: "Страна", value: "Турция" },
    ],
    stock: "out",
    installment: true,
  },
];

export const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/ | /g, " ")} сом`;

export const stockLabel = (s: Product["stock"]) =>
  s === "out" ? "Нет в наличии" : s === "few" ? "Мало" : "В наличии";

/** Коллекция для главной: позиции хранятся в процентах относительно сцены. */
export const heroCollection = {
  title: "Тёплая кухня",
  items: [
    { slug: "kazan-chugun-5l", x: 26, y: 70, w: 34 },
    { slug: "chaynik-emal-2l", x: 74, y: 58, w: 30 },
    { slug: "skovoroda-gril-28", x: 52, y: 40, w: 32 },
  ],
};
