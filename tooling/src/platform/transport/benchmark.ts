import { createHostClient } from "@pane-system/host/client";
import { PATTERN } from "../../core/patterns";
export async function connectBenchmark(base: string) {
  const page = await fetch(base);
  const token = (await page.text()).match(PATTERN.HOST_PAGE_TOKEN)?.[1];
  if (!token) throw new Error("Start the demo host before this command.");
  return createHostClient({ base, token });
}
