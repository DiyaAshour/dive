import {createHash} from "node:crypto";
import {database} from "@platform/database";
import {ApplicationError} from "../errors";
import {requirePlatformAdmin} from "../admin/authorization";

export type BlogTaxonomyLocale = "AR" | "EN";
export type BlogTaxonomyNode = Readonly<{
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}>;

export type BlogTaxonomyItem = BlogTaxonomyNode & Readonly<{
  path: string;
  depth: number;
}>;

const ENTITY_TYPE = "BlogTaxonomy";
const PATH_SEPARATOR = " / ";
const MAX_NODES = 120;
const MAX_DEPTH = 4;
const MAX_CATEGORY_PATH = 60;

export async function getAdminBlogTaxonomy(actorUserId: string, locale: BlogTaxonomyLocale) {
  await requirePlatformAdmin(actorUserId);
  return readBlogTaxonomy(locale, true);
}

export async function getPublicBlogTaxonomy(locale: "ar" | "en") {
  return readBlogTaxonomy(locale === "ar" ? "AR" : "EN", false);
}

export async function saveAdminBlogTaxonomy(actorUserId: string, locale: BlogTaxonomyLocale, rawNodes: BlogTaxonomyNode[]) {
  const actor = await requirePlatformAdmin(actorUserId);
  const before = await readBlogTaxonomy(locale, true);
  const nodes = normalizeAndValidateTaxonomy(rawNodes);
  const beforeItems = materializeBlogTaxonomy(before);
  const afterItems = materializeBlogTaxonomy(nodes);
  const beforePathById = new Map(beforeItems.map((item) => [item.id, item.path]));
  const afterPathById = new Map(afterItems.map((item) => [item.id, item.path]));
  const changed = afterItems
    .map((item) => ({id: item.id, before: beforePathById.get(item.id), after: item.path}))
    .filter((item): item is {id:string;before:string;after:string} => Boolean(item.before && item.before !== item.after));

  const db = database();
  await db.$transaction(async (tx) => {
    for (const item of changed) {
      await tx.blogPost.updateMany({
        where: {locale, category: item.before},
        data: {category: temporaryCategoryValue(item.id)},
      });
    }
    for (const item of changed) {
      await tx.blogPost.updateMany({
        where: {locale, category: temporaryCategoryValue(item.id)},
        data: {category: item.after},
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "BLOG_TAXONOMY_UPDATED",
        entityType: ENTITY_TYPE,
        entityId: locale,
        before: {nodes: before},
        after: {version: 1, nodes},
      },
    });
  });
  return nodes;
}

export function materializeBlogTaxonomy(nodes: readonly BlogTaxonomyNode[]): BlogTaxonomyItem[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pathMemo = new Map<string, {path:string;depth:number}>();
  const resolve = (node: BlogTaxonomyNode, stack = new Set<string>()): {path:string;depth:number} => {
    const cached = pathMemo.get(node.id);
    if (cached) return cached;
    if (stack.has(node.id)) throw new ApplicationError("BLOG_TAXONOMY_CYCLE", "Blog category hierarchy contains a cycle", 400);
    const nextStack = new Set(stack); nextStack.add(node.id);
    if (!node.parentId) {
      const root = {path: node.name, depth: 0}; pathMemo.set(node.id, root); return root;
    }
    const parent = byId.get(node.parentId);
    if (!parent) throw new ApplicationError("BLOG_TAXONOMY_PARENT_MISSING", "A blog category points to a missing parent", 400);
    const parentValue = resolve(parent, nextStack);
    const value = {path: `${parentValue.path}${PATH_SEPARATOR}${node.name}`, depth: parentValue.depth + 1};
    pathMemo.set(node.id, value);
    return value;
  };
  return nodes.map((node) => ({...node, ...resolve(node)}));
}

export function blogTaxonomyPaths(nodes: readonly BlogTaxonomyNode[]): string[] {
  return materializeBlogTaxonomy(nodes)
    .sort((a,b) => a.depth - b.depth || compareByTreeOrder(a,b,nodes))
    .map((item) => item.path);
}

