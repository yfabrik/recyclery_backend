import { jest } from "@jest/globals";
import { createRecyclerie, deleteRecyclerie, listRecycleries } from "../../src/controllers/recycleries";

describe("recyclery controller functions", () => {
  it("should create recyclery", async () => {
    const body = {
      name: "recyclerie test",
      address: "address test",
      phone: "0123456789",
      email: "recyclery@test.com",
      // manager_id,
      city: "orgelet",
      postal_code: "39270"

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

    await createRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        recyclery: expect.any(Object),
        // success: true,
        message: "Recyclerie créée avec succès",
      })
    );
  });

  it("should list recyclery", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listRecycleries(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ stores: expect.any(Array) })
    );
  });
  

  it("should delete recyclery", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params:{id:1}
    };

    const res = {
      json: jest.fn(),
    };

    await deleteRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Recyclerie supprimée avec succès" })
    );
  });
});
