import { Op } from "sequelize";
import db from "./models/index.js";
import logger from "./services/logger.js";

const { Category } = db;

const SUBCATEGORY_NAME = "Jouet D3E";
const NEW_PARENT_NAME = "D3E";

const subcat = await Category.findOne({
  where: {
    name: SUBCATEGORY_NAME,
    parent_id: { [Op.not]: null },
  },
});
if (!subcat) {
  logger.error("subcategorie pas trouvé");
  throw new Error("subcategorie not found ");
}

const parent = await Category.findOne({
  where: {
    name: NEW_PARENT_NAME,
    parent_id: { [Op.is]: null },
  },
});
if (!parent) {
  logger.error("parent pas trouvé");
  throw "parent not found";
}

logger.debug(
  `subcategorie: ${subcat.id},${subcat.name}, oldParent:${subcat.parent_id}`,
);
logger.debug(`parent: ${parent.id},${parent.name}`);

await subcat.update({
  parent_id: parent.id,
});

await subcat.reload();
logger.debug(subcat.get({ plain: true }));
