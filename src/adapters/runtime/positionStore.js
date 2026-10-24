const KEY = 'arcaguard.ui.position.v1';

/** Create an origin-local UI preference store; storage denial never prevents mounting.
 * @param {Window} window Browser window.
 * @returns {{load: Function, save: Function, reset: Function}} Position-only adapter.
 */
export function createPositionStore(window) {
  return {
    load() {
      try {
        const value = JSON.parse(window.localStorage.getItem(KEY));
        if (value?.version === 1 && ['x', 'y'].every((key) =>
          typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1)) {
          return { x: value.x, y: value.y };
        }
      } catch { /* Missing, corrupt or unavailable preferences use the default position. */ }
      return null;
    },
    save(position) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify({ version: 1, ...position }));
        return true;
      } catch { return false; }
    },
    reset() {
      try { window.localStorage.removeItem(KEY); return true; }
      catch { return false; }
    },
  };
}
