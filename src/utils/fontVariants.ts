export interface FontVariant {
  id: string
  name: string
  description: string
  transform: (input: string) => string
}

export interface FontVariantResult {
  id: string
  name: string
  description: string
  output: string
}

const ASCII_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ASCII_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const ASCII_DIGITS = '0123456789'
const ASCII_CHARS = `${ASCII_UPPER}${ASCII_LOWER}${ASCII_DIGITS}`

function createCharacterMap(upper: string, lower: string, digits = ASCII_DIGITS) {
  const map = new Map<string, string>()
  const upperChars = Array.from(upper)
  const lowerChars = Array.from(lower)
  const digitChars = Array.from(digits)

  Array.from(ASCII_UPPER).forEach((char, index) => {
    map.set(char, upperChars[index] ?? char)
  })

  Array.from(ASCII_LOWER).forEach((char, index) => {
    map.set(char, lowerChars[index] ?? char)
  })

  Array.from(ASCII_DIGITS).forEach((char, index) => {
    map.set(char, digitChars[index] ?? char)
  })

  return map
}

function transformByMap(input: string, map: Map<string, string>, reverse = false) {
  const chars = Array.from(input)
  const source = reverse ? chars.reverse() : chars
  return source.map(char => map.get(char) ?? char).join('')
}

function createMappedVariant(args: {
  id: string
  name: string
  description: string
  upper: string
  lower: string
  digits?: string
  reverse?: boolean
}): FontVariant {
  const map = createCharacterMap(args.upper, args.lower, args.digits)
  return {
    id: args.id,
    name: args.name,
    description: args.description,
    transform: input => transformByMap(input, map, args.reverse),
  }
}

function createDecoratedVariant(args: {
  id: string
  name: string
  description: string
  mark: string
}): FontVariant {
  return {
    id: args.id,
    name: args.name,
    description: args.description,
    transform: input =>
      Array.from(input)
        .map(char => (ASCII_CHARS.includes(char) ? `${char}${args.mark}` : char))
        .join(''),
  }
}

const smallCapsUpper = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ'
const smallCapsLower = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ'

const superscriptUpper = 'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ'
const superscriptLower = 'ᵃᵇᶜᵈᵉᶠᵍʰᶦʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ'
const superscriptDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹'

const subscriptUpper = 'ₐ₈Cᑯₑբ₉ₕᵢⱼₖₗₘₙₒₚQᵣₛₜᵤᵥwₓᵧZ'
const subscriptLower = 'ₐ♭꜀ᑯₑբ₉ₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓᵧ₂'
const subscriptDigits = '₀₁₂₃₄₅₆₇₈₉'

const upsideDownMap = new Map<string, string>([
  ['A', '∀'],
  ['B', '𐐒'],
  ['C', 'Ɔ'],
  ['D', '◖'],
  ['E', 'Ǝ'],
  ['F', 'Ⅎ'],
  ['G', '⅁'],
  ['H', 'H'],
  ['I', 'I'],
  ['J', 'ſ'],
  ['K', '⋊'],
  ['L', '˥'],
  ['M', 'W'],
  ['N', 'N'],
  ['O', 'O'],
  ['P', 'Ԁ'],
  ['Q', 'Ό'],
  ['R', 'ᴚ'],
  ['S', 'S'],
  ['T', '┴'],
  ['U', '∩'],
  ['V', 'Λ'],
  ['W', 'M'],
  ['X', 'X'],
  ['Y', '⅄'],
  ['Z', 'Z'],
  ['a', 'ɐ'],
  ['b', 'q'],
  ['c', 'ɔ'],
  ['d', 'p'],
  ['e', 'ǝ'],
  ['f', 'ɟ'],
  ['g', 'ɓ'],
  ['h', 'ɥ'],
  ['i', 'ᴉ'],
  ['j', 'ɾ'],
  ['k', 'ʞ'],
  ['l', 'l'],
  ['m', 'ɯ'],
  ['n', 'u'],
  ['o', 'o'],
  ['p', 'd'],
  ['q', 'b'],
  ['r', 'ɹ'],
  ['s', 's'],
  ['t', 'ʇ'],
  ['u', 'n'],
  ['v', 'ʌ'],
  ['w', 'ʍ'],
  ['x', 'x'],
  ['y', 'ʎ'],
  ['z', 'z'],
  ['0', '0'],
  ['1', 'Ɩ'],
  ['2', 'ᄅ'],
  ['3', 'Ɛ'],
  ['4', 'ㄣ'],
  ['5', 'ϛ'],
  ['6', '9'],
  ['7', 'ㄥ'],
  ['8', '8'],
  ['9', '6'],
])

const upsideDownVariant: FontVariant = {
  id: 'upside-down',
  name: 'Upside Down',
  description: '倒置风格，接近参考站常见的装饰型文本。',
  transform: input => transformByMap(input, upsideDownMap, true),
}

