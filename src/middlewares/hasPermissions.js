import createHttpError from "http-errors";

const PERMISSIONS = {
  employee: {
    recycleries: {
      read: true,
      write: true,
      update: true,
      delete: true,
    },
  },
  manager: {
    recycleries: {
      read: true,
      write: true,
      update: true,
      delete: true,
    },
  },
  admin: {
    recycleries: {
      read: true,
      write: true,
      update: true,
      delete: true,
    },
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
  const module = req.baseUrl.split("/")[2]

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
