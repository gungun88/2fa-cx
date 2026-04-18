export interface FontVariant {
  id: string
  label: string
  description: string
  transform: (input: string) => string
}

export interface FontVariantResult {
  id: string
  label: string
  description: string
  output: string
}

function mapAsciiRange(
  input: string,
  upperStart: number,
  lowerStart: number,
  digitStart?: number,
  overrides?: Record<string, string>
) {
  return Array.from(input)
    .map(char => {
      if (overrides && overrides[char]) {
        return overrides[char]
      }
      const code = char.codePointAt(0) || 0
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(upperStart + (code - 65))
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(lowerStart + (code - 97))
      }
      if (digitStart !== undefined && code >= 48 && code <= 57) {
        return String.fromCodePoint(digitStart + (code - 48))
      }
      return char
    })
    .join('')
}

const scriptOverrides: Record<string, string> = {
  B: '\u212c', E: '\u2130', F: '\u2131', H: '\u210b', I: '\u2110',
  L: '\u2112', M: '\u2133', R: '\u211b',
  e: '\u212f', g: '\u210a', o: '\u2134',
}

const frakturOverrides: Record<string, string> = {
  C: '\u212d', H: '\u210c', I: '\u2111', R: '\u211c', Z: '\u2128',
}

const doubleStruckOverrides: Record<string, string> = {
  C: '\u2102', H: '\u210d', N: '\u2115', P: '\u2119', Q: '\u211a',
  R: '\u211d', Z: '\u2124',
}

function applyCombiningMark(input: string, mark: string) {
  return Array.from(input)
    .map(char => {
      if (char.trim() === '') {
        return char
      }
      return `${char}${mark}`
    })
    .join('')
}

function toFullWidth(input: string) {
  return Array.from(input)
    .map(char => {
      const code = char.codePointAt(0) || 0
      if (code === 32) {
        return '\u3000'
      }
      if (code >= 33 && code <= 126) {
        return String.fromCodePoint(code + 65248)
      }
      return char
    })
    .join('')
}

function toCircled(input: string) {
  return Array.from(input)
    .map(char => {
      if (char >= '1' && char <= '9') {
        return String.fromCodePoint(9311 + Number(char))
      }
      if (char === '0') {
        return '\u24ea'
      }

      const code = char.codePointAt(0) || 0
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(9398 + (code - 65))
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(9424 + (code - 97))
      }
      return char
    })
    .join('')
}

function toSquared(input: string) {
  return Array.from(input)
    .map(char => {
      const code = char.codePointAt(0) || 0
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1f130 + (code - 65))
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1f130 + (code - 97))
      }
      return char
    })
    .join('')
}

function toNegativeSquared(input: string) {
  return Array.from(input)
    .map(char => {
      const code = char.codePointAt(0) || 0
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1f170 + (code - 65))
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1f170 + (code - 97))
      }
      return char
    })
    .join('')
}

function toNegativeCircled(input: string) {
  return Array.from(input)
    .map(char => {
      const code = char.codePointAt(0) || 0
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1f150 + (code - 65))
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1f150 + (code - 97))
      }
      if (char === '0') {
        return '\u24ff'
      }
      if (char >= '1' && char <= '9') {
        return String.fromCodePoint(0x2775 + Number(char) - 1)
      }
      return char
    })
    .join('')
}

function toParenthesized(input: string) {
  return Array.from(input)
    .map(char => {
      const code = char.codePointAt(0) || 0
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1f110 + (code - 65))
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x249c + (code - 97))
      }
      if (char >= '1' && char <= '9') {
        return String.fromCodePoint(0x2474 + Number(char) - 1)
      }
      return char
    })
    .join('')
}

