export interface UserState {
  readIds: Set<string>;
  savedIds: Set<string>;
  starredIds: Set<string>;
  ignoredIds: Set<string>;
  scrollPositions: Record<string, number>;
}

export function createDefaultUserState(): UserState {
  return {
    readIds: new Set<string>(),
    savedIds: new Set<string>(),
    starredIds: new Set<string>(),
    ignoredIds: new Set<string>(),
    scrollPositions: {},
  };
}
