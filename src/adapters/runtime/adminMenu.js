/** Register an explicit recovery entry; absent APIs leave the keyboard shortcut available.
 * @param {Function} open Open the local administrator screen after a user selection.
 * @param {Function|null} register Injectable Tampermonkey API.
 * @returns {boolean} Whether menu registration succeeded (not a live extension verification).
 */
export function registerAdminMenu(open, register = null) {
  if (!register) return false;
  try {
    register('ArcaGuard 관리자 설정', () => open());
    return true;
  } catch { return false; }
}
