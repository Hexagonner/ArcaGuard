import { mountTestPanel } from './ui/testPanel.js';
import { registerUserscriptMenu } from './adapters/runtime/userscriptMenu.js';

mountTestPanel(document, { registerMenu: registerUserscriptMenu });
