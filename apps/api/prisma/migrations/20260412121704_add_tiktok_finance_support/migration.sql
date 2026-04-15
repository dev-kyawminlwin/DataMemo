-- CreateEnum
CREATE TYPE "TikTokCategory" AS ENUM ('profile', 'bc', 'ads_account');

-- CreateEnum
CREATE TYPE "TikTokAssetTier" AS ENUM ('data', 'runner', 'test');

-- CreateEnum
CREATE TYPE "TikTokOpStatus" AS ENUM ('active', 'disabled', 'restricted', 'dead');

-- CreateEnum
CREATE TYPE "FinanceCategory" AS ENUM ('salary', 'ads_spend', 'software_subscription', 'office_supplies', 'hardware', 'revenue_product_a', 'revenue_product_b', 'other');

-- CreateEnum
CREATE TYPE "SupportPlatformType" AS ENUM ('salesmartly', 'jivo', 'wellytalk', 'other');

-- CreateTable
CREATE TABLE "tiktok_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TikTokCategory" NOT NULL,
    "asset_type" "TikTokAssetTier" NOT NULL,
    "login_email" TEXT NOT NULL,
    "password_cipher" TEXT NOT NULL,
    "assigned_to_user_id" TEXT,
    "status" "TikTokOpStatus" NOT NULL,
    "spend_limit" DECIMAL(18,2),
    "pixel_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tiktok_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "received_from" TEXT,
    "paid_to" TEXT,
    "category" "FinanceCategory" NOT NULL,
    "reference_note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tool_accounts" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "platform_type" "SupportPlatformType" NOT NULL,
    "admin_account" TEXT,
    "admin_password" TEXT,
    "admin_nickname" TEXT,
    "cs_account" TEXT,
    "cs_password" TEXT,
    "cs_nickname" TEXT,
    "finance_account" TEXT,
    "finance_password" TEXT,
    "finance_nickname" TEXT,
    "notes" TEXT,
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tool_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tiktok_assets_category_idx" ON "tiktok_assets"("category");

-- CreateIndex
CREATE INDEX "tiktok_assets_asset_type_idx" ON "tiktok_assets"("asset_type");

-- CreateIndex
CREATE INDEX "tiktok_assets_status_idx" ON "tiktok_assets"("status");

-- CreateIndex
CREATE INDEX "tiktok_assets_name_idx" ON "tiktok_assets"("name");

-- CreateIndex
CREATE INDEX "tiktok_assets_assigned_to_user_id_idx" ON "tiktok_assets"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "finance_transactions_date_idx" ON "finance_transactions"("date");

-- CreateIndex
CREATE INDEX "finance_transactions_created_by_id_idx" ON "finance_transactions"("created_by_id");

-- CreateIndex
CREATE INDEX "finance_transactions_category_idx" ON "finance_transactions"("category");

-- CreateIndex
CREATE INDEX "finance_transactions_amount_idx" ON "finance_transactions"("amount");

-- CreateIndex
CREATE INDEX "support_tool_accounts_company_name_idx" ON "support_tool_accounts"("company_name");

-- CreateIndex
CREATE INDEX "support_tool_accounts_platform_type_idx" ON "support_tool_accounts"("platform_type");

-- AddForeignKey
ALTER TABLE "tiktok_assets" ADD CONSTRAINT "tiktok_assets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
