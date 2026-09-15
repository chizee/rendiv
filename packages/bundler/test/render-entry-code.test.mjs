import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'vite';
import { generateRenderEntryCode } from '../dist/render-entry-code.js';

const cases = [
  ['Windows path', String.raw`C:\Users\test\rendiv\src\index.tsx`, 'C:/Users/test/rendiv/src/index.tsx'],
  ['numeric Windows directory', String.raw`D:\videos\2025\src\index.tsx`, 'D:/videos/2025/src/index.tsx'],
  ['Windows path with spaces and apostrophe', String.raw`C:\Users\O'Brien\My Videos\src\index.tsx`, "C:/Users/O'Brien/My Videos/src/index.tsx"],
  ['POSIX path', '/home/user/My Videos/src/index.tsx', '/home/user/My Videos/src/index.tsx'],
  ['POSIX path with quotes', `/home/user/O'Brien/"video"/src/index.tsx`, `/home/user/O'Brien/"video"/src/index.tsx`],
];

for (const [name, entryPoint, expectedImport] of cases) {
  test(`render entry preserves ${name}`, async () => {
    const imports = [];
    const virtualEntry = '\0rendiv-render-entry-test';

    await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [{
        name: 'render-entry-test',
        resolveId(source) {
          if (source === virtualEntry) return source;
          imports.push(source);
          return { id: source, external: true };
        },
        load(id) {
          if (id === virtualEntry) return generateRenderEntryCode(entryPoint);
        },
      }],
      build: {
        write: false,
        minify: false,
        rollupOptions: { input: virtualEntry },
      },
    });

    assert.ok(imports.includes(expectedImport), `Expected ${JSON.stringify(expectedImport)} in ${JSON.stringify(imports)}`);
  });
}
