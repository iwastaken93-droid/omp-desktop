// Generates packages/desktop/build/icon.png — a 256×256 OMP gradient-bar mark
// for Windows. Written with a minimal PNG encoder so no image toolchain is
// required in CI.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIZE = 256;
const OUT = join(import.meta.dir, "..", "packages", "desktop", "build", "icon.png");

// ---- geometry helpers -----------------------------------------------------

function inRoundedRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function logoColor(x: number, y: number): [number, number, number] | null {
  // The OMP mark is a clean, colorful T made from soft-edged vertical bars.
  // Keep the geometry bold enough to survive Windows' small taskbar sizes.
  const inTop = inRoundedRect(x, y, 48, 62, 208, 104, 18);
  const inStem = inRoundedRect(x, y, 108, 88, 148, 198, 18);
  if (!inTop && !inStem) return null;
  const palette: [number, number, number][] = [
    [45, 212, 191],
    [59, 130, 246],
    [124, 92, 255],
    [236, 72, 153],
    [251, 146, 60],
  ];
  const index = Math.max(0, Math.min(palette.length - 1, Math.floor(((x - 48) / 160) * palette.length)));
  return palette[index];
}

// ---- pixel fill -----------------------------------------------------------

const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;

    if (inRoundedRect(x, y, 0, 0, SIZE - 1, SIZE - 1, 56)) {
      // tile: ink with a subtle top-to-bottom lift
      const t = y / SIZE;
      r = Math.round(28 + (44 - 28) * t);
      g = Math.round(25 + (39 - 25) * t);
      b = Math.round(23 + (36 - 23) * t);
      a = 255;
    }
    const logo = a > 0 ? logoColor(x, y) : null;
    if (logo) {
      [r, g, b] = logo;
      a = 255;
    }

    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }
}

// ---- minimal PNG encoder ---------------------------------------------------

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(join(OUT, ".."), { recursive: true });
writeFileSync(OUT, png);
console.log(`[icon] wrote ${OUT} (${png.length} bytes)`);
