import { describe, expect, it, vi } from "vitest";
import { deleteArchiveSnapshot } from "./archiveSnapshotDeletion.js";

describe("deleteArchiveSnapshot", () => {
  it("deletes only the requested ARCHIVE snapshot", async () => {
    const kv = {
      get: vi.fn().mockResolvedValue({ tournament: { slug: "archive-slug" } }),
      delete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn()
    };

    await deleteArchiveSnapshot({ "lol-stats-kv": kv }, "archive-slug");

    expect(kv.delete).toHaveBeenCalledOnce();
    expect(kv.delete).toHaveBeenCalledWith("ARCHIVE_archive-slug");
    expect(kv.put).not.toHaveBeenCalled();
  });
});
