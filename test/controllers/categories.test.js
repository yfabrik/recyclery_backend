import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index.js";
import { createCategorie, deleteCategorie, listCategories, listSubcategories, updateCategorie } from "../../src/v1/controllers/categories.js";

beforeAll(async () => {
    await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("categories controller functions", () => {

    it("should create a categorie", async () => {
        const body = {
            name: "Électronique",
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

        await createCategorie(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                category: expect.objectContaining({
                    id: expect.any(Number),
                    name: "Électronique"
                }),
                success: true,
                message: expect.any(String),
            })
        );
    });
    it("should fail to create a duplicate categorie", async () => {
        const body = {
            name: "Électronique",
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

        await createCategorie(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
            })
        );
    });
    it("should create a subcategorie", async () => {
        const body = {
            name: "Ordinateurs",
            parent_id: 1
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

        await createCategorie(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                category: expect.objectContaining({
                    id: expect.any(Number),
                    name: "Ordinateurs",
                    parent_id: 1
                }),
                success: true,
                message: expect.any(String),
            })
        );
    });
    it("should list categories", async () => {
        const body = {

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

        await listCategories(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                categories: expect.any(Array),
                success: true,
            })
        );
    });
    it("should list categories with subcategorie included in it", async () => {
        const body = {

        };
        const req = {
            query: { parent_null: true, include: "Category" },
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listCategories(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                categories: expect.arrayContaining([expect.objectContaining({ parent_id: null, subcategories: expect.any(Array) })]),

                success: true,
            })
        );
    });
    it("should list subcategories", async () => {
        const body = {
            name: "caisse 1",
            store_id: 1
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listSubcategories(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                subcategories: expect.any(Array),
                success: true,
            })
        );
    });
    it("should update categorie", async () => {
        const body = {
            name: "Électronique et Informatique",
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await updateCategorie(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                category: expect.objectContaining({ name: "Électronique et Informatique" }),
                success: true,
            })
        );
    });

    // it("should lfail to delete categorie", async () => {
    //     const req = {
    //         query: { store_id: 1 },
    //         user: { id: 1, role: "admin" },
    //         params: { id: 1 }
    //     };

    //     const res = {
    //         json: jest.fn(),
    //         status: jest.fn().mockReturnThis()

    //     };

    //     await deleteCategorie(req, res);

    //     expect(res.json).toHaveBeenCalledWith(
    //         expect.objectContaining({ success: false })
    //     );
    // });

    it("should  delete categorie", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            params: { id: 1 }

        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()

        };

        await deleteCategorie(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.any(String), success: true })
        );
    });
    it("should list categories with filters", async () => {
        const req = {
            query: { parent_null: true },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listCategories(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                categories: expect.any(Array),
                success: true,
            })
        );
    });

    it("should fail to update non-existent category", async () => {
        const body = {
            name: "Non-existent",
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
            params: { id: 999 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await expect(updateCategorie(req, res)).rejects.toThrow();
    });

});
