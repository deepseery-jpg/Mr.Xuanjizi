// ============================================================
// oracles.ts —— 占卜符号数据（自包含，无外部依赖）
//   1. 卢恩符文 Elder Futhark（24 枚）
//   2. 伊法 Ifá 十六主奥都（Odù Mérìndínlógún）
//   3. 西方/阿拉伯地占 Geomancy（Ilm al-Raml）十六形
// ============================================================

// ===== 卢恩符文 Elder Futhark =====

export interface Rune {
  /** Unicode 卢恩字符，如 'ᚠ' */
  char: string
  /** 拉丁转写名，如 'Fehu' */
  name: string
  /** 中文名 + 义，如 '菲胡 · 财富' */
  cn: string
  /** 三族（Aett）：1 弗雷族 / 2 海姆达尔族 / 3 提尔族 */
  aett: 1 | 2 | 3
  /** 中文关键词（2-3 个） */
  keywords: string[]
  /** 正位含义 */
  meaning: string
  /** 逆位含义；不可逆符文（Gebo、Hagalaz、Isa、Jera、Eihwaz、Sowilo、Ingwaz、Dagaz、Othala）省略此字段 */
  reversed?: string
}

export const RUNES: Rune[] = [
  {
    char: 'ᚠ',
    name: 'Fehu',
    cn: '菲胡 · 财富',
    aett: 1,
    keywords: ['财富', '丰盛', '新起点'],
    meaning: '传统象义上，菲胡关乎财富与丰盛的流动。它象征可见资产、初获成果与交换循环，可观察所得、分享与资源流向之间的关系。',
    reversed: '财物流失、计划受挫或过度沉迷物质成为逆位主题。它象征金钱关系中的失衡、贪婪与浪费，也指向根基是否稳固。',
  },
  {
    char: 'ᚢ',
    name: 'Uruz',
    cn: '乌鲁兹 · 原力',
    aett: 1,
    keywords: ['力量', '体力', '意志'],
    meaning: '野牛般的原始力量正在体内苏醒。乌鲁兹代表体力、耐力与突破困境的勇气，传统象义上提示先观察自身状态与可持续的韧性。',
    reversed: '力量被误用或正在流失，疲惫、退缩与错失良机的主题浮现。传统象义上提示活动力与节奏需复核。',
  },
  {
    char: 'ᚦ',
    name: 'Thurisaz',
    cn: '瑟里萨兹 · 荆棘',
    aett: 1,
    keywords: ['考验', '防御', '冲突'],
    meaning: '巨人之力与荆棘之刺并存。瑟里萨兹象征考验、防御与反击的张力，传统象义上提示冲突边界与风险信号需要被辨认。',
    reversed: '固执与鲁莽象征麻烦的来源，或有潜藏的威胁正被忽视。逆位提示意气、阵脚与眼前纷争之间的关系值得复核。',
  },
  {
    char: 'ᚨ',
    name: 'Ansuz',
    cn: '安苏兹 · 神谕',
    aett: 1,
    keywords: ['讯息', '智慧', '沟通'],
    meaning: '神明的气息带来启示。安苏兹象征重要讯息、灵感与长者的忠告，留心倾听周遭的话语，线索可能逐渐浮现。',
    reversed: '沟通受阻，讯息被曲解，或有人言不由衷。逆位象征流言、误会与弦外之音，并不替代现实中的重要决定。',
  },
  {
    char: 'ᚱ',
    name: 'Raidho',
    cn: '莱多 · 旅程',
    aett: 1,
    keywords: ['旅行', '节奏', '方向'],
    meaning: '车轮已经转动，旅程感浮现。莱多代表身体或心灵的远行，传统象义上关乎节奏、方向与现实条件是否一致。',
    reversed: '行程受阻、计划延误，或人生节奏被外力打乱。逆位象征路线、节奏与启程时机的错位，可观察阻力来自何处。',
  },
  {
    char: 'ᚲ',
    name: 'Kenaz',
    cn: '肯纳兹 · 火炬',
    aett: 1,
    keywords: ['启迪', '创造', '热情'],
    meaning: '火炬照亮黑暗，灵感如火焰跃动。肯纳兹象征创造力、技艺与顿悟，也提示观察学习、创作与热情被点亮的契机。',
    reversed: '火光黯淡，热情消退，思路陷入迷雾。逆位肯纳兹象征错觉、消沉与心火转弱，灵感重燃只是周期图像。',
  },
  {
    char: 'ᚷ',
    name: 'Gebo',
    cn: '给波 · 礼物',
    aett: 1,
    keywords: ['馈赠', '伙伴', '平衡'],
    meaning: '礼物与情谊正在交换之中。给波象征慷慨、结盟与爱的承诺，施与受需保持平衡，真诚的互动更容易形成回响。',
  },
  {
    char: 'ᚹ',
    name: 'Wunjo',
    cn: '温佑 · 喜悦',
    aett: 1,
    keywords: ['喜悦', '和谐', '圆满'],
    meaning: '云开雾散，喜悦降临。温佑传统象义上象征愿望、家庭和睦与同伴间的温情，重点是圆满感与喜悦氛围，而非结果保证。',
    reversed: '快乐被延迟，或表面的和谐之下暗藏失落。调整过高的期望，莫沉溺于幻想，真正的喜悦源于内心的安定。',
  },
  {
    char: 'ᚺ',
    name: 'Hagalaz',
    cn: '哈格拉兹 · 冰雹',
    aett: 2,
    keywords: ['骤变', '破坏', '洗礼'],
    meaning: '冰雹骤降，旧有结构在风暴中瓦解。哈格拉兹象征不可控的突变，看似破坏也可被读作洗礼，废墟与新芽同属它的象义。',
  },
  {
    char: 'ᚾ',
    name: 'Nauthiz',
    cn: '瑙提兹 · 需求',
    aett: 2,
    keywords: ['匮乏', '忍耐', '磨砺'],
    meaning: '需求之火在束缚中燃烧。瑙提兹象征匮乏、限制、忍耐与自律，传统象义上把欠缺与韧性的生成放在同一幅图里。',
    reversed: '困顿感加深，或提示方向上有强求之象。传统象义上偏向限制、需求不明与内外压力并见。',
  },
  {
    char: 'ᛁ',
    name: 'Isa',
    cn: '伊萨 · 冰封',
    aett: 2,
    keywords: ['停滞', '静观', '凝定'],
    meaning: '万物冰封，时间仿佛静止。伊萨传统象义偏向停滞、冻结、静观与内省主题；解冻与再动只作周期图像，不作现实行动指令。',
  },
  {
    char: 'ᛃ',
    name: 'Jera',
    cn: '耶拉 · 丰收',
    aett: 2,
    keywords: ['收获', '周期', '耐心'],
    meaning: '四季轮转，耕耘终见收成。耶拉象征自然周期、积累与回报主题，种子按时成熟是其传统图像而非结果保证。',
  },
  {
    char: 'ᛇ',
    name: 'Eihwaz',
    cn: '艾瓦兹 · 紫杉',
    aett: 2,
    keywords: ['蜕变', '坚韧', '贯通'],
    meaning: '紫杉连接生死两界，坚韧而长青。艾瓦兹传统象义偏向深层蜕变、幽暗穿越与内在支撑主题；新生只是符号图像，不作结果承诺。',
  },
  {
    char: 'ᛈ',
    name: 'Perthro',
    cn: '佩斯罗 · 命运',
    aett: 2,
    keywords: ['命运', '奥秘', '机缘'],
    meaning: '命运之杯已经掷出。佩斯罗象征未知的机缘、隐藏的真相与直觉之力，秘密、时机与不可见变量是可观察主题。',
    reversed: '期待落空或秘密令人不安，侥幸感与失控感并见。传统象义上提示不稳定因素需复核。',
  },
  {
    char: 'ᛉ',
    name: 'Algiz',
    cn: '阿尔吉兹 · 庇护',
    aett: 2,
    keywords: ['守护', '直觉', '警觉'],
    meaning: '麋鹿扬角，守护之力环绕周身。阿尔吉兹象征庇佑、敏锐直觉与边界感，也可指向暗中的支持资源或保护性力量。',
    reversed: '防线出现缺口，或警讯未被看见。逆位阿尔吉兹象征边界变薄、保护不足与潜在风险提示。',
  },
  {
    char: 'ᛊ',
    name: 'Sowilo',
    cn: '索维洛 · 太阳',
    aett: 2,
    keywords: ['成功', '活力', '光明'],
    meaning: '太阳破云而出，光明势不可挡。索维洛象征成功、荣耀与旺盛的生命力，传统象义上呈现目标感、热忱与能量上升。',
  },
  {
    char: 'ᛏ',
    name: 'Tiwaz',
    cn: '提瓦兹 · 正义',
    aett: 3,
    keywords: ['勇气', '正义', '担当'],
    meaning: '战神之箭直指苍穹。提瓦兹象征勇气、荣誉、原则与为正义付出的牺牲，胜负主题强烈，但不构成现实结果承诺。',
    reversed: '信念动摇，或不公与失衡令人灰心。逆位提瓦兹象征原则受扰、冲突意气与目标理由需复核。',
  },
  {
    char: 'ᛒ',
    name: 'Berkano',
    cn: '贝卡诺 · 新生',
    aett: 3,
    keywords: ['新生', '孕育', '滋养'],
    meaning: '桦树抽芽，大地回春。贝卡诺象征诞生、成长与母性的滋养，新计划或阶段萌发是其传统图像。',
    reversed: '成长受阻，计划难产，或家事令人挂心。逆位象征根基照料不足、滋养失衡与欲速则不达的节奏问题。',
  },
  {
    char: 'ᛖ',
    name: 'Ehwaz',
    cn: '埃瓦兹 · 骏马',
    aett: 3,
    keywords: ['进展', '信任', '协作'],
    meaning: '人马合一，稳步前行。埃瓦兹象征信任、忠诚、协作与进展倾向，变化与同行关系是主要可观察线索。',
    reversed: '步调失谐，进展迟滞，或伙伴之间生出嫌隙。逆位象征合作关系中的信任裂缝与节奏错位，如同一匹尚未驯顺的马。',
  },
  {
    char: 'ᛗ',
    name: 'Mannaz',
    cn: '玛纳兹 · 人我',
    aett: 3,
    keywords: ['自我', '人际', '互助'],
    meaning: '人是彼此的镜子。玛纳兹象征自我认知、群体与互助，认清自己的位置，善用他人的智慧，孤木终究难成林。',
    reversed: '孤立感或在人群中迷失自我的主题浮现。逆位曼纳兹象征自欺、误判他人与群体关系失序。',
  },
  {
    char: 'ᛚ',
    name: 'Laguz',
    cn: '拉古兹 · 流水',
    aett: 3,
    keywords: ['直觉', '情感', '潜流'],
    meaning: '水流深处，直觉低语。拉古兹象征情感、梦境与潜意识之力，也提示强行掌控与顺流感之间的张力。',
    reversed: '情绪泛滥或直觉失灵，暗流卷动方向感。逆位拉古兹象征逃避、沉溺与情绪判断需复核。',
  },
  {
    char: 'ᛜ',
    name: 'Ingwaz',
    cn: '英瓦兹 · 种子',
    aett: 3,
    keywords: ['蓄力', '孕育', '圆成'],
    meaning: '种子在暗中饱满，只待破土而出。英瓦兹象征内在蓄积与一个阶段的圆满收束，新周期是象义上的潜势而非时间承诺。',
  },
  {
    char: 'ᛞ',
    name: 'Dagaz',
    cn: '达嘎兹 · 破晓',
    aett: 3,
    keywords: ['破晓', '转机', '觉醒'],
    meaning: '黑夜尽头，晨光乍现。达嘎兹象征觉醒、破晓与转机，传统象义上提示视角更新与蜕变临界感。',
  },
  {
    char: 'ᛟ',
    name: 'Othala',
    cn: '欧瑟拉 · 家业',
    aett: 3,
    keywords: ['传承', '家园', '根基'],
    meaning: '祖辈的土地与智慧象征根基。欧瑟拉象征家业、传承与归属, 以根之所在安身立命。',
  },
]

