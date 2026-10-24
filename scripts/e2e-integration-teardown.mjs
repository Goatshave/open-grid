import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

export default async function teardown(config) {
  const { firefoxAppData, ownsFirefoxAppData } = config.metadata;
  if (ownsFirefoxAppData && typeof firefoxAppData === "string" &&
    resolve(dirname(firefoxAppData)) === resolve(tmpdir()) && basename(firefoxAppData).startsWith("open-grid-firefox-app-data-")) {
    try { rmSync(firefoxAppData, { recursive: true, force: true }); }
    catch (error) {
      // macOS can deny removal of browser-created special folders in a temp root.
      if (!["EACCES", "EPERM"].includes(error.code)) throw error;
      console.warn(`Temporary Firefox app data retained for OS cleanup: ${firefoxAppData}`);
    }
  }
}
