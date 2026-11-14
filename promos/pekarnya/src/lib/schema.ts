import { menuCategories, menuItems } from "../data/menu";
import { site } from "../data/site";
import { withBase } from "./withBase";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

function absolute(path: string): string {
  return new URL(withBase(path), site.url).href;
}

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: site.address.street,
  addressLocality: site.city,
  postalCode: site.address.postalCode,
  addressCountry: "RU",
};

const openingHours = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "08:00",
  closes: "21:00",
};

export const bakerySchema = {
  "@context": "https://schema.org",
  "@type": "Bakery",
  "@id": absolute("/#bakery"),
  name: site.legalName,
  alternateName: site.name,
  url: absolute("/"),
  image: absolute("/og-default.jpg"),
  telephone: site.phone.label,
  email: site.email.label,
  priceRange: "₽₽",
  servesCuisine: ["Выпечка", "Хлеб", "Кофе"],
  address: postalAddress,
  openingHoursSpecification: openingHours,
  sameAs: [site.telegram.href],
  areaServed: site.city,
};

export const menuSchema = {
  "@context": "https://schema.org",
  "@type": "Menu",
  name: `Меню ${site.name}`,
  url: absolute("/menu/"),
  inLanguage: "ru-RU",
  hasMenuSection: menuCategories.map((category) => ({
    "@type": "MenuSection",
    name: category.label,
    description: category.note,
    hasMenuItem: menuItems
      .filter((item) => item.category === category.id)
      .map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        description: item.description,
        offers: {
          "@type": "Offer",
          price: item.price,
          priceCurrency: "RUB",
          availability: item.soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        },
      })),
  })),
};

export function breadcrumbSchema(items: readonly BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}
