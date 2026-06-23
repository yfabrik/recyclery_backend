import {
  buildPaginationMeta,
  buildUnpaginatedMeta,
  parsePaginationQuery,
} from "../../src/services/pagination";

describe("pagination service", () => {
  describe("parsePaginationQuery", () => {
    it("returns unpaginated mode when page and perPage are absent", () => {
      expect(parsePaginationQuery({ status: "active" })).toEqual({
        paginated: false,
      });
    });

    it("enables pagination when page is present", () => {
      expect(parsePaginationQuery({ page: "2" })).toEqual({
        paginated: true,
        page: 2,
        perPage: 50,
        limit: 50,
        offset: 50,
      });
    });

    it("enables pagination when perPage is present", () => {
      expect(parsePaginationQuery({ perPage: "20" })).toEqual({
        paginated: true,
        page: 1,
        perPage: 20,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe("buildPaginationMeta", () => {
    it("builds full metadata for intermediate page", () => {
      expect(buildPaginationMeta(2, 50, 123)).toEqual({
        page: 2,
        perPage: 50,
        total: 123,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });

    it("handles empty paginated result", () => {
      expect(buildPaginationMeta(1, 50, 0)).toEqual({
        page: 1,
        perPage: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
    });
  });

  describe("buildUnpaginatedMeta", () => {
    it("builds synthetic metadata for full collection response", () => {
      expect(buildUnpaginatedMeta(123)).toEqual({
        page: 1,
        perPage: 123,
        total: 123,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      });
    });

    it("handles empty unpaginated response", () => {
      expect(buildUnpaginatedMeta(0)).toEqual({
        page: 1,
        perPage: 0,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
    });
  });
});
