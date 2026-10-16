import type { MarkdownInstance } from 'astro';

export interface GuideFrontmatter {
  title: string;
  description: string;
  publishDate: string;
  modifiedDate?: string;
  counterpart: string;
  topic: string;
  readingMinutes: number;
  heroImage: string;
}

export type GuideModule = MarkdownInstance<GuideFrontmatter>;
