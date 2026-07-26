-- CreateTable
CREATE TABLE "BookmarkCollection" (
    "bookmarkId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkCollection_pkey" PRIMARY KEY ("bookmarkId","collectionId")
);

-- Backfill existing bookmark-collection assignments
INSERT INTO "BookmarkCollection" ("bookmarkId", "collectionId", "createdAt")
SELECT id, "collectionId", NOW()
FROM "Bookmark"
WHERE "collectionId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_collectionId_fkey";

-- AlterTable
ALTER TABLE "Bookmark" DROP COLUMN "collectionId";

-- AddForeignKey
ALTER TABLE "BookmarkCollection" ADD CONSTRAINT "BookmarkCollection_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "Bookmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkCollection" ADD CONSTRAINT "BookmarkCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
