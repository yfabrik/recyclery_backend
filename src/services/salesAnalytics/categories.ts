import db from "../../models/index.js";

const { Category } = db;

export type CategoryNode = { id: number; name: string; parent_id: number | null };
export type CategoryTree = Map<number, CategoryNode>;

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
  categoryId: number | null,
): CategoryNode[] => {
  const path: CategoryNode[] = [];
  const seen = new Set<number>();
  let node = categoryId == null ? undefined : tree.get(categoryId);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    path.unshift(node);
    node = node.parent_id == null ? undefined : tree.get(node.parent_id);
  }
  return path;
};
