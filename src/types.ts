import type { PDFDocumentProxy, PageViewport } from "pdfjs-dist";
export type Asset = {
  id: string;
  png: Uint8Array;
  width: number;
  height: number;
  preview: string;
};
export type Placement = {
  id: string;
  assetId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type PageInfo = {
  width: number;
  height: number;
  viewport: PageViewport;
};
export type Session = {
  name: string;
  original: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: PageInfo[];
};
