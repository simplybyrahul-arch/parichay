import type { MetadataRoute } from "next";

const siteUrl = "https://www.shotcutcrew.com";

const publicRoutes = [
  "",
  "/signup",
  "/login",
  "/book",
  "/equipment",
  "/about",
  "/contact",
  "/support",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/community-guidelines",
  "/creator-agreement",
  "/equipment-rental-terms",
  "/ai-disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/book" || route === "/equipment" ? 0.9 : 0.7,
  }));
}
