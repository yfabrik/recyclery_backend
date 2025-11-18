import { beforeAll, jest } from "@jest/globals";
import db from "../../src/models";
import { createLabeledItem, deleteLabeledItem, listLabeledItem } from "../../src/controllers/items";
const { Recyclery, Category, User } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    await Recyclery.create({
        name: "recyclerie test",
        address: "address test",
        phone: "0123456789",
        email: "recyclery@test.com",
        // manager_id,
        city: "orgelet",
        postal_code: "39270"
    })
    await Category.create({ name: "a" })
    await Category.create({ name: "b" })
    await User.create({ email: "a@example.com" })

})

describe("item controller functions", () => {

    it("should create an item", async () => {
        const body = {
            name: "testitem",
            // description,
            category_id: 1,
            subcategory_id: 2,
            weight: 5,
            price: 1000,
            // cost,
            // condition_state,
            // location,
            // arrival_id,
            // purchase_price,
            selling_price: 1000,
            recyclery_id: 1
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await createLabeledItem(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Article créé avec succès",
                item: expect.any(Object),
            })
        );
    });

    it("should list items", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
        };

        await listLabeledItem(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                items: expect.any(Array), success: true
            })
        );
    });

    it("should delete items", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
        };

        await deleteLabeledItem(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Article supprimé avec succès", "success": true })
        );
    });

});
