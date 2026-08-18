import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/SiteLink";
import { notFound } from "next/navigation";
import { BLOG_POSTS, createBlogMetadata, findBlogPost, getBlogPostPath } from "@/data/blog-posts";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";
import { PHONE_HREF } from "@/lib/business";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = findBlogPost(slug);
  return post ? createBlogMetadata(post) : {};
}

function formatDate(value: string): string {
  return value.slice(0, 10).replaceAll("-", ".");
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) notFound();
  const related = findBlogPost(post.relatedSlug);
  const schema = JSON.stringify(createBlogPostingJsonLd(post)).replace(/</gu, "\\u003c");

  return (
    <main className="fixed-page">
      <div className="fixed-frame">
        <header className="article-hero">
          <div className="article-hero-media"><Image alt={post.image.alt} fill priority sizes="(max-width: 767px) 100vw, 50vw" src={post.image.src} /></div>
          <div className="article-hero-copy"><nav aria-label="현재 위치"><Link href="/">홈</Link><i aria-hidden="true">›</i><Link href="/blog/">안내 글</Link></nav><span className="eyebrow">{post.category}</span><h1>{post.title}</h1><p>{post.description}</p><time dateTime={post.publishedAt}>MASSAGE DAY · {formatDate(post.publishedAt)}</time></div>
        </header>

        <article className="article-body">
          <p className="article-intro">{post.intro}</p>
          {post.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
          <aside className="article-checklist" aria-labelledby="article-checklist-title"><h2 id="article-checklist-title">통화 전 메모</h2><ul>{post.checklist.map((item) => <li key={item}>{item}</li>)}</ul></aside>
          <nav className="article-links" aria-label="관련 안내">{related ? <Link href={getBlogPostPath(related)}>다른 글: {related.title}</Link> : null}<Link href="/pricing/">코스·가격</Link><Link href="/guide/">이용 방법</Link><Link href="/areas/">지역 찾기</Link><a href={PHONE_HREF}>전화 문의</a></nav>
        </article>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
    </main>
  );
}
