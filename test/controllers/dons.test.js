import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { createDon, listDons } from "../../src/controllers/donations";
const { User, Recyclery } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ email: "a@example.com", role: "employee" })
    await Recyclery.create({
        name: "recyclerie test",
        address: "address test",
        phone: "0123456789",
        email: "recyclery@test.com",
        // manager_id,
        city: "orgelet",
        postal_code: "39270"
    })
    

})

describe("dons controller functions", () => {

    it("should create a don", async () => {
        const body = {
            donor_name: "non",
            donor_contact: "0123456789",
            item_description: "non",
            estimated_value: 1

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

        await createDon(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                donation: expect.any(Object)
            })
        );
    });


    it("should list dons", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: {},

        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listDons(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                donations: expect.any(Array)
            })
        );
    });




});
