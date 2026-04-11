export interface CaseConversionResult {
  id: string
  name: string
  description: string
  output: string
}

const WORD_REGEX = /[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+(?:['’][A-Za-z]+)*)*/g
const MINOR_TITLE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'if',
  'in',
  'into',
  'nor',
  'of',
  'on',
  'onto',
  'or',
  'over',
  'per',
  'so',
  'the',
  'to',
  'up',
  'upon',
  'via',
  'vs',
  'yet',
])

function buildPreserveMap(input: string) {
  const map = new Map<string, string>()

  input
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(item => {
      map.set(item.toLowerCase(), item)
    })

  return map
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function capitalizeHyphenatedWord(
  word: string,
  options?: {
    allowMinorWords?: boolean
  }
) {
  const allowMinorWords = options?.allowMinorWords ?? false

  return word
    .split('-')
    .map((segment, index, segments) => {
      const lower = segment.toLowerCase()
      const isMinorWord = MINOR_TITLE_WORDS.has(lower)
      const isBoundarySegment = index === 0 || index === segments.length - 1

      if (allowMinorWords && isMinorWord && !isBoundarySegment) {
        return lower
      }

      return capitalizeWord(segment)
    })
    .join('-')
}

function replaceWords(
  input: string,
  preserveMap: Map<string, string>,
  transform: (word: string, index: number, words: string[]) => string
) {
  const words = Array.from(input.matchAll(WORD_REGEX), match => match[0])
  let wordIndex = 0

  return input.replace(WORD_REGEX, word => {
    const preserved = preserveMap.get(word.toLowerCase())
    if (preserved) {
      wordIndex += 1
      return preserved
    }

    const nextWord = transform(word, wordIndex, words)
    wordIndex += 1
    return nextWord
  })
}

function transformSentenceCase(input: string, preserveMap: Map<string, string>) {
  let capitalizeNext = true
  let lastIndex = 0
  let output = ''

  for (const match of input.matchAll(WORD_REGEX)) {
    const word = match[0]
    const start = match.index ?? 0
    const end = start + word.length
    const delimiter = input.slice(lastIndex, start)

    output += delimiter

    if (lastIndex !== 0 && (/[.!?]/.test(delimiter) || /\n\s*\n/.test(delimiter))) {
      capitalizeNext = true
    }

    const preserved = preserveMap.get(word.toLowerCase())
    if (preserved) {
      output += preserved
    } else {
      output += capitalizeNext ? capitalizeWord(word) : word.toLowerCase()
    }

    capitalizeNext = false
    lastIndex = end
  }

  return output + input.slice(lastIndex)
}

function transformTitleCase(input: string, preserveMap: Map<string, string>) {
  const matches = Array.from(input.matchAll(WORD_REGEX))
  let lastIndex = 0
  let output = ''

  matches.forEach((match, index) => {
    const word = match[0]
    const start = match.index ?? 0
    const end = start + word.length
    const delimiter = input.slice(lastIndex, start)

    output += delimiter

    const preserved = preserveMap.get(word.toLowerCase())
    if (preserved) {
      output += preserved
      lastIndex = end
      return
    }

    const isFirstWord = index === 0
    const isLastWord = index === matches.length - 1
    const shouldForceCapitalize = /[:.!?]/.test(delimiter) || /\n\s*\n/.test(delimiter)
    const lower = word.toLowerCase()

    if (!isFirstWord && !isLastWord && !shouldForceCapitalize && MINOR_TITLE_WORDS.has(lower)) {
      output += lower
    } else {
      output += capitalizeHyphenatedWord(word, { allowMinorWords: true })
    }

    lastIndex = end
  })

  return output + input.slice(lastIndex)
}

export function countEnglishWords(input: string) {
  return Array.from(input.matchAll(WORD_REGEX)).length
}

export function buildCaseConversionResults(input: string, preservedTerms: string): CaseConversionResult[] {
  const preserveMap = buildPreserveMap(preservedTerms)

  return [
    {
      id: 'lowercase',
      name: '全部转小写',
      description: '全部转成小写，适合规范化文本或做基础比对。',
      output: replaceWords(input, preserveMap, word => word.toLowerCase()),
    },
    {
      id: 'uppercase',
      name: '全部转大写',
      description: '全部转成大写，常用于强调短句、代号或标签。',
      output: replaceWords(input, preserveMap, word => word.toUpperCase()),
    },
    {
      id: 'capitalize-words',
      name: '每个单词首字母大写',
      description: '每个单词首字母大写，适合人名、标题或列表项。',
      output: replaceWords(input, preserveMap, word => capitalizeHyphenatedWord(word)),
    },
    {
      id: 'sentence-case',
      name: '句首字母大写',
      description: '句首字母大写，其余单词默认转小写，更接近自然书写。',
      output: transformSentenceCase(input, preserveMap),
    },
    {
      id: 'title-case',
      name: '标题格式大写',
      description: '标题格式，自动保留常见虚词小写，并支持自定义保留词。',
      output: transformTitleCase(input, preserveMap),
    },
  ]
}
