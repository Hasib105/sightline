"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, FileText, ImagePlus, Newspaper, Plus, Save, Search, Trash2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  FilterBar,
  SectionTabs,
  StatusBadge,
  consoleInputClass,
  consoleTextareaClass,
} from "@/components/dashboard/console";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createContentPost,
  deleteContentPost,
  listContentPosts,
  updateContentPost,
  uploadContentAsset,
} from "@/lib/dashboard-api";
import type { ContentAsset, ContentPost, ContentPostPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

type ContentType = "blog" | "news";
type StatusFilter = "all" | "draft" | "published";
type EditorState = {
  id: number | null;
  type: ContentType;
  status: "draft" | "published";
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  tags: string;
  author: string;
  cover_asset_id: number | null;
  cover_asset: ContentAsset | null;
  seo_title: string;
  seo_description: string;
  published_at: string;
};

const emptyEditor: EditorState = {
  id: null,
  type: "blog",
  status: "draft",
  slug: "",
  title: "",
  excerpt: "",
  body_markdown:
    "## Why it matters\nWrite the core idea here.\n\n## How to use it\nAdd practical steps, examples, and links.",
  tags: "AI search, developer tools",
  author: "Sightline Team",
  cover_asset_id: null,
  cover_asset: null,
  seo_title: "",
  seo_description: "",
  published_at: "",
};

function postToEditor(post: ContentPost): EditorState {
  return {
    id: post.id,
    type: post.type === "news" ? "news" : "blog",
    status: post.status,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body_markdown: post.body_markdown,
    tags: post.tags.join(", "),
    author: post.author,
    cover_asset_id: post.cover_asset_id,
    cover_asset: post.cover_asset,
    seo_title: post.seo_title,
    seo_description: post.seo_description,
    published_at: post.published_at ? post.published_at.slice(0, 16) : "",
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function editorToPayload(editor: EditorState): ContentPostPayload {
  return {
    type: editor.type,
    status: editor.status,
    slug: editor.slug.trim(),
    title: editor.title.trim(),
    excerpt: editor.excerpt.trim(),
    body_markdown: editor.body_markdown,
    tags: editor.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    author: editor.author.trim() || "Sightline Team",
    cover_asset_id: editor.cover_asset_id,
    seo_title: editor.seo_title.trim(),
    seo_description: editor.seo_description.trim(),
    published_at: editor.published_at ? new Date(editor.published_at).toISOString() : null,
  };
}

function assetPreviewUrl(asset: ContentAsset | null): string | null {
  if (!asset) return null;
  const variant =
    asset.variants.find((item) => item.format === "avif") ??
    asset.variants.find((item) => item.format === "webp") ??
    asset.variants[0];
  return variant?.url ?? null;
}

function formatDate(value: string | null): string {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export default function ContentAdminPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"all" | ContentType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [assetAlt, setAssetAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: ["content-posts", typeFilter, statusFilter, query],
    queryFn: () =>
      listContentPosts({
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        q: query || undefined,
        limit: 200,
      }),
  });

  const posts = useMemo(() => postsQuery.data?.posts ?? [], [postsQuery.data?.posts]);
  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((post) => post.status === "published").length,
      draft: posts.filter((post) => post.status === "draft").length,
    }),
    [posts]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = editorToPayload(editor);
      return editor.id ? updateContentPost(editor.id, payload) : createContentPost(payload);
    },
    onSuccess: (post) => {
      setEditor(postToEditor(post));
      setMessage(`${post.status === "published" ? "Published" : "Saved draft"}: ${post.title}`);
      void queryClient.invalidateQueries({ queryKey: ["content-posts"] });
    },
    onError: (error) => {
      setMessage(error instanceof ApiError ? error.message : "Unable to save content.");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose an image first.");
      return uploadContentAsset(file, assetAlt || editor.title || "Sightline content image");
    },
    onSuccess: (asset) => {
      setEditor((value) => ({ ...value, cover_asset_id: asset.id, cover_asset: asset }));
      setFile(null);
      setMessage("Cover uploaded with AVIF and WebP variants.");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Unable to upload image.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: number) => deleteContentPost(postId),
    onSuccess: () => {
      setEditor(emptyEditor);
      setMessage("Content deleted.");
      void queryClient.invalidateQueries({ queryKey: ["content-posts"] });
    },
  });

  const previewUrl = assetPreviewUrl(editor.cover_asset);

  return (
    <ConsolePage
      eyebrow="Sightline Content Lite"
      title="Content"
      description="Tiny first-party CMS for blog/news posts, Markdown, SEO metadata, publishing, and optimized cover assets."
      actions={
        <Button size="sm" onClick={() => setEditor(emptyEditor)}>
          <Plus className="size-4" /> New post
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <ConsoleStat label="Results" value={counts.all} icon={FileText} />
        <ConsoleStat label="Published" value={counts.published} icon={Newspaper} />
        <ConsoleStat label="Drafts" value={counts.draft} icon={Edit3} />
      </div>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <ConsolePanel
          title="Library"
          description="Search and pick a record to edit."
          contentClassName="space-y-3"
        >
          <FilterBar>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search content..."
                className={cn(consoleInputClass, "pl-8")}
              />
            </div>
            <SectionTabs
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All" },
                { value: "blog", label: "Blog" },
                { value: "news", label: "News" },
              ]}
            />
            <SectionTabs
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Any" },
                { value: "draft", label: "Draft" },
                { value: "published", label: "Live" },
              ]}
            />
          </FilterBar>

          <div className="space-y-2">
            {postsQuery.isLoading ? (
              <ConsoleEmptyState title="Loading content" description="Fetching CMS records..." />
            ) : posts.length === 0 ? (
              <ConsoleEmptyState
                title="No content yet"
                description="Create the first blog post or news update from the editor."
                icon={FileText}
              />
            ) : (
              posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setEditor(postToEditor(post))}
                  className={cn(
                    "w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 text-left transition hover:bg-muted/45",
                    editor.id === post.id && "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-foreground">{post.title}</p>
                    <StatusBadge
                      label={post.status}
                      tone={post.status === "published" ? "success" : "muted"}
                    />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {post.excerpt || post.slug}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {post.type} / {formatDate(post.published_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </ConsolePanel>

        <ConsolePanel
          title={editor.id ? "Edit content" : "New content"}
          description="Save as draft, publish, or unpublish without leaving the dashboard."
          actions={
            <>
              {editor.id ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(editor.id as number)}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={saveMutation.isPending || !editor.title.trim() || !editor.slug.trim()}
                onClick={() => saveMutation.mutate()}
              >
                <Save className="size-4" /> {editor.status === "published" ? "Publish" : "Save"}
              </Button>
            </>
          }
          contentClassName="space-y-4"
        >
          {message ? (
            <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Type">
              <SectionTabs
                value={editor.type}
                onChange={(value) => setEditor((current) => ({ ...current, type: value }))}
                options={[
                  { value: "blog", label: "Blog" },
                  { value: "news", label: "News" },
                ]}
              />
            </Field>
            <Field label="Status">
              <SectionTabs
                value={editor.status}
                onChange={(value) => setEditor((current) => ({ ...current, status: value }))}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                ]}
              />
            </Field>
            <Field label="Published at" hint="Blank publishes with current server time.">
              <input
                type="datetime-local"
                value={editor.published_at}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, published_at: event.target.value }))
                }
                className={consoleInputClass}
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Title">
              <input
                value={editor.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setEditor((current) => ({
                    ...current,
                    title: nextTitle,
                    slug:
                      !current.slug || current.slug === slugify(current.title)
                        ? slugify(nextTitle)
                        : current.slug,
                  }));
                }}
                placeholder="Academic integrity operations"
                className={consoleInputClass}
              />
            </Field>
            <Field label="Slug">
              <input
                value={editor.slug}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
                placeholder="search-infrastructure-ai-agents"
                className={consoleInputClass}
              />
            </Field>
          </div>

          <Field label="Excerpt">
            <textarea
              value={editor.excerpt}
              onChange={(event) =>
                setEditor((current) => ({ ...current, excerpt: event.target.value }))
              }
              placeholder="A tight summary for cards, feeds, and search results."
              className={cn(consoleTextareaClass, "min-h-20")}
            />
          </Field>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Field label="Markdown body">
              <textarea
                value={editor.body_markdown}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, body_markdown: event.target.value }))
                }
                className={cn(consoleTextareaClass, "min-h-[25rem] font-mono text-[13px]")}
              />
            </Field>

            <div className="space-y-3">
              <Field label="Cover asset" hint="Uploads generate compact AVIF and WebP variants.">
                <div className="space-y-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                  {previewUrl ? (
                    <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-card">
                      <Image
                        src={previewUrl}
                        alt={editor.cover_asset?.alt || editor.title || "Cover preview"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <ConsoleEmptyState
                      title="No cover"
                      description="Optional, but useful for richer blog cards later."
                      icon={ImagePlus}
                      className="min-h-36"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className={consoleInputClass}
                  />
                  <input
                    value={assetAlt}
                    onChange={(event) => setAssetAlt(event.target.value)}
                    placeholder="Alt text"
                    className={consoleInputClass}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!file || uploadMutation.isPending}
                    onClick={() => uploadMutation.mutate()}
                  >
                    <ImagePlus className="size-4" /> Upload cover
                  </Button>
                </div>
              </Field>

              <Field label="Tags">
                <input
                  value={editor.tags}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, tags: event.target.value }))
                  }
                  placeholder="risk analytics, agents, SEO"
                  className={consoleInputClass}
                />
              </Field>
              <Field label="Author">
                <input
                  value={editor.author}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, author: event.target.value }))
                  }
                  className={consoleInputClass}
                />
              </Field>
              <Field label="SEO title">
                <input
                  value={editor.seo_title}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, seo_title: event.target.value }))
                  }
                  placeholder="Optional override"
                  className={consoleInputClass}
                />
              </Field>
              <Field label="SEO description">
                <textarea
                  value={editor.seo_description}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      seo_description: event.target.value,
                    }))
                  }
                  placeholder="Optional search snippet."
                  className={cn(consoleTextareaClass, "min-h-20")}
                />
              </Field>
            </div>
          </div>
        </ConsolePanel>
      </div>
    </ConsolePage>
  );
}
