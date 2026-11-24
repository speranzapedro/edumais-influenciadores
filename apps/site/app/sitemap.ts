import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlDoSite();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/experimente`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