export const fontVariants: FontVariant[] = [
  createMappedVariant({
    id: 'bold',
    name: 'Bold',
    description: '适合标题和强调内容。',
    upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
    lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
    digits: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
  }),
  createMappedVariant({
    id: 'italic',
    name: 'Italic',
    description: '斜体风格，更接近手写感。',
    upper: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
    lower: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
  }),
  createMappedVariant({
    id: 'bold-italic',
    name: 'Bold Italic',
    description: '加粗斜体，更醒目。',
    upper: '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁',
    lower: '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛',
  }),
  createMappedVariant({
    id: 'script',
    name: 'Script',
    description: '花体英文的常见样式。',
    upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
    lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
  }),
  createMappedVariant({
    id: 'bold-script',
    name: 'Bold Script',
    description: '更浓一些的花体效果。',
    upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
    lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
  }),
  createMappedVariant({
    id: 'fraktur',
    name: 'Fraktur',
    description: '哥特风，装饰性更强。',
    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
  }),
  createMappedVariant({
    id: 'bold-fraktur',
    name: 'Bold Fraktur',
    description: '更厚重的哥特风花体。',
    upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
    lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
  }),
  createMappedVariant({
    id: 'double-struck',
    name: 'Double Struck',
    description: '黑板粗体，数字也支持。',
    upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
    lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
    digits: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
  }),
  createMappedVariant({
    id: 'sans',
    name: 'Sans',
    description: '无衬线风格，清爽干净。',
    upper: '𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹',
    lower: '𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓',
    digits: '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫',
  }),
  createMappedVariant({
    id: 'sans-bold',
    name: 'Sans Bold',
    description: '适合社媒昵称和简介。',
    upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
    lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
    digits: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
  }),
  createMappedVariant({
    id: 'sans-italic',
    name: 'Sans Italic',
    description: '现代一点的斜体样式。',
    upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
    lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
  }),
  createMappedVariant({
    id: 'sans-bold-italic',
    name: 'Sans Bold Italic',
    description: '现代感和强调感并存。',
    upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
    lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
  }),
  createMappedVariant({
    id: 'monospace',
    name: 'Monospace',
    description: '等宽字符，适合技术风格。',
    upper: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
    lower: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
    digits: '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
  }),
  createMappedVariant({
    id: 'circled',
    name: 'Circled',
    description: '圆圈字母，适合短昵称。',
    upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
    lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
    digits: '⓪①②③④⑤⑥⑦⑧⑨',
  }),
  createMappedVariant({
    id: 'parenthesized',
    name: 'Parenthesized',
    description: '带括号的装饰字符，参考站常见类型之一。',
    upper: '⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵',
    lower: '⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵',
  }),
  createMappedVariant({
    id: 'squared',
    name: 'Squared',
    description: '方框字母，适合做简短标签。',
    upper: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
    lower: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  }),
  createMappedVariant({
    id: 'negative-squared',
    name: 'Negative Squared',
    description: '填充方框字母，视觉更重。',
    upper: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
    lower: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
  }),
  createMappedVariant({
    id: 'fullwidth',
    name: 'Fullwidth',
    description: '全角字符，常见于社媒装饰。',
    upper: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ',
    lower: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
    digits: '０１２３４５６７８９',
  }),
  createMappedVariant({
    id: 'small-caps',
    name: 'Small Caps',
    description: '小型大写风格，适合签名和简介。',
    upper: smallCapsUpper,
    lower: smallCapsLower,
  }),
  createMappedVariant({
    id: 'superscript',
    name: 'Superscript',
    description: '上标样式，装饰感更强。',
    upper: superscriptUpper,
    lower: superscriptLower,
    digits: superscriptDigits,
  }),
  createMappedVariant({
    id: 'subscript',
    name: 'Subscript',
    description: '下标样式，适合做特殊昵称。',
    upper: subscriptUpper,
    lower: subscriptLower,
    digits: subscriptDigits,
  }),
  createDecoratedVariant({
    id: 'underline',
    name: 'Underline',
    description: '下划线装饰型文本。',
    mark: '̲',
  }),
  createDecoratedVariant({
    id: 'double-underline',
    name: 'Double Underline',
    description: '双下划线，强调感更强。',
    mark: '̳',
  }),
  createDecoratedVariant({
    id: 'strikethrough',
    name: 'Strikethrough',
    description: '删除线装饰风格。',
    mark: '̶',
  }),
  createDecoratedVariant({
    id: 'slash-through',
    name: 'Slash Through',
    description: '斜线划过的装饰样式。',
    mark: '̷',
  }),
  createDecoratedVariant({
    id: 'overline',
    name: 'Overline',
    description: '上划线装饰文本。',
    mark: '̅',
  }),
  createDecoratedVariant({
    id: 'double-overline',
    name: 'Double Overline',
    description: '双上划线效果。',
    mark: '̿',
  }),
  upsideDownVariant,
]

export function buildFontVariantResults(input: string): FontVariantResult[] {
  return fontVariants.map(variant => ({
    id: variant.id,
    name: variant.name,
    description: variant.description,
    output: variant.transform(input),
  }))
}
