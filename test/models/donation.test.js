import db from "../../src/models/index";
import { createRecyclery, createUser } from "./helpers.js";

const { Donation } = db;

describe("Donation Model", () => {
  describe("CRUD", () => {
    it("should create a donation", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const d = await Donation.create({
        recyclery_id: recyclery.id,
        received_by: user.id,
        donor_name: "JeanDupont",
        item_description: "Books",
        weight: 1.5,
        status: "pending",
      });
      expect(d.id).toBeDefined();
      expect(d.donor_name).toBe("JeanDupont");
      expect(d.status).toBe("pending");
    });

    it("should read a donation by primary key", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const created = await Donation.create({
        recyclery_id: recyclery.id,
        received_by: user.id,
        item_description: "ReadTest",
        weight: 2,
      });
      const found = await Donation.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.item_description).toBe("ReadTest");
    });

    it("should update a donation", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const created = await Donation.create({
        recyclery_id: recyclery.id,
        received_by: user.id,
        weight: 1,
        status: "pending",
      });
      await created.update({ status: "accepted" });
      const reloaded = await Donation.findByPk(created.id);
      expect(reloaded.status).toBe("accepted");
    });

    it("should delete a donation", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const created = await Donation.create({
        recyclery_id: recyclery.id,
        received_by: user.id,
        weight: 0.5,
      });
      const id = created.id;
      await created.destroy();
      const found = await Donation.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
