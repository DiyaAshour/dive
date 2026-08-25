import type { BlogPostInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { requirePlatformAdmin } from "../admin/authorization";

export type PublicBlogLocale = "en" | "ar";

const publicListSelect = {
  id: true,
  locale: true,
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  tags: true,
  coverImageUrl: true,
  coverImageAlt: true,
  featured: true,
  authorName: true,
  readingMinutes: true,
  publishedAt: true,
  updatedAt: true,
} as const;

const publicArticleSelect = {
  ...publicListSelect,
  body: true,
  seoTitle: true,
  seoDescription: true,
} as const;

export function databaseBlogLocale(locale: PublicBlogLocale): "EN" | "AR" {
  return locale === "ar" ? "AR" : "EN";
}

export async function listPublishedBlogPosts(locale: PublicBlogLocale, limit = 24) {
  return database().blogPost.findMany({
    where: {locale: databaseBlogLocale(locale), status: "PUBLISHED", publishedAt: {lte: new Date()}},
    select: publicListSelect,
    orderBy: [{featured: "desc"}, {publishedAt: "desc"}],
    take: Math.max(1, Math.min(limit, 100)),
  });
}

export async function getPublishedBlogPost(locale: PublicBlogLocale, slug: string) {
  const post = await database().blogPost.findFirst({
    where: {locale: databaseBlogLocale(locale), slug, status: "PUBLISHED", publishedAt: {lte: new Date()}},
    select: publicArticleSelect,
  });
  if (!post) notFound("Blog post");
  return post;
}

export async function listRelatedPublishedBlogPosts(locale: PublicBlogLocale, postId: string, category: string, limit = 3) {
  return database().blogPost.findMany({
    where: {id: {not: postId}, locale: databaseBlogLocale(locale), category, status: "PUBLISHED", publishedAt: {lte: new Date()}},
    select: {id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, coverImageAlt: true, publishedAt: true, category: true, readingMinutes: true},
    orderBy: {publishedAt: "desc"},
    take: Math.max(1, Math.min(limit, 6)),
  });
}

export async function listBlogSitemapEntries() {
  return database().blogPost.findMany({
    where: {status: "PUBLISHED", publishedAt: {lte: new Date()}},
    select: {locale: true, slug: true, updatedAt: true},
    orderBy: {updatedAt: "desc"},
  });
}

export async function listBlogFeedEntries(limit = 30) {
  return database().blogPost.findMany({
    where: {status: "PUBLISHED", publishedAt: {lte: new Date()}},
    select: {locale: true, slug: true, title: true, excerpt: true, authorName: true, publishedAt: true, updatedAt: true, category: true},
    orderBy: {publishedAt: "desc"},
    take: Math.max(1, Math.min(limit, 100)),
  });
}

export async function listAdminBlogPosts(actorUserId: string, filters: {query?: string; status?: string; locale?: string} = {}) {
  await requirePlatformAdmin(actorUserId);
  const status = validStatus(filters.status) ? filters.status : undefined;
  const locale = filters.locale === "AR" || filters.locale === "EN" ? filters.locale : undefined;
  return database().blogPost.findMany({
    where: {
      ...(status ? {status} : {}),
      ...(locale ? {locale} : {}),
      ...(filters.query?.trim() ? {OR: [
        {title: {contains: filters.query.trim(), mode: "insensitive"}},
        {slug: {contains: filters.query.trim(), mode: "insensitive"}},
        {category: {contains: filters.query.trim(), mode: "insensitive"}},
      ]} : {}),
    },
    select: {id: true, locale: true, slug: true, title: true, excerpt: true, category: true, tags: true, featured: true, status: true, authorName: true, readingMinutes: true, publishedAt: true, updatedAt: true},
    orderBy: {updatedAt: "desc"},
    take: 200,
  });
}

export async function getAdminBlogPost(actorUserId: string, postId: string) {
  await requirePlatformAdmin(actorUserId);
  const post = await database().blogPost.findUnique({where: {id: postId}});
  if (!post) notFound("Blog post");
  return post;
}

export async function createAdminBlogPost(actorUserId: string, rawInput: BlogPostInput) {
  const actor = await requirePlatformAdmin(actorUserId);
  const input = normalizeInput(rawInput);
  await ensureSlugAvailable(input.locale, input.slug);
  const now = new Date();
  return database().$transaction(async (tx) => {
    const post = await tx.blogPost.create({data: {
      ...input,
      coverImageUrl: input.coverImageUrl || null,
      coverImageAlt: input.coverImageAlt || null,
      readingMinutes: estimateReadingMinutes(input.body),
      publishedAt: input.status === "PUBLISHED" ? now : null,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
    }});
    await tx.auditLog.create({data: {
      actorUserId: actor.id,
      action: input.status === "PUBLISHED" ? "BLOG_POST_CREATED_AND_PUBLISHED" : "BLOG_POST_CREATED",
      entityType: "BlogPost",
      entityId: post.id,
      after: auditSnapshot(post),
    }});
    return post;
  });
}

export async function updateAdminBlogPost(actorUserId: string, postId: string, rawInput: BlogPostInput) {
  const actor = await requirePlatformAdmin(actorUserId);
  const input = normalizeInput(rawInput);
  const existing = await database().blogPost.findUnique({where: {id: postId}});
  if (!existing) notFound("Blog post");
  if (existing.slug !== input.slug || existing.locale !== input.locale) await ensureSlugAvailable(input.locale, input.slug, postId);
  const now = new Date();
  const publishedAt = input.status === "PUBLISHED" ? (existing.publishedAt ?? now) : input.status === "DRAFT" ? null : existing.publishedAt;
  return database().$transaction(async (tx) => {
    const post = await tx.blogPost.update({where: {id: postId}, data: {
      ...input,
      coverImageUrl: input.coverImageUrl || null,
      coverImageAlt: input.coverImageAlt || null,
      readingMinutes: estimateReadingMinutes(input.body),
      publishedAt,
      updatedByUserId: actor.id,
    }});
    const action = existing.status !== "PUBLISHED" && post.status === "PUBLISHED" ? "BLOG_POST_PUBLISHED"
      : existing.status === "PUBLISHED" && post.status !== "PUBLISHED" ? "BLOG_POST_UNPUBLISHED"
      : post.status === "ARCHIVED" && existing.status !== "ARCHIVED" ? "BLOG_POST_ARCHIVED"
      : "BLOG_POST_UPDATED";
    await tx.auditLog.create({data: {
      actorUserId: actor.id,
      action,
      entityType: "BlogPost",
      entityId: post.id,
      before: auditSnapshot(existing),
      after: auditSnapshot(post),
    }});
    return post;
  });
}

function normalizeInput(input: BlogPostInput) {
  return {
    ...input,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    body: input.body.trim(),
    seoTitle: input.seoTitle.trim(),
    seoDescription: input.seoDescription.trim(),
    category: input.category.trim(),
    authorName: input.authorName.trim(),
    coverImageUrl: input.coverImageUrl?.trim() ?? "",
    coverImageAlt: input.coverImageAlt?.trim() ?? "",
    tags: [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12),
  };
}

async function ensureSlugAvailable(locale: "EN" | "AR", slug: string, excludingId?: string) {
  const conflict = await database().blogPost.findFirst({where: {locale, slug, ...(excludingId ? {id: {not: excludingId}} : {})}, select: {id: true}});
  if (conflict) throw new ApplicationError("BLOG_SLUG_TAKEN", "This slug is already used for the selected language", 409);
}

function validStatus(value: string | undefined): value is "DRAFT" | "PUBLISHED" | "ARCHIVED" {
  return value === "DRAFT" || value === "PUBLISHED" || value === "ARCHIVED";
}

function estimateReadingMinutes(body: string) {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 220));
}

function auditSnapshot(post: {locale: string; slug: string; title: string; status: string; featured: boolean; publishedAt: Date | null}) {
  return {locale: post.locale, slug: post.slug, title: post.title, status: post.status, featured: post.featured, publishedAt: post.publishedAt?.toISOString() ?? null};
}
