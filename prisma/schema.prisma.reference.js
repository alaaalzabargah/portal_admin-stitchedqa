// ============================================================
// Prisma Schema Reference – Review Model
// ============================================================
// This file serves as a reference for the review data model.
// The actual database is managed via Supabase migrations.
// 
// Corresponding Supabase migration:
//   supabase/migrations/20260315_create_reviews_table.sql

/*
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Review Status Enum ──────────────────────────────────────
// Triage logic:
//   - Ratings 4-5 → PUBLISHED (auto-approved)
//   - Ratings 1-3 → NEEDS_ATTENTION (requires admin review)
//   - Admin can also ARCHIVE reviews

enum ReviewStatus {
  NEEDS_ATTENTION
  PUBLISHED
  ARCHIVED
}

// ── Review Model ────────────────────────────────────────────

model Review {
  id               String       @id @default(uuid()) @db.Uuid
  productHandle    String       @map("product_handle")
  productTitle     String       @map("product_title")
  rating           Int          // 1-5 integer (mapped from semantic labels)
  reviewText       String?      @map("review_text") @db.Text
  status           ReviewStatus @default(NEEDS_ATTENTION)
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz

  @@index([status])
  @@index([productHandle])
  @@index([rating])
  @@index([createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@map("reviews")
}
*/
