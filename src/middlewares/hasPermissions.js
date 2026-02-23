import createHttpError from "http-errors";

const modulePerms = () => ({
  read: true,
  write: true,
  update: true,
  delete: true,
});

const readOnlyPerms = () => ({
  read: true,
  write: false,
  update: false,
  delete: false,
});

const noPerms = () => ({
  read: false,
  write: false,
  update: false,
  delete: false,
});

const PERMISSIONS = {
  employee: {
    auth: modulePerms(),
    recycleries: readOnlyPerms(),
    users: noPerms(),
    donations: modulePerms(),
    collections: modulePerms(),
    sales: modulePerms(),
    categories: readOnlyPerms(),
    "collection-points": noPerms(),
    "collection-schedules": noPerms(),
    arrivals: modulePerms(),
    "labeled-items": modulePerms(),
    stores: readOnlyPerms(),
    "cash-sessions": modulePerms(),
    "cash-registers": modulePerms(),
    "sales-transactions": modulePerms(),
    refunds: modulePerms(),
    "eco-organisms": readOnlyPerms(),
    "waste-disposals": modulePerms(),
    dashboard: readOnlyPerms(),
    tasks: noPerms(),
    planning: noPerms(),
    "store-hours": noPerms(),
    "store-locations": modulePerms(),
    "collection-point-presence": noPerms(),
    "employee-stores": noPerms(),
    "employee-workdays": noPerms(),
    employees: noPerms(),
  },
  manager: {
    recycleries: modulePerms(),
    users: modulePerms(),
    donations: modulePerms(),
    collections: modulePerms(),
    sales: modulePerms(),
    categories: modulePerms(),
    "collection-points": modulePerms(),
    "collection-schedules": modulePerms(),
    arrivals: modulePerms(),
    "labeled-items": modulePerms(),
    stores: modulePerms(),
    "cash-sessions": modulePerms(),
    "cash-registers": modulePerms(),
    "sales-transactions": modulePerms(),
    refunds: modulePerms(),
    "eco-organisms": modulePerms(),
    "waste-disposals": modulePerms(),
    dashboard: modulePerms(),
    tasks: modulePerms(),
    planning: modulePerms(),
    "store-hours": modulePerms(),
    "store-locations": modulePerms(),
    "collection-point-presence": modulePerms(),
    "employee-stores": modulePerms(),
    "employee-workdays": modulePerms(),
    employees: modulePerms(),
  },
  admin: {
    recycleries: modulePerms(),
    users: modulePerms(),
    donations: modulePerms(),
    collections: modulePerms(),
    sales: modulePerms(),
    categories: modulePerms(),
    "collection-points": modulePerms(),
    "collection-schedules": modulePerms(),
    arrivals: modulePerms(),
    "labeled-items": modulePerms(),
    stores: modulePerms(),
    "cash-sessions": modulePerms(),
    "cash-registers": modulePerms(),
    "sales-transactions": modulePerms(),
    refunds: modulePerms(),
    "eco-organisms": modulePerms(),
    "waste-disposals": modulePerms(),
    dashboard: modulePerms(),
    tasks: modulePerms(),
    planning: modulePerms(),
    "store-hours": modulePerms(),
    "store-locations": modulePerms(),
    "collection-point-presence": modulePerms(),
    "employee-stores": modulePerms(),
    "employee-workdays": modulePerms(),
    employees: modulePerms(),
  },
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const hasPermissions = async (req, res, next) => {
  const user = req.user;
  const module = req.baseUrl.split("/")[2];

  if (!user) throw new createHttpError.Unauthorized("user not found");
  let method;
  switch (req.method) {
    case "GET":
      method = "read";
      break;
    case "POST":
      method = "write";
      break;
    case "PUT":
      method = "update";
      break;
    case "PATCH":
      method = "update";
      break;
    case "DELETE":
      method = "delete";
      break;
    default:
      throw new Error("request method unknown");
  }
  if (!PERMISSIONS[user.role][module][method])
    throw new createHttpError.Forbidden("user dont have rights");

  next();
};
