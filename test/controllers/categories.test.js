import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index";
import {
  createCategorie,
  deleteCategorie,
  listCategories,
  patchCategory,
  updateCategorie,
} from "../../src/v1/controllers/categories";
import { makeReq, makeRes } from "./helpers.js";

const { Category } = db;

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
      status: jest.fn().mockReturnThis(),
    };

    await createCategorie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(Number),
          name: "Électronique",
        }),
        success: true,
        message: expect.any(String),
      }),
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
      status: jest.fn().mockReturnThis(),
    };

    await expect(createCategorie(req, res)).rejects.toThrow(
      "Une catégorie avec ce nom existe déjà",
    );
  });
  it("should create a subcategorie", async () => {
    const body = {
      name: "Ordinateurs",
      parent_id: 1,
    };
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createCategorie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(Number),
          name: "Ordinateurs",
          parent_id: 1,
        }),
        success: true,
        message: expect.any(String),
      }),
    );
  });

  it("rejects duplicate subcategory name under same parent", async () => {
    const res = makeRes();
    await expect(
      createCategorie(
        makeReq({ body: { name: "Ordinateurs", parent_id: 1 } }),
        res,
      ),
    ).rejects.toThrow("Une catégorie avec ce nom existe déjà");
  });

  it("allows same subcategory name under different parent", async () => {
    const parentRes = makeRes();
    await createCategorie(
      makeReq({ body: { name: "Meubles" } }),
      parentRes,
    );
    const parentId = parentRes.json.mock.calls[0][0].data.id;

    const res = makeRes();
    await createCategorie(
      makeReq({ body: { name: "Ordinateurs", parent_id: parentId } }),
      res,
    );
    expect(res.json.mock.calls[0][0].data.name).toBe("Ordinateurs");
  });

  it("clears subcategory IO when parent in is disabled", async () => {
    const parentRes = makeRes();
    await createCategorie(makeReq({ body: { name: "IOParent" } }), parentRes);
    const parentId = parentRes.json.mock.calls[0][0].data.id;

    const subRes = makeRes();
    await createCategorie(
      makeReq({ body: { name: "IOSub", parent_id: parentId } }),
      subRes,
    );
    const subId = subRes.json.mock.calls[0][0].data.id;

    const parent = await Category.findByPk(parentId);
    const sub = await Category.findByPk(subId);
    parent.IO = 2;
    sub.IO = 2;
    await parent.save();
    await sub.save();

    const res = makeRes();
    await patchCategory(
      makeReq({ params: { id: parentId }, body: { in: false } }),
      res,
    );

    await sub.reload();
    expect(sub.IO & 2).toBe(0);
  });

  it("enables parent in when subcategory in is enabled", async () => {
    const parentRes = makeRes();
    await createCategorie(makeReq({ body: { name: "IOParent2" } }), parentRes);
    const parentId = parentRes.json.mock.calls[0][0].data.id;

    const subRes = makeRes();
    await createCategorie(
      makeReq({ body: { name: "IOSub2", parent_id: parentId } }),
      subRes,
    );
    const subId = subRes.json.mock.calls[0][0].data.id;

    const parent = await Category.findByPk(parentId);
    const sub = await Category.findByPk(subId);
    parent.IO = 0;
    sub.IO = 0;
    await parent.save();
    await sub.save();

    const res = makeRes();
    await patchCategory(
      makeReq({ params: { id: subId }, body: { in: true } }),
      res,
    );

    await parent.reload();
    expect(parent.IO & 2).toBe(2);
  });

  it("deletes subcategories when parent is deleted", async () => {
    const parentRes = makeRes();
    await createCategorie(makeReq({ body: { name: "ParentDel" } }), parentRes);
    const parentId = parentRes.json.mock.calls[0][0].data.id;

    const subRes = makeRes();
    await createCategorie(
      makeReq({ body: { name: "SubDel", parent_id: parentId } }),
      subRes,
    );

    const delRes = makeRes();
    await deleteCategorie(makeReq({ params: { id: parentId } }), delRes);

    const remaining = await Category.count({ where: { parent_id: parentId } });
    expect(remaining).toBe(0);
  });

  it("should list categories", async () => {
    const body = {};
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listCategories(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        success: true,
      }),
    );
  });
  it("should list categories with subcategorie included in it", async () => {
    const body = {};
    const req = {
      query: { parent_null: true, include: "Category" },
      user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listCategories(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            parent_id: null,
            subcategories: expect.any(Array),
          }),
        ]),

        success: true,
      }),
    );
  });
  it("should list subcategories", async () => {
    const body = {
      name: "caisse 1",
      store_id: 1,
    };
    const req = {
      query: { only_sub: true },
      user: { id: 1, role: "admin" },
      body,
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listCategories(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ parent_id: expect.anything() }),
        ]),
        success: true,
      }),
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
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updateCategorie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Électronique et Informatique",
        }),
        success: true,
      }),
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
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await deleteCategorie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String), success: true }),
    );
  });
  it("should list categories with filters", async () => {
    const req = {
      query: { parent_null: true },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listCategories(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        success: true,
      }),
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
      params: { id: 999 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(updateCategorie(req, res)).rejects.toThrow();
  });
});
