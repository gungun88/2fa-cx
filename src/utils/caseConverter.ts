export interface CaseConversionResult {
  id: string
  label: string
  description: string
  output: string
}

const ENGLISH_WORD_RE = /[A-Za-z]+(?:['\u2019][A-Za-z]+)*(?:-[A-Za-z]+(?:['\u2019][A-Za-z]+)*)*/g

function splitWords(input: string) {
  return input.match(ENGLISH_WORD_RE) || []
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function buildCompound(words: string[], joiner: string, mode: 'lower' | 'upper' | 'title') {
  const normalized = words.map(word => word.replace(/['\u2019-]/g, ' '))
  const flattened = normalized.flatMap(word => word.split(/\s+/).filter(Boolean))

  if (mode === 'lower') {
    return flattened.map(word => word.toLowerCase()).join(joiner)
  }

  if (mode === 'upper') {
    return flattened.map(word => word.toUpperCase()).join(joiner)
  }

  return flattened.map(capitalizeWord).join(joiner)
}

function toSentenceCase(input: string) {
  const lower = input.toLowerCase()
  let shouldUppercase = true

  return Array.from(lower)
    .map(char => {
      if (shouldUppercase && /[a-z]/.test(char)) {
        shouldUppercase = false
        return char.toUpperCase()
      }

      if (/[.!?]/.test(char)) {
        shouldUppercase = true
      }

      return char
    })
    .join('')
}

function toToggleCase(input: string) {
  return Array.from(input)
    .map(char => {
      if (char >= 'a' && char <= 'z') {
        return char.toUpperCase()
      }
      if (char >= 'A' && char <= 'Z') {
        return char.toLowerCase()
      }
      return char
    })
    .join('')
}

function toCamelCase(words: string[]) {
  if (words.length === 0) {
    return ''
  }

  const parts = words
    .map(word => word.replace(/['\u2019-]/g, ' '))
    .flatMap(word => word.split(/\s+/).filter(Boolean))

  return parts
    .map((word, index) => (index === 0 ? word.toLowerCase() : capitalizeWord(word)))
    .join('')
}

function toPascalCase(words: string[]) {
  return words
    .map(word => word.replace(/['\u2019-]/g, ' '))
    .flatMap(word => word.split(/\s+/).filter(Boolean))
    .map(capitalizeWord)
    .join('')
}

export function buildCaseConversionResults(input: string): CaseConversionResult[] {
  const words = splitWords(input)

  return [
    {
      id: 'uppercase',
      label: '\u5168\u90e8\u5927\u5199',
      description: '\u628a\u6240\u6709\u82f1\u6587\u5b57\u6bcd\u8f6c\u6210\u5927\u5199\u3002',
      output: input.toUpperCase(),
    },
    {
      id: 'lowercase',
      label: '\u5168\u90e8\u5c0f\u5199',
      description: '\u628a\u6240\u6709\u82f1\u6587\u5b57\u6bcd\u8f6c\u6210\u5c0f\u5199\u3002',
      output: input.toLowerCase(),
    },
    {
      id: 'title-case',
      label: '\u9996\u5b57\u6bcd\u5927\u5199',
      description: '\u628a\u6bcf\u4e2a\u82f1\u6587\u5355\u8bcd\u7684\u9996\u5b57\u6bcd\u8f6c\u6210\u5927\u5199\u3002',
      output: input.replace(ENGLISH_WORD_RE, word => capitalizeWord(word)),
    },
    {
      id: 'sentence-case',
      label: '\u53e5\u9996\u5927\u5199',
      description: '\u6309\u53e5\u5b50\u89c4\u5219\u5904\u7406\u5927\u5c0f\u5199\u3002',
      output: toSentenceCase(input),
    },
    {
      id: 'toggle-case',
      label: '\u5927\u5c0f\u5199\u53cd\u8f6c',
      description: '\u5927\u5199\u53d8\u5c0f\u5199\uff0c\u5c0f\u5199\u53d8\u5927\u5199\u3002',
      output: toToggleCase(input),
    },
    {
      id: 'camel-case',
      label: '\u5c0f\u9a7c\u5cf0\u5199\u6cd5',
      description: '\u53d8\u91cf\u540d\u5e38\u7528\u7684\u5c0f\u9a7c\u5cf0\u5199\u6cd5\uff0c\u793a\u4f8b\uff1acamelCase\u3002',
      output: toCamelCase(words),
    },
    {
      id: 'pascal-case',
      label: '\u5927\u9a7c\u5cf0\u5199\u6cd5',
      description: '\u7c7b\u540d\u548c\u7ec4\u4ef6\u540d\u5e38\u7528\u7684\u5927\u9a7c\u5cf0\u5199\u6cd5\uff0c\u793a\u4f8b\uff1aPascalCase\u3002',
      output: toPascalCase(words),
    },
    {
      id: 'snake-case',
      label: '\u4e0b\u5212\u7ebf\u547d\u540d',
      description: '\u5355\u8bcd\u5168\u90e8\u5c0f\u5199\uff0c\u4f7f\u7528\u4e0b\u5212\u7ebf\u8fde\u63a5\uff0c\u793a\u4f8b\uff1asnake_case\u3002',
      output: buildCompound(words, '_', 'lower'),
    },
    {
      id: 'kebab-case',
      label: '\u8fde\u5b57\u7b26\u547d\u540d',
      description: '\u5355\u8bcd\u5168\u90e8\u5c0f\u5199\uff0c\u4f7f\u7528\u8fde\u5b57\u7b26\u8fde\u63a5\uff0c\u793a\u4f8b\uff1akebab-case\u3002',
      output: buildCompound(words, '-', 'lower'),
    },
    {
      id: 'constant-case',
      label: '\u5e38\u91cf\u5199\u6cd5',
      description: '\u5e38\u91cf\u540d\u5e38\u7528\u7684\u5168\u90e8\u5927\u5199\u5199\u6cd5\uff0c\u793a\u4f8b\uff1aCONSTANT_CASE\u3002',
      output: buildCompound(words, '_', 'upper'),
    },
    {
      id: 'dot-case',
      label: '\u70b9\u53f7\u547d\u540d',
      description: '\u9002\u5408\u5c42\u7ea7\u6807\u8bc6\u6216\u90e8\u5206\u547d\u540d\u89c4\u5219\uff0c\u793a\u4f8b\uff1adot.case\u3002',
      output: buildCompound(words, '.', 'lower'),
    },
  ]
}
