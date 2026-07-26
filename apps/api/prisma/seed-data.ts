// apps/api/prisma/seed-data.ts

export const DEMO_COLLECTIONS = [
  "Design reading",
  "Engineering",
  "Later",
] as const;

export type DemoCollectionName = (typeof DEMO_COLLECTIONS)[number];

export type DemoBookmarkSeed = {
  title: string;
  url: string;
  notes?: string;
  collections: readonly DemoCollectionName[];
};

export const DEMO_BOOKMARKS: readonly DemoBookmarkSeed[] = [
  {
    title: "Design Systems Handbook",
    url: "https://www.designsystems.com/handbook",
    notes: "Practical guide to design systems.",
    collections: ["Design reading", "Engineering"],
  },
  {
    title: "Inclusive Design Principles",
    url: "https://inclusivedesignprinciples.org",
    collections: ["Design reading"],
  },
  {
    title: "Refactoring UI",
    url: "https://www.refactoringui.com",
    notes: "Visual design tips for developers.",
    collections: ["Design reading", "Later"],
  },
  {
    title: "NestJS Documentation",
    url: "https://docs.nestjs.com",
    collections: ["Engineering"],
  },
  {
    title: "Prisma Docs",
    url: "https://www.prisma.io/docs",
    collections: ["Engineering"],
  },
  {
    title: "React Documentation",
    url: "https://react.dev",
    collections: ["Engineering", "Later"],
  },
  {
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    collections: ["Engineering"],
  },
  {
    title: "Web Accessibility Initiative",
    url: "https://www.w3.org/WAI/",
    collections: ["Design reading", "Later"],
  },
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    collections: ["Later"],
  },
  {
    title: "Uncategorized idea",
    url: "https://example.com/scratch",
    notes: "Not in any collection yet.",
    collections: [],
  },
];