// ===== 伊法 Ifá 十六主奥都 =====

export interface Odu {
  /** 0-15，经典顺序 */
  idx: number
  /** 约鲁巴名（ASCII 转写） */
  name: string
  /** 中文音译 */
  cn: string
  /** 四行刻记，1=单线(I) 2=双线(II)，自上而下 */
  marks: [number, number, number, number]
  /** 主题（2-4 字） */
  theme: string
  /** 含义（侧重人生指引） */
  meaning: string
}

export const ODU_16: Odu[] = [
  {
    idx: 0,
    name: 'Ogbe',
    cn: '奥格贝',
    marks: [1, 1, 1, 1],
    theme: '光明开端',
    meaning: '众奥都之首，纯粹的光与生命之气。传统象义上象征崭新的开始、通达与善意助缘，像道路显露而非结果保证；感恩与善行是其精神主题。',
  },
  {
    idx: 1,
    name: 'Oyeku',
    cn: '奥耶库',
    marks: [2, 2, 2, 2],
    theme: '静默转化',
    meaning: '与光相对的深邃黑暗，象征结束、安息与转化。一段旧事正在落幕，黑夜孕育黎明，体面放手与重生感同属这一象义。',
  },
  {
    idx: 2,
    name: 'Iwori',
    cn: '伊沃里',
    marks: [2, 1, 1, 2],
    theme: '洞察',
    meaning: '火焰般的洞察之眼。象征透过表象审视本质、凡事多看一层；内心的觉察与诚实，是厘清眼前疑局的核心主题。',
  },
  {
    idx: 3,
    name: 'Odi',
    cn: '奥迪',
    marks: [1, 2, 2, 1],
    theme: '固守根基',
    meaning: '象征容器与封藏，也关乎家庭与根基。传统象义上偏向守成、内部稳固、裂痕修补与蛰伏蓄养，新局只是潜在主题。',
  },
  {
    idx: 4,
    name: 'Irosun',
    cn: '伊罗孙',
    marks: [1, 1, 2, 2],
    theme: '传承',
    meaning: '与血脉、祖先和历史相连。前人的经验、饮水思源与长辈主题浮现，同时也提示旧日模式可能重复。',
  },
  {
    idx: 5,
    name: 'Owonrin',
    cn: '奥翁林',
    marks: [2, 2, 1, 1],
    theme: '世事无常',
    meaning: '世事翻覆无常，意外与机遇并存。计划或被突然打乱，但混乱之中藏着礼物；保持弹性与幽默，随机应变者自能得福。',
  },
  {
    idx: 6,
    name: 'Obara',
    cn: '奥巴拉',
    marks: [1, 2, 2, 2],
    theme: '富足',
    meaning: '象征富足与言语的力量。谦逊耕耘、回报期待与慎言守诺并列出现，提示语言如何塑造人对现实的理解。',
  },
  {
    idx: 7,
    name: 'Okanran',
    cn: '奥坎兰',
    marks: [2, 2, 2, 1],
    theme: '心志',
    meaning: '独心之卦，考验意志与胆识。传统象义上偏向孤立感、真相逼近与心志凝聚主题；天助之说只作民俗氛围，不作成败承诺。',
  },
  {
    idx: 8,
    name: 'Ogunda',
    cn: '奥贡达',
    marks: [1, 1, 1, 2],
    theme: '开路',
    meaning: '铁与开路之力。象征障碍被辨认、纠葛待分明、工具与技艺显现；传统象义上有开路倾向，但不等同于现实操作指令。',
  },
  {
    idx: 9,
    name: 'Osa',
    cn: '奥萨',
    marks: [2, 1, 1, 1],
    theme: '风暴',
    meaning: '疾风骤起，象征突变与出走。传统象义上偏向依附松动、风暴变局与视野更新主题；转机只作风暴后的象义方向，不作现实保证。',
  },
  {
    idx: 10,
    name: 'Ika',
    cn: '伊卡',
    marks: [2, 1, 2, 2],
    theme: '克制',
    meaning: '蛇之奥都，关乎言语的毒与药。传统象义上偏向口舌是非、暗中算计与言辞锋芒，克制与柔韧是其核心主题。',
  },
  {
    idx: 11,
    name: 'Oturupon',
    cn: '奥图鲁蓬',
    marks: [2, 2, 1, 2],
    theme: '试炼',
    meaning: '象征失衡、考验与坚忍。身心节律、逆境学习与沉甸甸的智慧感并列出现，但不保证现实试炼必然带来收获。',
  },
  {
    idx: 12,
    name: 'Otura',
    cn: '奥图拉',
    marks: [1, 2, 1, 1],
    theme: '平和',
    meaning: '和平与先知之卦，连接更高的灵性。传统象义上关联调解、宽恕、内在指引与温和态度，尊重和助力是可期待的氛围而非承诺。',
  },
  {
    idx: 13,
    name: 'Irete',
    cn: '伊雷特',
    marks: [1, 1, 2, 1],
    theme: '坚韧',
    meaning: '大地般的承压之力。纵有重担与磨损，根系深扎的意象仍在；踏实、坚忍与果实期待构成这则奥都的象征重心。',
  },
  {
    idx: 14,
    name: 'Ose',
    cn: '奥谢',
    marks: [1, 2, 1, 2],
    theme: '喜乐',
    meaning: '甘泉与喜乐之卦。象征复原力、净化与期待逐渐清明，也把分享甘甜、善意回流作为传统象义中的氛围线索。',
  },
  {
    idx: 15,
    name: 'Ofun',
    cn: '奥丰',
    marks: [2, 1, 2, 1],
    theme: '奇迹',
    meaning: '长者与纯白之卦，蕴含无中生有的神秘力量。传统象义上关联奇迹、厚福、敬畏与谦卑，德行被视为承接馈赠的容器。',
  },
]

