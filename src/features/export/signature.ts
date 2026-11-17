import type { Asset } from "../../types";

export function signatureBlob(asset: Asset | undefined): Blob {
  if (!asset || !asset.png.length || asset.width <= 0 || asset.height <= 0)
    throw new Error("This signature image is unavailable. Add the signature again.");
  return new Blob([new Uint8Array(asset.png)], { type: "image/png" });
}
