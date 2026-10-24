import { GM_registerMenuCommand } from 'vite-plugin-monkey/dist/client';
import { registerAdminMenu } from './adminMenu.js';

/** Bind the plugin's sandbox bridge in development and the userscript API in builds.
 * @param {Function} open User-selected settings action.
 * @returns {boolean} Whether registration succeeded.
 */
export function registerUserscriptMenu(open) {
  return registerAdminMenu(open, GM_registerMenuCommand);
}
