import db from "../models/index.js";

const { User } = db;

export const findUserByEmail = async (email: `${string}@${string}`) => {
  const user = await User.findOne({ where: { email } });
  return user;
};
