ALTER TABLE "Recipe" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE "Recipe" ADD COLUMN "authorUid" TEXT;
CREATE TABLE "DriveState" ("id" TEXT NOT NULL DEFAULT 'family', "mode" TEXT NOT NULL, "store" JSONB, "cart" JSONB NOT NULL DEFAULT '[]', "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DriveState_pkey" PRIMARY KEY ("id"));
CREATE TABLE "IngredientProductPreference" ("id" TEXT NOT NULL, "ingredient" TEXT NOT NULL, "storeId" TEXT NOT NULL, "productId" TEXT NOT NULL, "selectionCount" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "IngredientProductPreference_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "IngredientProductPreference_ingredient_storeId_productId_key" ON "IngredientProductPreference"("ingredient", "storeId", "productId");
