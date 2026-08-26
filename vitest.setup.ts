import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, vi } from 'vitest';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

(globalThis as any).jasmine = {
  createSpyObj: (_name: string, methods: string[]) => Object.fromEntries(methods.map(method => {
    const spy = vi.fn();
    (spy as any).and = {
      returnValue: (value: unknown) => { spy.mockReturnValue(value); return spy; },
      callFake: (implementation: (...args: any[]) => unknown) => { spy.mockImplementation(implementation); return spy; },
    };
    return [method, spy];
  })),
  any: (constructor: unknown) => expect.any(constructor as any),
};

const resourceCache = new Map<string, string>();

async function findResource(root: string, fileName: string): Promise<string> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) {
      try {
        return await findResource(candidate, fileName);
      } catch {
        continue;
      }
    }
    if (entry.name === fileName) return candidate;
  }
  throw new Error(`Angular test resource not found: ${fileName}`);
}

beforeEach(async () => {
  await resolveComponentResources(async (url: string) => {
    const resourcePath = url.startsWith('file:')
      ? fileURLToPath(url)
      : await findResource(path.resolve(process.cwd(), 'src/app'), path.basename(url));
    const cached = resourceCache.get(resourcePath);
    if (cached) return cached;
    const content = await readFile(resourcePath, 'utf-8');
    resourceCache.set(resourcePath, content);
    return content;
  });
});
