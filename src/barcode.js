// Reads a product barcode (EAN/UPC) from a photo.
// Uses the browser's built-in BarcodeDetector where it exists (Android Chrome);
// iPhone browsers don't have one, so we load a small WebAssembly reader on demand.

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

async function readNative(file) {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter(f => supported.includes(f));
    if (!formats.length) return null;
    const bitmap = await createImageBitmap(file);
    const [code] = await new window.BarcodeDetector({ formats }).detect(bitmap);
    return code?.rawValue || null;
  } catch {
    return null;
  }
}

let wasmReady = null;

async function readWasm(file) {
  const [{ readBarcodes, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  // Serve the .wasm from our own site instead of the library's default CDN.
  wasmReady ??= prepareZXingModule({
    overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
    fireImmediately: true,
  });
  await wasmReady;
  const [result] = await readBarcodes(file, { formats: ['EAN/UPC'], tryHarder: true, tryRotate: true, maxNumberOfSymbols: 1 });
  return result?.text || null;
}

export async function readBarcode(file) {
  return (await readNative(file)) || (await readWasm(file));
}

// EAN-8, UPC-A/E and EAN-13/14 are all 8–14 digits.
export function isBarcode(text) {
  return /^\d{8,14}$/.test(text);
}
