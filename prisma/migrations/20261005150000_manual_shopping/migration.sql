ALTER TABLE "ShoppingListItem" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false;
DROP INDEX "ShoppingListItem_listId_name_unit_key";
CREATE UNIQUE INDEX "ShoppingListItem_listId_name_unit_manual_key" ON "ShoppingListItem"("listId", "name", "unit", "manual");
