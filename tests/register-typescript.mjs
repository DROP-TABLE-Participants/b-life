import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith("@/") ? pathToFileURL(resolve(root, `${specifier.slice(2)}.ts`)).href : specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith("file:") || !url.endsWith(".ts")) return nextLoad(url, context);
    const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return { format: "module", source, shortCircuit: true };
  },
});
