import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { build } from 'vite';
import { generateRenderEntryCode } from '../dist/render-entry-code.js';

const cases = [
  ['Windows path', String.raw`C:\Users\test\rendiv\src\index.tsx`, 'C:/Users/test/rendiv/src/index.tsx'],
  ['numeric Windows directory', String.raw`D:\videos\2025\src\index.tsx`, 'D:/videos/2025/src/index.tsx'],
  ['root-relative Windows path', String.raw`\videos\2025\src\index.tsx`, '/videos/2025/src/index.tsx'],
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

test('render entry resolves POSIX filenames containing literal backslashes', { skip: process.platform === 'win32' }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rendiv-entry-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const entryPoint = path.join(directory, String.raw`video\2025.js`);
  await writeFile(entryPoint, 'globalThis.__RENDIV_PATH_TEST__ = true;');
  const virtualEntry = '\0rendiv-render-entry-test';

  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [{
      name: 'render-entry-test',
      resolveId(source) {
        if (source === virtualEntry) return source;
      },
      load(id) {
        if (id === virtualEntry) return generateRenderEntryCode(entryPoint);
      },
    }],
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        input: virtualEntry,
        external: ['@rendiv/core', 'react', 'react-dom/client', 'react-dom'],
      },
    },
  });

  assert.ok(result.output.some((output) => output.type === 'chunk' && output.code.includes('__RENDIV_PATH_TEST__')));
});
