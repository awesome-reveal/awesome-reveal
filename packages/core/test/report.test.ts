import { report } from "../src/report";
import { collectReports } from "@awesome-reveal/test-utils/reports";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("report", () => {
  it("throws the error from a microtask", async () => {
    const reports = collectReports();
    const error = new Error("report from a microtask");
    report(error);
    expect(await reports()).toEqual([error]);
  });

  it("reports a message only once", async () => {
    const reports = collectReports();
    report(new Error("report once"));
    report(new Error("report once"));
    expect(await reports()).toHaveLength(1);
  });

  it("reports a value that is not an Error by its string", async () => {
    const reports = collectReports();
    report("report text");
    report(new Error("report text"));
    expect(await reports()).toHaveLength(1);
  });
});
