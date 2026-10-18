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
    const errors = await reports();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(error);
  });

  it("reports a message only once", async () => {
    const reports = collectReports();
    const first = new Error("report once");
    report(first);
    report(new Error("report once"));
    const errors = await reports();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(first);
  });

  it("reports a value that is not an Error by its string", async () => {
    const reports = collectReports();
    report("report text");
    report(new Error("report text"));
    expect(await reports()).toHaveLength(1);
  });
});