export function blogCategoryLabel(path: string): string {
  const parts = path.split(PATH_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? path;
}

export function blogCategoryBreadcrumb(path: string): string {
  return path.split(PATH_SEPARATOR).map((part) => part.trim()).filter(Boolean).join(" › ");
}

async function readBlogTaxonomy(locale: BlogTaxonomyLocale, includeUnpublished: boolean): Promise<BlogTaxonomyNode[]> {
  const snapshot = await database().auditLog.findFirst({
    where: {entityType: ENTITY_TYPE, entityId: locale, action: "BLOG_TAXONOMY_UPDATED"},
    select: {after: true},
    orderBy: {createdAt: "desc"},
  });
  const stored = taxonomyFromJson(snapshot?.after);
  if (stored) return stored;
  return bootstrapTaxonomy(locale, includeUnpublished);
}

async function bootstrapTaxonomy(locale: BlogTaxonomyLocale, includeUnpublished: boolean): Promise<BlogTaxonomyNode[]> {
  const rows = await database().blogPost.findMany({
    where: {locale, ...(includeUnpublished ? {} : {status: "PUBLISHED", publishedAt: {lte: new Date()}})},
    select: {category: true},
    distinct: ["category"],
    orderBy: {category: "asc"},
  });
  const nodes: BlogTaxonomyNode[] = [];
  const idByPath = new Map<string,string>();
  for (const row of rows) {
    const parts = row.category.split(PATH_SEPARATOR).map((part) => part.trim()).filter(Boolean);
    let parentId: string | null = null;
    let path = "";
    for (const part of parts) {
      path = path ? `${path}${PATH_SEPARATOR}${part}` : part;
      let id = idByPath.get(path);
      if (!id) {
        id = stableCategoryId(locale, path);
        const siblings = nodes.filter((node) => node.parentId === parentId);
        nodes.push({id, name: part, slug: slugifyCategory(part), parentId, sortOrder: siblings.length});
        idByPath.set(path, id);
      }
      parentId = id;
    }
  }
  return nodes;
}

function normalizeAndValidateTaxonomy(rawNodes: BlogTaxonomyNode[]): BlogTaxonomyNode[] {
  if (rawNodes.length > MAX_NODES) throw new ApplicationError("BLOG_TAXONOMY_TOO_LARGE", `A maximum of ${MAX_NODES} blog categories is allowed`, 400);
  const seenIds = new Set<string>();
  const normalized = rawNodes.map((raw) => {
    const id = raw.id.trim();
    const name = raw.name.trim().replace(/\s+/g, " ");
    const slug = slugifyCategory(raw.slug || name);
    if (!id || id.length > 100) throw new ApplicationError("BLOG_TAXONOMY_INVALID_ID", "Every blog category needs a valid id", 400);
    if (seenIds.has(id)) throw new ApplicationError("BLOG_TAXONOMY_DUPLICATE_ID", "Blog category ids must be unique", 400);
    seenIds.add(id);
    if (name.length < 2 || name.length > 40) throw new ApplicationError("BLOG_TAXONOMY_INVALID_NAME", "Blog category names must be 2 to 40 characters", 400);
    return {id, name, slug, parentId: raw.parentId?.trim() || null, sortOrder: Number.isFinite(raw.sortOrder) ? Math.max(0, Math.floor(raw.sortOrder)) : 0};
  });
  const byId = new Map(normalized.map((node) => [node.id, node]));
  for (const node of normalized) {
    if (node.parentId === node.id) throw new ApplicationError("BLOG_TAXONOMY_SELF_PARENT", "A blog category cannot be its own parent", 400);
    if (node.parentId && !byId.has(node.parentId)) throw new ApplicationError("BLOG_TAXONOMY_PARENT_MISSING", "A blog category points to a missing parent", 400);
  }
  const normalizedOrder: BlogTaxonomyNode[] = [];
  const parentIds = new Set<string|null>(normalized.map((node) => node.parentId));
  for (const parentId of parentIds) {
    const siblings = normalized.filter((node) => node.parentId === parentId).sort((a,b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    siblings.forEach((node,index) => normalizedOrder.push({...node, sortOrder:index}));
  }
  const items = materializeBlogTaxonomy(normalizedOrder);
  for (const item of items) {
    if (item.depth >= MAX_DEPTH) throw new ApplicationError("BLOG_TAXONOMY_TOO_DEEP", `Blog categories can be nested up to ${MAX_DEPTH} levels`, 400);
    if (item.path.length > MAX_CATEGORY_PATH) throw new ApplicationError("BLOG_TAXONOMY_PATH_TOO_LONG", `Category paths must stay within ${MAX_CATEGORY_PATH} characters`, 400);
  }
  const pathSet = new Set<string>();
  for (const item of items) {
    const key = item.path.toLocaleLowerCase();
    if (pathSet.has(key)) throw new ApplicationError("BLOG_TAXONOMY_DUPLICATE_PATH", "Two blog categories cannot have the same full path", 409);
    pathSet.add(key);
  }
  return normalizedOrder;
}

function taxonomyFromJson(value: unknown): BlogTaxonomyNode[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const nodes = (value as {nodes?:unknown}).nodes;
  if (!Array.isArray(nodes)) return null;
  try {
    return normalizeAndValidateTaxonomy(nodes.map((node) => {
      const source = node as Record<string,unknown>;
      return {
        id: String(source.id ?? ""),
        name: String(source.name ?? ""),
        slug: String(source.slug ?? ""),
        parentId: source.parentId == null ? null : String(source.parentId),
        sortOrder: Number(source.sortOrder ?? 0),
      };
    }));
  } catch {
    return null;
  }
}

function temporaryCategoryValue(id: string): string {
  return `__blog_tax_${createHash("sha1").update(id).digest("hex").slice(0,16)}`;
}

function stableCategoryId(locale: BlogTaxonomyLocale, path: string): string {
  return `cat_${createHash("sha1").update(`${locale}:${path}`).digest("hex").slice(0,18)}`;
}

function slugifyCategory(value: string): string {
  const slug = value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,80);
  return slug || "category";
}

function compareByTreeOrder(a: BlogTaxonomyItem, b: BlogTaxonomyItem, nodes: readonly BlogTaxonomyNode[]): number {
  const byId = new Map(nodes.map((node) => [node.id,node]));
  const lineage = (item: BlogTaxonomyItem) => {
    const result: number[] = [];
    let current: BlogTaxonomyNode | undefined = byId.get(item.id);
    while (current) {
      result.unshift(current.sortOrder);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return result;
  };
  const left = lineage(a); const right = lineage(b); const length = Math.max(left.length,right.length);
  for (let index=0; index<length; index += 1) {
    const diff = (left[index] ?? -1) - (right[index] ?? -1);
    if (diff !== 0) return diff;
  }
  return a.name.localeCompare(b.name);
}
