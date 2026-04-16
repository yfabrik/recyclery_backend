import { Op } from "sequelize";
import db from "../models/index.js";

const { LabeledItem, TransactionItem, Category, SalesTransaction } = db;

db.sequelize.sync().then(async () => {
  const items = await LabeledItem.findAll({
    where: {
      transaction_id: { [Op.not]: null },
      // weight: 0,
    },
    include: [
      {
        model: Category,
        as: "category",
        required: false,
      },
      {
        model: Category,
        as: "subcategory",
        required: false,
      },
      {
        model: SalesTransaction,
        required: false,
        as: "transaction",
      },
    ],
  });

  items.forEach(async (i) => {
    switch (i.category?.name) {
      case "Décoration":
        i.weight = 2;
        if (i.subcategory?.name == "Bibelots") i.weight = 1;
        break;
      case "Luminaires":
        i.weight = 3;
        break;
      case "Vaiselle":
        i.weight = 0.2;
        break;
      case "Cuisine":
        i.weight = 0.5;
        break;
      case "Vêtements":
        i.weight = 0.3;
        break;

      case "Accessoires":
        i.weight = 0.3;
        break;
      case "Chaussures":
        i.weight = 1;
        break;
      case "Livres":
        i.weight = i.price / 2.5;
        break;
      case "Jeux jouets":
        i.weight = 1;
        break;
      case "Multimédia":
        i.weight = 0.2;
        break;
      case "Petite enfance":
        i.weight = 5;
        if (i.subcategory?.name == "Poussettes") i.weight = 10;
        break;

      case "Numérique":
        i.weight = 3;
        break;
      case "Sport et loisir":
        i.weight = 10;
        break;
      case "Matériauthèque":
        i.weight = 3;
        break;
      case "Mobilier":
        i.weight = 15;
        break;

      case "D3E":
        i.weight = 15;
        if (i.subcategory?.name == "Petits appareils ménager") i.weight = 2;
        break;
      case "Thermique":
        i.weight = 15;
        break;
      case "Boisson":
        break;
      case "Loisirs créatifs":
        break;

      case "Animaux (chats, chiens, poissons, rongeurs)":
        break;

      default:
        break;
    }
    await i.save();
  });

  const mapped = items.map((i) => ({
    name: i.subcategory
      ? i.category?.name + ">" + i.subcategory.name
      : i.category?.name,
    price: i.price,
    quantity: 1,
    transaction_id: i.transaction_id,
    labeled_item_id: i.id,
  }));

  const result = await TransactionItem.bulkCreate(mapped);
});
