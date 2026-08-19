export interface ElementInfo {
  selector: string;
  xpath: string;
  tagName: string;
  attributes: Record<string, string>;
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface ElementPickResult {
  target: ElementInfo;
  path: ElementInfo[];
  capturedAt: number;
}