function toUpsideDown(input: string) {
  const map: Record<string, string> = {
    a: '\u0250', b: 'q', c: '\u0254', d: 'p', e: '\u01DD', f: '\u025F', g: '\u0183',
    h: '\u0265', i: '\u1D09', j: '\u027E', k: '\u029E', l: 'l', m: '\u026F', n: 'u',
    o: 'o', p: 'd', q: 'b', r: '\u0279', s: 's', t: '\u0287', u: 'n', v: '\u028C',
    w: '\u028D', x: 'x', y: '\u028E', z: 'z',
    A: '\u2200', B: '\u{10412}', C: '\u0186', D: '\u15E1', E: '\u018E', F: '\u2132',
    G: '\u2141', H: 'H', I: 'I', J: '\u017F', K: '\u22CA', L: '\u2142', M: 'W',
    N: 'N', O: 'O', P: '\u0500', Q: 'Q', R: '\u1D1A', S: 'S', T: '\u22A5',
    U: '\u2229', V: '\u039B', W: 'M', X: 'X', Y: '\u2144', Z: 'Z',
    '0': '0', '1': '\u21C2', '2': '\u1100', '3': '\u0190', '4': '\u3123', '5': '\u03DB',
    '6': '9', '7': '\u3125', '8': '8', '9': '6',
    '.': '\u02D9', ',': "'", '?': '\u00BF', '!': '\u00A1', '"': ',,', "'": ',',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
    '&': '\u214B', '_': '\u203E',
  }
  return Array.from(input).reverse().map(c => map[c] || c).join('')
}

function toMirrored(input: string) {
  const map: Record<string, string> = {
    a: 'ɒ', b: 'd', c: 'ɔ', d: 'b', e: 'ɘ', f: 'ꟻ', g: 'ǫ', h: 'ʜ',
    i: 'i', j: 'ꞁ', k: 'ʞ', l: 'l', m: 'm', n: 'n', o: 'o', p: 'q',
    q: 'p', r: 'ɿ', s: 'ꙅ', t: 'ƚ', u: 'u', v: 'v', w: 'w', x: 'x',
    y: 'y', z: 'z',
    A: 'A', B: 'ꓭ', C: 'Ɔ', D: 'ꓷ', E: 'Ǝ', F: 'ꟻ', G: 'Ꭾ', H: 'H',
    I: 'I', J: 'Ⴑ', K: 'ꓘ', L: '⅃', M: 'M', N: 'И', O: 'O', P: 'ꟼ',
    Q: 'Ọ', R: 'Я', S: 'Ꙅ', T: 'T', U: 'U', V: 'V', W: 'W', X: 'X',
    Y: 'Y', Z: 'Ƶ',
  }
  return Array.from(input).reverse().map(c => map[c] || c).join('')
}

function toSmallCaps(input: string) {
  const table: Record<string, string> = {
    a: '\u1d00',
    b: '\u0299',
    c: '\u1d04',
    d: '\u1d05',
    e: '\u1d07',
    f: '\ua730',
    g: '\u0262',
    h: '\u029c',
    i: '\u026a',
    j: '\u1d0a',
    k: '\u1d0b',
    l: '\u029f',
    m: '\u1d0d',
    n: '\u0274',
    o: '\u1d0f',
    p: '\u1d18',
    q: 'Q',
    r: '\u0280',
    s: '\ua731',
    t: '\u1d1b',
    u: '\u1d1c',
    v: '\u1d20',
    w: '\u1d21',
    x: 'X',
    y: '\u028f',
    z: '\u1d22',
  }

  return Array.from(input)
    .map(char => table[char.toLowerCase()] || char)
    .join('')
}

