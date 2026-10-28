import { resolve } from "node:path";
import { createArtifacts } from "../../platform/artifacts";
const root = resolve(import.meta.dir, "../../../..");
console.log(JSON.stringify(await createArtifacts(root), null, 2));
