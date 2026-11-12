import type { Models } from "../../models/db-types.js";
import db from "../../models/index.js";

const { Category } = db;

type CategoryId = Models["Category"]["id"];

export type CategoryNode = { id: CategoryId; name: string; parent_id: CategoryId | null };
export type CategoryTree = Map<CategoryId, CategoryNode>;

/** Label of lines whose item has no category. */
export const NO_CATEGORY_LABEL = "Sans catégorie";

export const loadCategoryTree = async (): Promise<CategoryTree> => {
  const rows = await Category.findAll({
    attributes: ["id", "name", "parent_id"],
    raw: true,
  });
  return new Map(
    rows.map((c) => [
      c.id,
      { id: c.id, name: c.name, parent_id: c.parent_id ?? null },
    ]),
  );
};

/**
 * The categories from the top-level one down to `categoryId`, following
 * `parent_id` whatever the depth. `[0]` is the top-level category; `[]` for no
 * (or an unknown) category.
 */
export const categoryPath = (
  tree: CategoryTree,
  categoryId: CategoryId | null,
): CategoryNode[] => {
  const path: CategoryNode[] = [];
  const seen = new Set<CategoryId>();
  let node = categoryId == null ? undefined : tree.get(categoryId);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    path.unshift(node);
    node = node.parent_id == null ? undefined : tree.get(node.parent_id);
  }
  return path;
};

/**
 * The category a line counts under when listing one level of the tree: its
 * top-level category when `parentId` is null; otherwise the child of
 * `parentId` on its path, or `parentId` itself for an item attached directly
 * to it. `null`: no category (top level only). `undefined`: not under
 * `parentId`.
 */
export const categoryAtLevel = (
  tree: CategoryTree,
  categoryId: CategoryId | null,
  parentId: CategoryId | null,
): CategoryNode | null | undefined => {
  const path = categoryPath(tree, categoryId);
  if (parentId == null) return path[0] ?? null;
  const index = path.findIndex((node) => node.id === parentId);
  if (index === -1) return undefined;
  return path[index + 1] ?? path[index];
};
