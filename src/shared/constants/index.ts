import type { Settings } from '../types/settings';

export const APP_NAME = 'ELX Forge';
export const APP_VERSION = '0.1.0';
export const INJECTED_VERSION = '0.1.0';

/** postMessage source identifiers between content (isolated world) and injected (main world). */
export const BRIDGE_SOURCE = 'elx:injected';
export const CONTENT_SOURCE = 'elx:content';

/** data attribute used to mark injected tags so we can find/remove them later. */
export const ELX_ATTR = 'data-elx';

export const MAX_CONSOLE_HISTORY = 500;

/** Starter JS written into every new experiment. */
export const DEFAULT_EXPERIMENT_JS = `(() => {
  function waitForElem(
    waitFor,
    callback,
    minElements = 1,
    isVariable = false,
    timer = 10000,
    frequency = 25
  ) {
    let elements = isVariable
      ? window[waitFor]
      : document.querySelectorAll(waitFor);
    if (timer <= 0) return;
    (!isVariable && elements.length >= minElements) ||
      (isVariable && typeof window[waitFor] !== "undefined")
      ? callback(elements)
      : setTimeout(
          () =>
            waitForElem(
              waitFor,
              callback,
              minElements,
              isVariable,
              timer - frequency
            ),
          frequency
        );
  }

  function mainJs([body]) {
    console.log("ELX-Forge is connected")
  }

  waitForElem("body", mainJs);
})();`;

/** Starter CSS written into every new experiment (CSS is the default style mode). */
export const DEFAULT_EXPERIMENT_CSS = `html::before {
  content: "ELX-Forge Connected";
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999999999;
  background: #ff6a00ff;
  color: #000000;
  padding: 10px;
  border: 7px solid #000000;
}`;

/** Starter SCSS (available via the editor's CSS/SCSS toggle). */
export const DEFAULT_EXPERIMENT_SCSS = `html {
  position: relative;

  &::before {
    content: "ELX-Forge Connected";
    position: fixed;
    top: 0;
    left: 0;
    z-index: 99999999999;
    background: #ff6a00ff;
    color: #000000;
    padding: 10px;
    border: 7px solid #000000;
  }
}`;

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'dark',
  editorFontSize: 14,
  tabSize: 2,
  wordWrap: false,
  autoSave: true,
  showMinimap: true,
};