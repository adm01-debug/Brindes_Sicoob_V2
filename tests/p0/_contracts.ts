import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

export function source(path: string): string {
  return readFileSync(path, "utf8");
}

export function expectContract(contents: string, fragments: readonly (string | RegExp)[]): void {
  for (const fragment of fragments) {
    if (typeof fragment === "string") expect(contents).toContain(fragment);
    else expect(contents).toMatch(fragment);
  }
}

export function expectInOrder(contents: string, fragments: readonly string[]): void {
  let previous = -1;
  for (const fragment of fragments) {
    const current = contents.indexOf(fragment);
    expect(current, `Trecho ausente: ${fragment}`).toBeGreaterThan(previous);
    previous = current;
  }
}

export function filesRecursively(root: string, suffix = ".ts"): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesRecursively(path, suffix) : path.endsWith(suffix) ? [path] : [];
  });
}
