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
  digitStart?: number
) {
  return Array.from(input)
    .map(char => {
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
    id: 'monospace',
    label: '\u7b49\u5bbd\u4f53',
    description: '\u6bcf\u4e2a\u5b57\u7b26\u5360\u7528\u76f8\u540c\u5bbd\u5ea6\u3002',
    transform: input => mapAsciiRange(input, 0x1d670, 0x1d68a, 0x1d7f6),
  },
  {
    id: 'double-struck',
    label: '\u53cc\u7ebf\u4f53',
    description: '\u5e38\u89c1\u4e8e\u663e\u773c\u6807\u9898\u6216\u4e2a\u6027\u7b7e\u540d\u3002',
    transform: input => mapAsciiRange(input, 0x1d538, 0x1d552, 0x1d7d8),
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
]

export function buildFontVariantResults(input: string): FontVariantResult[] {
  return fontVariants.map(variant => ({
    id: variant.id,
    label: variant.label,
    description: variant.description,
    output: variant.transform(input),
  }))
}
