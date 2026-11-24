import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/avatares/" }, sitemap: `${urlDoSite()}/sitemap.xml` };
}
