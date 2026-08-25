import { z } from "zod";

export const blogLocaleSchema = z.enum(["EN", "AR"]);
export const blogPostStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const slugSchema = z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only");
const optionalUrlSchema = z.union([z.string().trim().url().max(1200), z.literal("")]).optional();

export const blogPostInputSchema = z.object({
  locale: blogLocaleSchema,
  slug: slugSchema,
  title: z.string().trim().min(12).max(140),
  excerpt: z.string().trim().min(40).max(320),
  body: z.string().trim().min(200).max(120_000),
  seoTitle: z.string().trim().min(12).max(70),
  seoDescription: z.string().trim().min(50).max(170),
  category: z.string().trim().min(2).max(60),
  tags: z.array(z.string().trim().min(2).max(50)).max(12).default([]),
  coverImageUrl: optionalUrlSchema,
  coverImageAlt: z.string().trim().max(180).optional().default(""),
  featured: z.boolean().default(false),
  status: blogPostStatusSchema.default("DRAFT"),
  authorName: z.string().trim().min(2).max(80),
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
