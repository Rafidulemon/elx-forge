import { initConsoleRelay } from './consoleRelay';
import { initMessageRouter, initUserScripts } from './messageRouter';
import { initBadge } from './badge';

initMessageRouter();
initConsoleRelay();
initBadge();

// Register the USER_SCRIPT-world bridge on startup and re-register after an
// extension update (user scripts are cleared on update).
void initUserScripts();
chrome.runtime.onInstalled.addListener(() => {
  void initUserScripts();
});