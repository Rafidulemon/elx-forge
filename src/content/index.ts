import { initBridge, injectBridge } from './bridge/bridgeController';
import { initConsolePort } from './console/consolePort';
import { initJsCompletionLogging } from './engine/jsInjector';
import { initUrlWatcher } from './engine/urlWatcher';
import { initMessageHandlers } from './messaging/handlers';

initBridge();
injectBridge();
initConsolePort();
initJsCompletionLogging();
initUrlWatcher();
initMessageHandlers();