import { expect, jest } from "@jest/globals";
import { createCategorie, deleteCategorie, listCategories, listSubcategories, updateCategorie } from "../../src/v1/controllers/categories";

describe("categories controller functions", () => {

    it("should create a categorie", async () => {
        const body = {
            name: "categorie 1",
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
                category: expect.any(Object),
                success: true,
                message: expect.any(String),
            })
        );
    });
    it("should fail to create a categorie", async () => {
        const body = {
            name: "categorie 1",
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
            name: "categorie 2",
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
                category: expect.any(Object),
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
        it("should update categorie 1", async () => {
        const body = {
            name: "categorie 1.0",
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
                category:expect.objectContaining({name:"categorie 1.0"}),
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
            params: { id: 2 }

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

});