export const fontVariants: FontVariant[] = [
  {
    id: 'bold',
    label: '\u7c97\u4f53',
    description: '\u4f7f\u7528 Unicode \u6570\u5b66\u7c97\u4f53\u5b57\u6bcd\u4e0e\u6570\u5b57\u3002',
    transform: input => mapAsciiRange(input, 0x1d400, 0x1d41a, 0x1d7ce),
  },
  {
    id: 'italic',
    label: '\u659c\u4f53',
    description: '\u4f7f\u7528 Unicode \u6570\u5b66\u659c\u4f53\u5b57\u6bcd\u3002',
    transform: input => mapAsciiRange(input, 0x1d434, 0x1d44e),
  },
  {
    id: 'bold-italic',
    label: '\u7c97\u659c\u4f53',
    description: '\u9002\u5408\u793e\u4ea4\u5e73\u53f0\u663e\u793a\u7684\u5f3a\u70c8\u6837\u5f0f\u3002',
    transform: input => mapAsciiRange(input, 0x1d468, 0x1d482),
  },
  {
    id: 'script',
    label: '\u82b1\u4f53\u8349\u4e66',
    description: '\u4f18\u96c5\u7684\u82b1\u4f53\u624b\u5199\u98ce\u683c\uff0c\u9002\u5408\u7b7e\u540d\u3002',
    transform: input => mapAsciiRange(input, 0x1d49c, 0x1d4b6, undefined, scriptOverrides),
  },
  {
    id: 'bold-script',
    label: '\u7c97\u4f53\u82b1\u4f53',
    description: '\u66f4\u7c97\u7684\u82b1\u4f53\u624b\u5199\u98ce\u683c\u3002',
    transform: input => mapAsciiRange(input, 0x1d4d0, 0x1d4ea),
  },
  {
    id: 'fraktur',
    label: '\u54e5\u7279\u4f53',
    description: '\u5177\u6709\u4e2d\u4e16\u7eaa\u98ce\u683c\u7684\u88c5\u9970\u4f53\u3002',
    transform: input => mapAsciiRange(input, 0x1d504, 0x1d51e, undefined, frakturOverrides),
  },
  {
    id: 'bold-fraktur',
    label: '\u7c97\u4f53\u54e5\u7279\u4f53',
    description: '\u7c97\u4f53\u7248\u54e5\u7279\u4f53\uff0c\u6548\u679c\u66f4\u5f3a\u70c8\u3002',
    transform: input => mapAsciiRange(input, 0x1d56c, 0x1d586),
  },
  {
    id: 'sans-serif',
    label: '\u65e0\u886c\u7ebf\u4f53',
    description: '\u7b80\u6d01\u73b0\u4ee3\u7684\u65e0\u886c\u7ebf\u5b57\u4f53\u3002',
    transform: input => mapAsciiRange(input, 0x1d5a0, 0x1d5ba, 0x1d7e2),
  },
  {
    id: 'sans-serif-bold',
    label: '\u65e0\u886c\u7ebf\u7c97\u4f53',
    description: '\u7c97\u4f53\u7684\u65e0\u886c\u7ebf\u98ce\u683c\u3002',
    transform: input => mapAsciiRange(input, 0x1d5d4, 0x1d5ee, 0x1d7ec),
  },
  {
    id: 'sans-serif-italic',
    label: '\u65e0\u886c\u7ebf\u659c\u4f53',
    description: '\u659c\u4f53\u7684\u65e0\u886c\u7ebf\u98ce\u683c\u3002',
    transform: input => mapAsciiRange(input, 0x1d608, 0x1d622),
  },
  {
    id: 'sans-serif-bold-italic',
    label: '\u65e0\u886c\u7ebf\u7c97\u659c\u4f53',
    description: '\u7c97\u659c\u7ed3\u5408\u7684\u65e0\u886c\u7ebf\u6837\u5f0f\u3002',
    transform: input => mapAsciiRange(input, 0x1d63c, 0x1d656),
  },
  {
    id: 'monospace',
    label: '\u7b49\u5bbd\u4f53',
    description: '\u6bcf\u4e2a\u5b57\u7b26\u5360\u7528\u76f8\u540c\u5bbd\u5ea6\u3002',
    transform: input => mapAsciiRange(input, 0x1d670, 0x1d68a, 0x1d7f6),
  },
  {
    id: 'double-struck',
    label: '\u53cc\u7ebf\u4f53',
    description: '\u5e38\u89c1\u4e8e\u663e\u773c\u6807\u9898\u6216\u4e2a\u6027\u7b7e\u540d\u3002',
    transform: input => mapAsciiRange(input, 0x1d538, 0x1d552, 0x1d7d8, doubleStruckOverrides),
  },
  {
    id: 'full-width',
    label: '\u5168\u89d2\u5b57',
    description: '\u628a ASCII \u5b57\u7b26\u8f6c\u6210\u5168\u89d2\u6837\u5f0f\u3002',
    transform: input => toFullWidth(input),
  },
  {
    id: 'circled',
    label: '\u5706\u5708\u5b57',
    description: '\u628a\u82f1\u6587\u548c\u6570\u5b57\u8f6c\u6210\u5706\u5708\u5f62\u6001\u3002',
    transform: input => toCircled(input),
  },
  {
    id: 'small-caps',
    label: '\u5c0f\u578b\u5927\u5199',
    description: '\u9002\u5408\u7b80\u6d01\u7b7e\u540d\u6216\u9898\u5934\u3002',
    transform: input => toSmallCaps(input),
  },
  {
    id: 'underline',
    label: '\u4e0b\u5212\u7ebf',
    description: '\u901a\u8fc7\u7ec4\u5408\u5b57\u7b26\u6dfb\u52a0\u4e0b\u5212\u7ebf\u3002',
    transform: input => applyCombiningMark(input, '\u0332'),
  },
  {
    id: 'strikethrough',
    label: '\u5220\u9664\u7ebf',
    description: '\u901a\u8fc7\u7ec4\u5408\u5b57\u7b26\u6dfb\u52a0\u4e2d\u5212\u7ebf\u3002',
    transform: input => applyCombiningMark(input, '\u0336'),
  },
  {
    id: 'overline',
    label: '\u4e0a\u5212\u7ebf',
    description: '\u901a\u8fc7\u7ec4\u5408\u5b57\u7b26\u6dfb\u52a0\u4e0a\u5212\u7ebf\u3002',
    transform: input => applyCombiningMark(input, '\u0305'),
  },
  {
    id: 'squared',
    label: '\u65b9\u5757\u5b57',
    description: '\u628a\u5b57\u6bcd\u653e\u5165\u65b9\u5f62\u8fb9\u6846\u4e2d\u3002',
    transform: input => toSquared(input),
  },
  {
    id: 'negative-squared',
    label: '\u53cd\u767d\u65b9\u5757',
    description: '\u9ed1\u5e95\u767d\u5b57\u7684\u65b9\u5757\u6548\u679c\u3002',
    transform: input => toNegativeSquared(input),
  },
  {
    id: 'negative-circled',
    label: '\u53cd\u767d\u5706\u5708',
    description: '\u9ed1\u5e95\u767d\u5b57\u7684\u5706\u5708\u5b57\u7b26\u3002',
    transform: input => toNegativeCircled(input),
  },
  {
    id: 'parenthesized',
    label: '\u62ec\u53f7\u4f53',
    description: '\u628a\u5b57\u6bcd\u548c\u6570\u5b57\u5305\u88f9\u5728\u62ec\u53f7\u5185\u3002',
    transform: input => toParenthesized(input),
  },
  {
    id: 'upside-down',
    label: '\u5012\u8f6c\u6587\u5b57',
    description: '\u6587\u5b57\u4e0a\u4e0b\u98a0\u5012\u5e76\u53cd\u5411\u6392\u5217\uff0c\u5341\u5206\u6709\u8da3\u3002',
    transform: input => toUpsideDown(input),
  },
  {
    id: 'mirrored',
    label: '\u955c\u50cf\u6587\u5b57',
    description: '\u6587\u5b57\u5de6\u53f3\u955c\u50cf\u7ffb\u8f6c\uff0c\u9002\u5408\u9690\u79c1\u5206\u4eab\u3002',
    transform: input => toMirrored(input),
  },
]

export function buildFontVariantResults(input: string): FontVariantResult[] {
  return fontVariants.map(variant => ({
    id: variant.id,
    label: variant.label,
    description: variant.description,
    output: variant.transform(input),
  }))
}
