import type { BlogPost } from "@/data/blog-posts";
import { getBlogPostPath } from "@/data/blog-posts";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/metadata";

export type BlogPostingJsonLd = {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  headline: string;
  description: string;
  url: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  datePublished: string;
  dateModified: string;
  inLanguage: "ko-KR";
  keywords: string;
  image: { "@type": "ImageObject"; url: string; caption: string };
  author: { "@type": "Organization"; name: typeof SITE_NAME };
  publisher: { "@type": "Organization"; name: typeof SITE_NAME };
  isPartOf: { "@type": "Blog"; name: string; url: string };
};

export function createBlogPostingJsonLd(post: BlogPost): BlogPostingJsonLd {
  const url = new URL(getBlogPostPath(post), SITE_ORIGIN).href;
  const blogUrl = new URL("/blog/", SITE_ORIGIN).href;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    inLanguage: "ko-KR",
    keywords: post.keywords.join(", "),
    image: {
      "@type": "ImageObject",
      url: new URL(post.image.src, SITE_ORIGIN).href,
      caption: post.image.alt,
    },
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    isPartOf: { "@type": "Blog", name: `${SITE_NAME} 블로그`, url: blogUrl },
  };
}
