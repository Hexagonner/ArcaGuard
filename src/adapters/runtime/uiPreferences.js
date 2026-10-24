const KEY = 'arcaguard.ui.preferences.v1';

/** Origin-local appearance preferences; invalid or inaccessible data uses visible/unlocked defaults.
 * @param {Window} window Runtime window.
 * @returns {{load: Function, save: Function}} Validated preference adapter.
 */
export function createUiPreferences(window) {
  return {
    load() {
      try {
        const value = JSON.parse(window.localStorage.getItem(KEY));
        if (value?.version === 1 && typeof value.visible === 'boolean' && typeof value.locked === 'boolean') {
          return { visible: value.visible, locked: value.locked };
        }
      } catch { /* Storage denial and malformed input must not hide the recovery controls. */ }
      return { visible: true, locked: false };
    },
    save({ visible, locked }) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify({ version: 1, visible, locked }));
        return true;
      } catch { return false; }
    },
  };
}
