import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
import db from "../../models/index.js";
const { User } = db;
export const useAuth = () => {


    const register = async (data) => {
        const existingUser = await User.findOne({
            where: { [Op.or]: [{ email: data.email }, { username: data.username }] },
        });
        if (existingUser) {
            throw new createHttpError.Conflict(
                "Un utilisateur avec cet email ou nom d'utilisateur existe déjà"
            );
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        const user = await User.create({
            ...data,
            password: hashedPassword,

        });

        return genToken(user)
    }


    const login = async (data) => {
        const user = await User.scope("withPassword").findOne({ where: { email: data.email } });
        if (!user)
            throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");

        const isValidPassword = await bcrypt.compare(data.password, user.password);
        if (!isValidPassword) {
            throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
        }

        user.last_login = new Date();
        await user.save();
        return genToken(user)
    }

    const genToken = (user) => {
        return (
            jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    recyclery_id: user.recyclery_id,
                },
                process.env.JWT_SECRET,
                { expiresIn: "24h" }
            )
        )
    }
    return {
        login, register
    }
}