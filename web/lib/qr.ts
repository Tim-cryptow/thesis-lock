// A small, dependency-free QR Code encoder (byte mode, error-correction level M).
// It encodes a string into a square matrix of dark/light modules that any QR
// scanner can read. Used to render verification URLs as scannable codes entirely
// in the browser, with no external library or network call.
//
// The numeric arrays below are standard QR Code (ISO/IEC 18004) constants:
// the total codeword count per version and the error-correction block and
// codeword tables. The rest (Galois field, Reed-Solomon, BCH for format and
// version information, masking) is computed at runtime.

// Error-correction level M. The level bits are L=1, M=0, Q=3, H=2.
const EC_LEVEL_BIT = 0;
const EC_COLUMN = 1; // index of the M column in the [L, M, Q, H] tables.

// Total number of codewords (data + error correction) per version. Index 0 is
// unused so the array can be indexed directly by version number.
const CODEWORDS_COUNT = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991,
  1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876,
  3034, 3196, 3362, 3532, 3706,
];

// Error-correction block count per [version][L, M, Q, H].
const EC_BLOCKS_TABLE = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 6, 5, 2, 4, 6, 6, 2,
  5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10,
  17, 16, 6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25, 8, 17, 23, 25, 9, 17, 23, 34,
  9, 18, 25, 30, 10, 20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42, 14,
  28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48, 57, 19, 37, 51, 60, 19,
  38, 53, 63, 20, 40, 56, 66, 21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
];

// Total error-correction codewords per [version][L, M, Q, H].
const EC_CODEWORDS_TABLE = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72, 88, 36, 64, 96, 112,
  40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160, 192, 72, 130, 192, 224, 80, 150, 224, 264, 96,
  176, 260, 308, 104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480,
  168, 308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700, 224, 442, 644,
  750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588, 870, 1050, 336, 644,
  952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260, 420, 784, 1140, 1350, 450, 812, 1200, 1440,
  480, 868, 1290, 1530, 510, 924, 1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570,
  1064, 1590, 1890, 600, 1120, 1680, 1980, 630, 1204, 1770, 2100, 660, 1260, 1860, 2220, 720, 1316,
  1950, 2310, 750, 1372, 2040, 2430,
];

const G15 = 0x537;
const G15_MASK = 0x5412;
const G18 = 0x1f25;

function symbolSize(version: number): number {
  return version * 4 + 17;
}

function ecBlocks(version: number): number {
  return EC_BLOCKS_TABLE[(version - 1) * 4 + EC_COLUMN];
}

function ecTotalCodewords(version: number): number {
  return EC_CODEWORDS_TABLE[(version - 1) * 4 + EC_COLUMN];
}

function charCountBits(version: number): number {
  return version < 10 ? 8 : 16;
}

function byteCapacity(version: number): number {
  const dataBits = (CODEWORDS_COUNT[version] - ecTotalCodewords(version)) * 8;
  return Math.floor((dataBits - 4 - charCountBits(version)) / 8);
}

function bestVersion(byteLength: number): number | null {
  for (let v = 1; v <= 40; v++) {
    if (byteLength <= byteCapacity(v)) return v;
  }
  return null;
}

function bchDigit(value: number): number {
  let digit = 0;
  let data = value;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
}

// Galois field GF(256) with primitive polynomial 0x11d, used for Reed-Solomon.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function polyMul(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  const coeff = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      coeff[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return coeff;
}

function polyMod(dividend: Uint8Array, divisor: Uint8Array): Uint8Array {
  let result = Array.from(dividend);
  while (result.length - divisor.length >= 0) {
    const coeff = result[0];
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMul(divisor[i], coeff);
    }
    let offset = 0;
    while (offset < result.length && result[offset] === 0) offset++;
    result = result.slice(offset);
  }
  return Uint8Array.from(result);
}

function generateECPolynomial(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, EXP[i]]));
  }
  return poly;
}

function reedSolomon(data: Uint8Array, degree: number): Uint8Array {
  const genPoly = generateECPolynomial(degree);
  const padded = new Uint8Array(data.length + degree);
  padded.set(data);
  const remainder = polyMod(padded, genPoly);
  const start = degree - remainder.length;
  if (start > 0) {
    const buff = new Uint8Array(degree);
    buff.set(remainder, start);
    return buff;
  }
  return remainder;
}

// A growable buffer of bits, flushed into whole bytes.
class BitBuffer {
  private bytes: number[] = [];
  private length = 0;

  put(value: number, bits: number): void {
    for (let i = bits - 1; i >= 0; i--) {
      this.putBit((value >>> i) & 1);
    }
  }

  putBit(bit: number): void {
    const byteIndex = this.length >>> 3;
    if (this.bytes.length <= byteIndex) this.bytes.push(0);
    if (bit) this.bytes[byteIndex] |= 0x80 >>> (this.length & 7);
    this.length++;
  }

  getLengthInBits(): number {
    return this.length;
  }

  toBytes(): number[] {
    return this.bytes;
  }
}

function encodeUtf8(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  // Fallback for very old environments.
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return Uint8Array.from(out);
}

