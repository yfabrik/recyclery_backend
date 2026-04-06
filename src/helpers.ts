import { Op, type WhereAttributeHash, type WhereAttributeHashValue, type WhereOperators, type WhereOptions } from "sequelize"

export const formatWhereDateRange = (dateFrom?: Date, dateTo?: Date) => {
    let from = dateFrom ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0)) : undefined
    let to = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : undefined

    let result = {} //as WhereAttributeHashValue<Date>
    if (from) result = { ...result,[Op.gte]: from }
    if (to) result = { ...result, [Op.lte]: to }
    return result as WhereAttributeHashValue<Date>
}