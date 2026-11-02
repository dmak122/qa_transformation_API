import type { TestInfo } from '@playwright/test';

export function addTestDescription(testInfo: TestInfo, description: string): void {
  testInfo.annotations.push({
    type: 'description',
    description,
  });
}
