-- CreateEnum
CREATE TYPE "FacebookCategory" AS ENUM ('profile', 'bm', 'page', 'ads_account');

-- CreateEnum
CREATE TYPE "FacebookAssetTier" AS ENUM ('data', 'runner', 'test');

-- CreateEnum
CREATE TYPE "FacebookOpStatus" AS ENUM ('active', 'disabled', 'restricted', 'dead');

-- CreateTable
CREATE TABLE "facebook_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FacebookCategory" NOT NULL,
    "asset_type" "FacebookAssetTier" NOT NULL,
    "login_email" TEXT NOT NULL,
    "password_cipher" TEXT NOT NULL,
    "two_fa_recovery_info" TEXT,
    "assigned_to_user_id" TEXT,
    "status" "FacebookOpStatus" NOT NULL,
    "spend_limit" DECIMAL(18,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "facebook_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facebook_assets_category_idx" ON "facebook_assets"("category");

-- CreateIndex
CREATE INDEX "facebook_assets_asset_type_idx" ON "facebook_assets"("asset_type");

-- CreateIndex
CREATE INDEX "facebook_assets_status_idx" ON "facebook_assets"("status");

-- CreateIndex
CREATE INDEX "facebook_assets_name_idx" ON "facebook_assets"("name");

-- CreateIndex
CREATE INDEX "facebook_assets_login_email_idx" ON "facebook_assets"("login_email");

-- CreateIndex
CREATE INDEX "facebook_assets_assigned_to_user_id_idx" ON "facebook_assets"("assigned_to_user_id");

-- AddForeignKey
ALTER TABLE "facebook_assets" ADD CONSTRAINT "facebook_assets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