// ===== 西方/阿拉伯地占 Geomancy (Ilm al-Raml) 十六形 =====

export interface GeomanticFigure {
  /** 小写拉丁键名，如 'via' */
  key: string
  /** 拉丁名，如 'Via' */
  latin: string
  /** 阿拉伯名音译（拉丁转写），如 'Tariq' */
  arabic: string
  /** 中文名，如 '道路' */
  cn: string
  /** 四行点阵，1=一点(奇) 2=两点(偶)，自上而下对应火风水土 */
  rows: [number, number, number, number]
  /** 元素：火/风/水/土 */
  element: string
  /** 对应行星（中文） */
  planet: string
  /** 吉凶 */
  favorable: '吉' | '凶' | '中'
  /** 含义 */
  meaning: string
}

export const GEOMANTIC_FIGURES: GeomanticFigure[] = [
  {
    key: 'via',
    latin: 'Via',
    arabic: 'Tariq',
    cn: '道路',
    rows: [1, 1, 1, 1],
    element: '水',
    planet: '月亮',
    favorable: '中',
    meaning: '孤身上路的旅人，象征变动、过渡与方向的转换。事态正在流转，传统象义上偏向迁移、变化与旧路尽头的新途想象。',
  },
  {
    key: 'populus',
    latin: 'Populus',
    arabic: "Jama'a",
    cn: '民众',
    rows: [2, 2, 2, 2],
    element: '水',
    planet: '月亮',
    favorable: '中',
    meaning: '人群如水，映照众念。象征聚集、随众与被动，事态走向常受周围人心影响；群体氛围与逆流阻力是可观察主题。',
  },
  {
    key: 'conjunctio',
    latin: 'Conjunctio',
    arabic: 'Ijtima',
    cn: '结合',
    rows: [2, 1, 1, 2],
    element: '风',
    planet: '水星',
    favorable: '中',
    meaning: '两股力量在中点相遇。象征联结、契约与十字路口，人与事正在走向汇合；善用沟通促成合作，结果取决于所结之缘。',
  },
  {
    key: 'carcer',
    latin: 'Carcer',
    arabic: 'Uqla',
    cn: '牢狱',
    rows: [1, 2, 2, 1],
    element: '土',
    planet: '土星',
    favorable: '凶',
    meaning: '闭合之环，象征束缚、延迟与孤立。计划受限、推进乏力与沉淀自省并列出现，锁链松动只是象义图像。',
  },
  {
    key: 'fortuna_major',
    latin: 'Fortuna Major',
    arabic: 'Nusra Dakhila',
    cn: '大吉',
    rows: [2, 2, 1, 1],
    element: '土',
    planet: '太阳',
    favorable: '吉',
    meaning: '发自内在的伟大胜利。象征实力、恒心与持久成功的倾向，起步缓慢而后势转强是其传统图像，不保证大局必然倾斜。',
  },
  {
    key: 'fortuna_minor',
    latin: 'Fortuna Minor',
    arabic: 'Nusra Kharija',
    cn: '小吉',
    rows: [1, 1, 2, 2],
    element: '火',
    planet: '太阳',
    favorable: '吉',
    meaning: '自外而来的迅捷助力。象征快速却易逝的顺遂，热度、时机与短暂助力是其核心主题，不输出速战速决的现实处方。',
  },
  {
    key: 'acquisitio',
    latin: 'Acquisitio',
    arabic: 'Qabd Dakhil',
    cn: '获得',
    rows: [2, 1, 2, 1],
    element: '风',
    planet: '木星',
    favorable: '吉',
    meaning: '张开的口袋呈现收纳之象。传统象义上象征获取、增长与财富流入的倾向，也提示积累欲望与分寸之间的张力。',
  },
  {
    key: 'amissio',
    latin: 'Amissio',
    arabic: 'Qabd Kharij',
    cn: '失去',
    rows: [1, 2, 1, 2],
    element: '火',
    planet: '金星',
    favorable: '凶',
    meaning: '倒转的口袋，所握之物正在滑落。象征损失、放手、钱财与情感中的流失感，也可读作腾出双手的转化主题。',
  },
  {
    key: 'albus',
    latin: 'Albus',
    arabic: 'Bayad',
    cn: '白色',
    rows: [2, 2, 1, 2],
    element: '水',
    planet: '水星',
    favorable: '吉',
    meaning: '静水般的澄明智慧。象征和平、思虑与循序渐进，传统象义上偏向理性、安静与清明判断，不承诺必然善果。',
  },
  {
    key: 'rubeus',
    latin: 'Rubeus',
    arabic: 'Humra',
    cn: '红色',
    rows: [2, 1, 2, 2],
    element: '风',
    planet: '火星',
    favorable: '凶',
    meaning: '翻涌的红色激流。象征激情失控、冲突与暗藏的危险，情绪与欲望裹挟感强；缓行与降温是其象征倾向。',
  },
  {
    key: 'puella',
    latin: 'Puella',
    arabic: 'Naqi al-Khadd',
    cn: '少女',
    rows: [1, 2, 1, 1],
    element: '水',
    planet: '金星',
    favorable: '吉',
    meaning: '温柔娴静的少女。象征和谐、美与善意的接纳，人际、情感与合作主题偏顺；以柔相待是象义氛围而非结果承诺。',
  },
  {
    key: 'puer',
    latin: 'Puer',
    arabic: 'Lahyan',
    cn: '少年',
    rows: [1, 1, 2, 1],
    element: '火',
    planet: '火星',
    favorable: '中',
    meaning: '持剑跃马的少年。象征冲劲、勇敢与莽撞，动能强却欠缺深思；开拓象与躁进象并见, 需按所问主题复核。',
  },
  {
    key: 'laetitia',
    latin: 'Laetitia',
    arabic: 'Farha',
    cn: '喜悦',
    rows: [1, 2, 2, 2],
    element: '风',
    planet: '木星',
    favorable: '吉',
    meaning: '高塔上扬起的旗帜。象征喜悦、上升与消息渐明，心境豁然开朗；乘着这股轻盈之气，把善意与支持传递出去。',
  },
  {
    key: 'tristitia',
    latin: 'Tristitia',
    arabic: 'Ankis',
    cn: '悲伤',
    rows: [2, 2, 2, 1],
    element: '土',
    planet: '土星',
    favorable: '凶',
    meaning: '深深钉入大地的木桩。象征低落、迟滞与沉重，传统象义上偏向停顿、扎根、承压与等待主题；不作时来运转承诺。',
  },
  {
    key: 'caput_draconis',
    latin: 'Caput Draconis',
    arabic: 'Ataba Dakhila',
    cn: '龙首',
    rows: [2, 1, 1, 1],
    element: '土',
    planet: '北交点',
    favorable: '吉',
    meaning: '龙首昂起，跨入门内的门槛。象征吉利的开端与新的机缘；入口、条件、方向与善始善终是传统象义中的观察点。',
  },
  {
    key: 'cauda_draconis',
    latin: 'Cauda Draconis',
    arabic: 'Ataba Kharija',
    cn: '龙尾',
    rows: [1, 1, 1, 2],
    element: '火',
    planet: '南交点',
    favorable: '凶',
    meaning: '龙尾扫过，跨出门外的门槛。象征结束、离开与断舍；旧账、退场与清空行囊是传统象义，不作为现实事务处方。',
  },
]