function buildCodewords(version: number, data: Uint8Array): Uint8Array {
  const total = CODEWORDS_COUNT[version];
  const ecTotal = ecTotalCodewords(version);
  const dataTotal = total - ecTotal;

  const buffer = new BitBuffer();
  buffer.put(4, 4); // byte mode indicator
  buffer.put(data.length, charCountBits(version));
  for (const byte of data) buffer.put(byte, 8);

  // Terminator and byte padding.
  const capacityBits = dataTotal * 8;
  if (buffer.getLengthInBits() + 4 <= capacityBits) buffer.put(0, 4);
  while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(0);

  const codewords = buffer.toBytes();
  // Fill the remaining data capacity with the pad codewords 0xEC and 0x11.
  const padBytes = [0xec, 0x11];
  let pad = 0;
  while (codewords.length < dataTotal) {
    codewords.push(padBytes[pad % 2]);
    pad++;
  }

  const dataBytes = Uint8Array.from(codewords.slice(0, dataTotal));

  // Split into blocks, compute Reed-Solomon EC per block.
  const blocks = ecBlocks(version);
  const group2Blocks = total % blocks;
  const group1Blocks = blocks - group2Blocks;
  const dataPerGroup1 = Math.floor(dataTotal / blocks);
  const ecCount = Math.floor(total / blocks) - dataPerGroup1;

  const dc: Uint8Array[] = [];
  const ec: Uint8Array[] = [];
  let offset = 0;
  let maxData = 0;
  for (let b = 0; b < blocks; b++) {
    const size = b < group1Blocks ? dataPerGroup1 : dataPerGroup1 + 1;
    const block = dataBytes.slice(offset, offset + size);
    dc.push(block);
    ec.push(reedSolomon(block, ecCount));
    offset += size;
    maxData = Math.max(maxData, size);
  }

  // Interleave data codewords, then EC codewords.
  const out = new Uint8Array(total);
  let index = 0;
  for (let i = 0; i < maxData; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < dc[b].length) out[index++] = dc[b][i];
    }
  }
  for (let i = 0; i < ecCount; i++) {
    for (let b = 0; b < blocks; b++) out[index++] = ec[b][i];
  }
  return out;
}

// Matrix of modules plus a parallel map of reserved (function-pattern) cells.
class Matrix {
  size: number;
  data: Uint8Array;
  reserved: Uint8Array;

  constructor(size: number) {
    this.size = size;
    this.data = new Uint8Array(size * size);
    this.reserved = new Uint8Array(size * size);
  }

  get(row: number, col: number): number {
    return this.data[row * this.size + col];
  }

  set(row: number, col: number, value: boolean, reserved = false): void {
    const i = row * this.size + col;
    this.data[i] = value ? 1 : 0;
    if (reserved) this.reserved[i] = 1;
  }

  isReserved(row: number, col: number): boolean {
    return this.reserved[row * this.size + col] === 1;
  }

  xor(row: number, col: number, value: boolean): void {
    const i = row * this.size + col;
    this.data[i] ^= value ? 1 : 0;
  }
}

function setupFinder(m: Matrix): void {
  const size = m.size;
  const positions = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [row, col] of positions) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue;
        const dark =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m.set(row + r, col + c, dark, true);
      }
    }
  }
}

function setupTiming(m: Matrix): void {
  for (let r = 8; r < m.size - 8; r++) {
    const value = r % 2 === 0;
    m.set(r, 6, value, true);
    m.set(6, r, value, true);
  }
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const posCount = Math.floor(version / 7) + 2;
  const size = symbolSize(version);
  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
  const positions = [size - 7];
  for (let i = 1; i < posCount - 1; i++) {
    positions[i] = positions[i - 1] - intervals;
  }
  positions.push(6);
  return positions.reverse();
}

function setupAlignment(m: Matrix, version: number): void {
  const pos = alignmentPositions(version);
  const len = pos.length;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === len - 1) || (i === len - 1 && j === 0)) {
        continue;
      }
      const row = pos[i];
      const col = pos[j];
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const dark = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          m.set(row + r, col + c, dark, true);
        }
      }
    }
  }
}

function versionInfoBits(version: number): number {
  let d = version << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) {
    d ^= G18 << (bchDigit(d) - bchDigit(G18));
  }
  return (version << 12) | d;
}

function setupVersionInfo(m: Matrix, version: number): void {
  if (version < 7) return;
  const size = m.size;
  const bits = versionInfoBits(version);
  for (let i = 0; i < 18; i++) {
    const row = Math.floor(i / 3);
    const col = (i % 3) + size - 8 - 3;
    const mod = ((bits >> i) & 1) === 1;
    m.set(row, col, mod, true);
    m.set(col, row, mod, true);
  }
}

function formatInfoBits(mask: number): number {
  const data = (EC_LEVEL_BIT << 3) | mask;
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) {
    d ^= G15 << (bchDigit(d) - bchDigit(G15));
  }
  return ((data << 10) | d) ^ G15_MASK;
}

function setupFormatInfo(m: Matrix, mask: number): void {
  const size = m.size;
  const bits = formatInfoBits(mask);
  for (let i = 0; i < 15; i++) {
    const mod = ((bits >> i) & 1) === 1;
    if (i < 6) m.set(i, 8, mod, true);
    else if (i < 8) m.set(i + 1, 8, mod, true);
    else m.set(size - 15 + i, 8, mod, true);

    if (i < 8) m.set(8, size - i - 1, mod, true);
    else if (i < 9) m.set(8, 15 - i - 1 + 1, mod, true);
    else m.set(8, 15 - i - 1, mod, true);
  }
  m.set(size - 8, 8, true, true);
}

function setupData(m: Matrix, codewords: Uint8Array): void {
  const size = m.size;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (!m.isReserved(row, col - c)) {
          let dark = false;
          if (byteIndex < codewords.length) {
            dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
          }
          m.set(row, col - c, dark);
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }
      row += inc;
      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
}

function maskAt(pattern: number, i: number, j: number): boolean {
  switch (pattern) {
    case 0:
      return (i + j) % 2 === 0;
    case 1:
      return i % 2 === 0;
    case 2:
      return j % 3 === 0;
    case 3:
      return (i + j) % 3 === 0;
    case 4:
      return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5:
      return ((i * j) % 2) + ((i * j) % 3) === 0;
    case 6:
      return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    default:
      return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
  }
}

function applyMask(m: Matrix, pattern: number): void {
  for (let col = 0; col < m.size; col++) {
    for (let row = 0; row < m.size; row++) {
      if (m.isReserved(row, col)) continue;
      m.xor(row, col, maskAt(pattern, row, col));
    }
  }
}

function penalty(m: Matrix): number {
  const size = m.size;
  let points = 0;

  // Rule 1: runs of 5+ same-colored modules in rows and columns.
  for (let row = 0; row < size; row++) {
    let sameCol = 0;
    let sameRow = 0;
    let lastCol = -1;
    let lastRow = -1;
    for (let col = 0; col < size; col++) {
      let mod = m.get(row, col);
      if (mod === lastCol) sameCol++;
      else {
        if (sameCol >= 5) points += 3 + (sameCol - 5);
        lastCol = mod;
        sameCol = 1;
      }
      mod = m.get(col, row);
      if (mod === lastRow) sameRow++;
      else {
        if (sameRow >= 5) points += 3 + (sameRow - 5);
        lastRow = mod;
        sameRow = 1;
      }
    }
    if (sameCol >= 5) points += 3 + (sameCol - 5);
    if (sameRow >= 5) points += 3 + (sameRow - 5);
  }

  // Rule 2: 2x2 blocks of the same color.
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const sum =
        m.get(row, col) + m.get(row, col + 1) + m.get(row + 1, col) + m.get(row + 1, col + 1);
      if (sum === 4 || sum === 0) points += 3;
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns in rows and columns.
  for (let row = 0; row < size; row++) {
    let bitsCol = 0;
    let bitsRow = 0;
    for (let col = 0; col < size; col++) {
      bitsCol = ((bitsCol << 1) & 0x7ff) | m.get(row, col);
      if (col >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) points += 40;
      bitsRow = ((bitsRow << 1) & 0x7ff) | m.get(col, row);
      if (col >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) points += 40;
    }
  }

  // Rule 4: deviation of dark-module proportion from 50%.
  let dark = 0;
  for (let i = 0; i < m.data.length; i++) dark += m.data[i];
  const k = Math.abs(Math.ceil((dark * 100) / m.data.length / 5) - 10);
  points += k * 10;

  return points;
}

function bestMask(m: Matrix): number {
  let best = 0;
  let lowest = Infinity;
  for (let p = 0; p < 8; p++) {
    setupFormatInfo(m, p);
    applyMask(m, p);
    const score = penalty(m);
    applyMask(m, p);
    if (score < lowest) {
      lowest = score;
      best = p;
    }
  }
  return best;
}

export type QRMatrix = {
  size: number;
  modules: boolean[][];
};

export type QREncodeOptions = {
  // Force a version or mask; used by tests. Production callers omit these.
  version?: number;
  mask?: number;
};

/**
 * Encode a string into a QR Code module matrix (byte mode, EC level M).
 * Throws if the data is too large for the largest QR version.
 */
export function encode(value: string, options: QREncodeOptions = {}): QRMatrix {
  const data = encodeUtf8(value);
  const version = options.version ?? bestVersion(data.length);
  if (!version) {
    throw new Error("Data is too large to encode in a QR Code");
  }

  const codewords = buildCodewords(version, data);
  const m = new Matrix(symbolSize(version));

  setupFinder(m);
  setupTiming(m);
  setupAlignment(m, version);
  setupFormatInfo(m, 0); // reserve the format region before masking
  setupVersionInfo(m, version);
  setupData(m, codewords);

  const mask = options.mask ?? bestMask(m);
  applyMask(m, mask);
  setupFormatInfo(m, mask);

  const modules: boolean[][] = [];
  for (let row = 0; row < m.size; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < m.size; col++) line.push(m.get(row, col) === 1);
    modules.push(line);
  }
  return { size: m.size, modules };
}
