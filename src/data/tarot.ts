// 塔罗牌数据：78 张完整牌义（韦特体系）+ 常用牌阵
// 本文件自包含，无外部依赖。

export interface TarotCard {
  id: number          // 0..77。大阿卡纳 0-21（传统编号，0=愚者..21=世界）；小阿卡纳 22..77，按权杖、圣杯、宝剑、星币分组，组内 rank 1..14
  name: string        // 中文名，如 '愚者'、'权杖一'、'圣杯骑士'
  nameEn: string      // 英文名，如 'The Fool'、'Ace of Wands'
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'   // 仅小阿卡纳
  rank?: number       // 仅小阿卡纳，1..14（1=Ace，11=侍从，12=骑士，13=王后，14=国王）
  numeral?: string    // 仅大阿卡纳：'0','I','II',...,'XXI'
  glyph: string       // 一个能唤起牌面意象的 emoji
  keywords: string[]  // 3-4 个中文关键词
  upright: string     // 正位牌义
  reversed: string    // 逆位牌义
}

export const TAROT_CARDS: TarotCard[] = [
  // ─────────── 大阿卡纳 Major Arcana (0-21) ───────────
  {
    id: 0, name: '愚者', nameEn: 'The Fool', arcana: 'major', numeral: '0', glyph: '🃏',
    keywords: ['新开始', '冒险', '纯真', '未知的旅程'],
    upright: '站在悬崖边的不是傻瓜，是尚未被恐惧压住的初始者。传统象义上提示轻装、新始与好奇心；不读成现实行动处方，更像是在观察未知感与开放倾向。',
    reversed: '冲动过头就成了鲁莽。逆位愚者象征草率、缺少退路或因怕犯错而迟迟不敢开始。',
  },
  {
    id: 1, name: '魔术师', nameEn: 'The Magician', arcana: 'major', numeral: 'I', glyph: '🎩',
    keywords: ['创造', '动能', '资源整合', '沟通'],
    upright: '桌上工具齐全：潜能、资源、时机都在手边。传统象义上象征资源整合、表达与显化的倾向，可复核的是想法、工具与沟通是否已经对齐。',
    reversed: '花言巧语与自我说服成为阴影面。逆位魔术师是空转的引擎：计划漂亮却不落地，或聪明用错了地方。',
  },
  {
    id: 2, name: '女祭司', nameEn: 'The High Priestess', arcana: 'major', numeral: 'II', glyph: '📜',
    keywords: ['直觉', '潜意识', '静观', '秘密'],
    upright: '答案不在外面，牌面强调隐约浮现的直觉线索。传统象义上偏向静观、隐秘与潜意识线索；梦境、巧合与未说出口的信息值得被观察。',
    reversed: '直觉的音量像被调成静音，只剩表面信息。逆位女祭司提示：有被隐瞒的实情，或存在逃避内心真实声音的倾向。',
  },
  {
    id: 3, name: '皇后', nameEn: 'The Empress', arcana: 'major', numeral: 'III', glyph: '🌾',
    keywords: ['丰盛', '滋养', '创造力', '感官享受'],
    upright: '万物生长的季节到了：项目开花、关系升温、身心被照顾的图像浮上牌面。传统象义上偏向滋养、丰盛、创造力与感官生命力。',
    reversed: '过度付出把自身掏空，或用溺爱去控制别人，都是逆位皇后的戏码。传统象义上偏向滋养失衡、控制式照护与创造力堵塞。',
  },
  {
    id: 4, name: '皇帝', nameEn: 'The Emperor', arcana: 'major', numeral: 'IV', glyph: '👑',
    keywords: ['秩序', '权威', '责任', '稳固'],
    upright: '皇帝的牌面把混乱画成格子：目标、计划、边界与责任浮到前景。传统象义上象征权威、秩序与结构感，而非保证现实权力必然到手。',
    reversed: '要么暴君，要么甩手掌柜——控制欲过强或完全不肯担责。逆位皇帝象征权威失衡、规则滥用与自律不足。',
  },
  {
    id: 5, name: '教皇', nameEn: 'The Hierophant', arcana: 'major', numeral: 'V', glyph: '⛪',
    keywords: ['传统', '导师', '信念', '体制'],
    upright: '前人踩过的路自有它的道理：导师、体系、惯例与信念框架成为主题。传统象义上提示可观察既有规则如何运作，也留意长者或制度性声音。',
    reversed: '教条开始硌脚了。逆位教皇象征对“向来如此”的怀疑：非常规路线、权威张力与独立思考浮现，也可能只是叛逆感在发声。',
  },
  {
    id: 6, name: '恋人', nameEn: 'The Lovers', arcana: 'major', numeral: 'VI', glyph: '💞',
    keywords: ['爱', '选择', '结合', '价值观'],
    upright: '心动、契合与价值选择同时浮现。这张牌同时是选择题——传统象义上偏向关系结合、价值排序与真诚选择主题。',
    reversed: '心口不一的时刻：关系失衡、价值观打架，或站在岔路口迟迟不敢选。逆位恋人象征逃避选择、价值冲突与联结失衡。',
  },
  {
    id: 7, name: '战车', nameEn: 'The Chariot', arcana: 'major', numeral: 'VII', glyph: '🐎',
    keywords: ['意志力', '胜利', '掌控', '前进'],
    upright: '两匹马一黑一白各想各的，而御者握紧缰绳照样向前。传统象义上象征意志力、方向感与推进势能；牌面焦点在目标清晰度与力量同向性。',
    reversed: '方向盘失灵：要么横冲直撞失了控，要么内耗严重原地打转。逆位战车象征目标未对齐、用力过猛或推进失序。',
  },
  {
    id: 8, name: '力量', nameEn: 'Strength', arcana: 'major', numeral: 'VIII', glyph: '🦁',
    keywords: ['勇气', '温柔的坚定', '自控', '耐心'],
    upright: '驯服狮子靠的不是鞭子，是温柔而坚定的手。传统象义上偏向耐心、柔中有力、安抚情绪与以柔克刚主题。',
    reversed: '内心的狮子在闹脾气：自我怀疑、易怒、或硬撑着不肯求助。逆位力量象征情绪承载、耐心不足与柔性力量失衡。',
  },
  {
    id: 9, name: '隐士', nameEn: 'The Hermit', arcana: 'major', numeral: 'IX', glyph: '🏮',
    keywords: ['独处', '内省', '寻找答案', '智慧'],
    upright: '热闹帮不上忙了，答案在安静里。传统象义上偏向独处、复盘、深度学习与提灯引路人的主题；暂时退场象征内在照明，而非现实建议。',
    reversed: '独处过了头就成了自我封闭：拒接电话、谢绝关心、在洞里越缩越深。逆位隐士象征退隐过度、隔绝与内在照明失衡。',
  },
  {
    id: 10, name: '命运之轮', nameEn: 'Wheel of Fortune', arcana: 'major', numeral: 'X', glyph: '🎡',
    keywords: ['转机', '命运', '周期', '机遇'],
    upright: '轮子转起来了：一个难以完全控制的转折进入视野。传统象义上象征周期、机缘与趋势变化；牌面呈现起落循环，不保证结果必然向好。',
    reversed: '轮子卡住或暂时下行：计划被外力打乱，旧模式又循环了一遍。逆位象征周期受阻与风向未明，可观察哪些变量并不在个人掌控内。',
  },
  {
    id: 11, name: '正义', nameEn: 'Justice', arcana: 'major', numeral: 'XI', glyph: '⚖️',
    keywords: ['公正', '因果', '真相', '抉择'],
    upright: '种什么因结什么果，账本终于翻开了。传统象义上牵涉契约、纠纷、评审、公正与责任份额；重点在事实、尺度与因果的可复核性。',
    reversed: '天平歪了：可能遭遇不公，也可能是自己在双标。逆位正义提示责任份额、证据与偏见需要复核，逃避感本身也是牌面的一部分。',
  },
  {
    id: 12, name: '倒吊人', nameEn: 'The Hanged Man', arcana: 'major', numeral: 'XII', glyph: '🙃',
    keywords: ['换位思考', '暂停', '牺牲', '放手'],
    upright: '倒过来看，世界忽然清晰。传统象义上把停滞、让渡、牺牲与换位视角放在一起；它象征硬冲之外可能存在另一种理解路径。',
    reversed: '牺牲成了自我感动，等待成了拖延借口。逆位倒吊人提示复核这份僵持是否仍产生新领悟，或只是惯性地维持悬置。',
  },
  {
    id: 13, name: '死神', nameEn: 'Death', arcana: 'major', numeral: 'XIII', glyph: '💀',
    keywords: ['结束', '蜕变', '断舍离', '重生'],
    upright: '这张牌在韦特体系里通常不直指现实死亡，而是把阶段落幕、身份更新与旧模式谢幕推到牌面前景；新生只是空位与转化的象义图像。',
    reversed: '明知结束感已经浮现却仍死死攥着不放：过期的关系、耗尽的工作、不再合身的自我。逆位死神象征抗拒变化与延迟转化。',
  },
  {
    id: 14, name: '节制', nameEn: 'Temperance', arcana: 'major', numeral: 'XIV', glyph: '⚗️',
    keywords: ['平衡', '调和', '耐心', '中庸'],
    upright: '两杯水来回倾倒，调出刚刚好的温度。传统象义上关键在调配：时间、心力、分寸各占几成；它象征调和倾向，不承诺现实结果。',
    reversed: '配方失衡了：熬夜配咖啡、暴食配自责，或在两个极端之间反复横跳。逆位节制象征比例失准、节律失衡与调和不足。',
  },
  {
    id: 15, name: '恶魔', nameEn: 'The Devil', arcana: 'major', numeral: 'XV', glyph: '😈',
    keywords: ['诱惑', '成瘾', '束缚', '欲望'],
    upright: '仔细看牌面：锁链画得很松，暗示束缚感与选择空间并存。传统象义上偏向欲望、依附、习惯牵制与选择能力的主题。',
    reversed: '锁链开始松动：某段关系或某个执念的真面目更易被看见。逆位象征束缚感减弱与自我觉察回升，但不等同于现实处境已经改变。',
  },
  {
    id: 16, name: '高塔', nameEn: 'The Tower', arcana: 'major', numeral: 'XVI', glyph: '⚡',
    keywords: ['突变', '崩塌', '真相曝光', '解放'],
    upright: '一道闪电劈开假象：突发变故、计划崩盘、真相曝光。疼是真的，但塌掉的本就是危楼；传统象义上关注地基、结构与真相暴露。',
    reversed: '大楼在晃，却还在给裂缝贴墙纸。逆位高塔象征延迟的崩塌、死撑的危机与结构问题未被处理。',
  },
  {
    id: 17, name: '星星', nameEn: 'The Star', arcana: 'major', numeral: 'XVII', glyph: '⭐',
    keywords: ['希望', '疗愈', '灵感', '信心'],
    upright: '暴风雨后的第一颗星：伤口开始结痂，希望重新上线。传统象义上象征许愿、灵感、疗愈感与缓慢恢复的倾向，不保证愿望必然实现。',
    reversed: '星光被乌云挡住：疲惫、幻灭、觉得努力没有意义。逆位星星象征希望感被遮蔽, 但不作现实结果判断。',
  },
  {
    id: 18, name: '月亮', nameEn: 'The Moon', arcana: 'major', numeral: 'XVIII', glyph: '🌙',
    keywords: ['迷雾', '不安', '幻觉', '潜意识'],
    upright: '月光会骗人：信息不全、真假难辨，焦虑把影子放大成怪物。传统象义上提示迷雾、情绪投射与直觉混杂，可复核的是信息缺口与恐惧来源。',
    reversed: '雾在散：误会澄清、隐情浮出水面，或终于敢直视心底的不安。逆位月亮象征疑问逐渐成形、迷雾开始变薄。',
  },
  {
    id: 19, name: '太阳', nameEn: 'The Sun', arcana: 'major', numeral: 'XIX', glyph: '☀️',
    keywords: ['成功', '喜悦', '活力', '坦荡'],
    upright: '全牌阵里最晒的一张：成功感、活力与被看见的快乐浮上台面。传统象义上偏向明朗、展现、生命力与喜悦主题。',
    reversed: '太阳还在，只是被薄云挡了一下：延迟的成功感、打折的快乐，或强颜欢笑的疲惫。逆位太阳象征明朗度下降与圆满感受阻。',
  },
  {
    id: 20, name: '审判', nameEn: 'Judgement', arcana: 'major', numeral: 'XX', glyph: '📯',
    keywords: ['觉醒', '召唤', '复盘', '第二次机会'],
    upright: '号角吹响：一次彻底的复盘带出内心召唤。传统象义上象征觉醒、召唤与旧事新解，第二次机会更像一种主题而非保证。',
    reversed: '内心的闹钟像被按掉：明明听见召唤却装睡，或困在自我审判里反复清算过去。逆位审判象征迟疑、逃避召唤与难以翻篇。',
  },
  {
    id: 21, name: '世界', nameEn: 'The World', arcana: 'major', numeral: 'XXI', glyph: '🌍',
    keywords: ['圆满', '完成', '整合', '新循环'],
    upright: '一个大循环走到终点：项目收官、学业完成、关系修成正果。享受这份来之不易的完整感，谢幕鞠躬之后，更大的舞台已在候场。',
    reversed: '只差最后一公里却迟迟不收尾：论文差个结论，告别差句再见。逆位世界象征未完成感、收束困难与新循环尚未真正开启。',
  },

  // ─────────── 权杖 Wands (22-35) ───────────
  {
    id: 22, name: '权杖一', nameEn: 'Ace of Wands', arcana: 'minor', suit: 'wands', rank: 1, glyph: '🔥',
    keywords: ['灵感迸发', '新机会', '动能', '热情'],
    upright: '一根还在冒芽的权杖被递出：新项目、新恋情、新灵感等火苗初起之象。传统象义上偏向创意萌发与热度初生。',
    reversed: '打火机按了半天只冒火星：灵感有了却提不起劲，机会来了却时机尴尬。逆位权杖一象征可燃物不足——精力、日程与启动条件都可复核。',
  },
  {
    id: 23, name: '权杖二', nameEn: 'Two of Wands', arcana: 'minor', suit: 'wands', rank: 2, glyph: '🗺️',
    keywords: ['规划', '远见', '抉择', '走出舒适区'],
    upright: '城堡上手握地球仪：眼前成果与远方版图同时出现。传统象义上偏向远眺、扩张、等待回应与外部机会主题。',
    reversed: '地图摊开又合上，机票查了又关掉。逆位权杖二象征远景过大、迟疑与计划落地不足。',
  },
  {
    id: 24, name: '权杖三', nameEn: 'Three of Wands', arcana: 'minor', suit: 'wands', rank: 3, glyph: '⛵',
    keywords: ['扩张', '等待成果', '远景', '合作'],
    upright: '船已出海，高处可见它们陆续归航：前期投入开始显现回响，扩张主题浮现。传统象义上关联远景、外部合作与更大的版图感。',
    reversed: '船在海上堵住了：进度延误、扩张受阻，或期待与现实出现落差。逆位权杖三提示执行环节、外部条件与预期偏差值得复核。',
  },
  {
    id: 25, name: '权杖四', nameEn: 'Four of Wands', arcana: 'minor', suit: 'wands', rank: 4, glyph: '🎉',
    keywords: ['庆祝', '安定', '里程碑', '归属感'],
    upright: '四根权杖搭起花门：搬家、订婚、项目阶段性完工等里程碑之象。传统象义上偏向庆祝、安稳、归属与阶段完成主题。',
    reversed: '庆典延期或屋檐下暗流涌动：家庭失和、过渡期动荡、成就感打折。逆位权杖四象征归属、仪式感与稳定感受阻。',
  },
  {
    id: 26, name: '权杖五', nameEn: 'Five of Wands', arcana: 'minor', suit: 'wands', rank: 5, glyph: '🤼',
    keywords: ['竞争', '摩擦', '混战', '切磋'],
    upright: '五个人挥着棍子乱成一团，仔细看谁也没受伤——这是切磋不是战争。竞争、头脑风暴、抢名额，火药味里藏着磨炼与碰撞的主题。',
    reversed: '要么怕冲突一味躲，要么小摩擦升级成真结怨。逆位权杖五象征混战失序：规则、表述与意气之争的边界变得模糊。',
  },
  {
    id: 27, name: '权杖六', nameEn: 'Six of Wands', arcana: 'minor', suit: 'wands', rank: 6, glyph: '🏆',
    keywords: ['胜利', '认可', '荣誉', '众望所归'],
    upright: '骑马游街、桂冠加身：一场看得见的胜利，伴随掌声与公开认可。传统象义上偏向公开肯定、团队助力与阶段性成就主题。',
    reversed: '奖杯迟迟不发，或到手后发现是塑料的：功劳被抢、认可落空、名不副实的心虚。逆位权杖六象征外界评价、名声与自我认可失衡。',
  },
  {
    id: 28, name: '权杖七', nameEn: 'Seven of Wands', arcana: 'minor', suit: 'wands', rank: 7, glyph: '🛡️',
    keywords: ['坚守', '防御', '据理力争', '压力'],
    upright: '占着高地，下面六根棍子轮番戳上来：质疑、竞争、抢地盘。牌面显示位置优势与防守压力并存，现实筹码仍需复核。',
    reversed: '被围攻到开始怀疑立场。逆位权杖七象征防守疲劳、无效争执与资源被消耗。',
  },
  {
    id: 29, name: '权杖八', nameEn: 'Eight of Wands', arcana: 'minor', suit: 'wands', rank: 8, glyph: '💨',
    keywords: ['加速', '消息', '进展神速', '趁热打铁'],
    upright: '八根权杖破空而来：邮件刷屏、进度狂飙、远方的消息突然抵达。一切都在加速，趁热打铁正当时；犹豫一秒，风就过去了。',
    reversed: '航班延误、消息已读不回、进度条卡在最后一格。逆位权杖八象征速度受阻与沟通误差，堵塞原因未必只在表面。',
  },
  {
    id: 30, name: '权杖九', nameEn: 'Nine of Wands', arcana: 'minor', suit: 'wands', rank: 9, glyph: '🩹',
    keywords: ['坚持', '戒备', '最后一搏', '疲惫'],
    upright: '缠着绷带守着八根权杖，第九根还握在手里。传统象义上偏向经验、警觉、韧性与最后一道防线。',
    reversed: '防御工事修得比人还高：草木皆兵、拒绝支援、硬撑到内伤。逆位权杖九象征防御过度与疲惫累积，也可能提示支援主题浮现。',
  },
  {
    id: 31, name: '权杖十', nameEn: 'Ten of Wands', arcana: 'minor', suit: 'wands', rank: 10, glyph: '🏋️',
    keywords: ['重担', '责任超载', '临界负荷', '学会放手'],
    upright: '十根权杖全抱在怀里，路还得自己走完——成功带来的甜蜜负担。传统象义上偏向责任超载、终点压力与取舍主题。',
    reversed: '超载警告已经响了：什么都自己扛、什么都不敢推。逆位权杖十象征负荷过重、分担困难与边界失衡。',
  },
  {
    id: 32, name: '权杖侍从', nameEn: 'Page of Wands', arcana: 'minor', suit: 'wands', rank: 11, glyph: '🎇',
    keywords: ['热忱新手', '探索', '讯息', '跃跃欲试'],
    upright: '一封让人心跳加速的消息，或一个新领域带来的兴奋感。传统象义上偏向探索、试手、学习与初生热情。',
    reversed: '三分钟热度现场：兴冲冲开头，悄无声息烂尾。逆位权杖侍从象征热度难续、经验不足与火花尚未养成火焰。',
  },
  {
    id: 33, name: '权杖骑士', nameEn: 'Knight of Wands', arcana: 'minor', suit: 'wands', rank: 12, glyph: '🏇',
    keywords: ['冲劲', '冒险', '魅力', '急进动势'],
    upright: '马蹄声就是背景音乐。传统象义上热情动能与个人魅力较显；风风火火象征冲劲、速度与不稳定。',
    reversed: '油门焊死、刹车失灵：冲动决定、半途变卦、热情来得快凉得更快。逆位权杖骑士提示方向、燃料与节奏都可能尚未对齐。',
  },
  {
    id: 34, name: '权杖王后', nameEn: 'Queen of Wands', arcana: 'minor', suit: 'wands', rank: 13, glyph: '🌻',
    keywords: ['自信', '感染力', '独立', '热情待人'],
    upright: '向日葵在手，黑猫在脚边：她自信、温暖、还有点小神秘，走到哪都自带光源。传统象义上偏向魅力、鼓舞、热情与自信主题。',
    reversed: '光源变火源：好胜、善妒、用大嗓门掩饰不自信。逆位权杖王后象征魅力失衡、竞争心过盛与聚光灯焦虑。',
  },
  {
    id: 35, name: '权杖国王', nameEn: 'King of Wands', arcana: 'minor', suit: 'wands', rank: 14, glyph: '🐉',
    keywords: ['领导力', '远见', '魄力', '开创精神'],
    upright: '如掌舵人之象：愿景、热度与远方感较强。传统象义上象征主导力、远见与号召感，但不保证他人必然追随。',
    reversed: '愿景膨胀成画饼，魄力发酵成霸道。逆位权杖国王象征领导力失衡、听不进意见与愿景过度膨胀。',
  },

  // ─────────── 圣杯 Cups (36-49) ───────────
  {
    id: 36, name: '圣杯一', nameEn: 'Ace of Cups', arcana: 'minor', suit: 'cups', rank: 1, glyph: '💧',
    keywords: ['新感情', '情感流动', '疗愈', '心门打开'],
    upright: '心里那只杯子满得往外溢：新的爱、新的友谊、久违的感动成为牌面主题。传统象义上偏向情感初动、接纳、滋养与心门打开的线索。',
    reversed: '杯子倒扣着：情感表达堵塞、付出没有回音，或心门锁着却仍嫌屋里闷。逆位圣杯一象征情绪补给不足与自我接纳议题。',
  },
  {
    id: 37, name: '圣杯二', nameEn: 'Two of Cups', arcana: 'minor', suit: 'cups', rank: 2, glyph: '💑',
    keywords: ['两情相悦', '伙伴', '互相吸引', '和解'],
    upright: '两只杯子轻轻相碰：彼此看见、势均力敌的关系主题正在浮现。传统象义上偏向表白、合伙、和解与互相理解。',
    reversed: '杯子碰歪了：付出不对等、误会横生，或表面和气心里记账。逆位圣杯二象征关系中的对等、误解与隐性账本。',
  },
  {
    id: 38, name: '圣杯三', nameEn: 'Three of Cups', arcana: 'minor', suit: 'cups', rank: 3, glyph: '🥂',
    keywords: ['庆祝', '友谊', '社群', '丰收时刻'],
    upright: '三人举杯共舞：朋友、伙伴、团队之象。传统象义上偏向聚会、分享、庆祝与群体支持主题。',
    reversed: '聚会走了味：小圈子八卦、社交过载，或热闹散场后的空虚。逆位圣杯三提示友谊、边界与群体氛围需要被看见。',
  },
  {
    id: 39, name: '圣杯四', nameEn: 'Four of Cups', arcana: 'minor', suit: 'cups', rank: 4, glyph: '🥱',
    keywords: ['倦怠', '视而不见', '重新评估', '内省'],
    upright: '眼前递来第四只杯子，目光却仍停在地上三只杯子。传统象义上偏向倦怠、兴趣下降与内在需求模糊。',
    reversed: '抬头看见了那只递过来的杯子：倦怠期接近尾声，胃口和好奇心一起回来。逆位象征重新感兴趣的倾向，而非现实回应指令。',
  },
  {
    id: 40, name: '圣杯五', nameEn: 'Five of Cups', arcana: 'minor', suit: 'cups', rank: 5, glyph: '😢',
    keywords: ['失落', '悲伤', '聚焦缺憾', '转身'],
    upright: '三只杯子倒了，黑斗篷凭吊其前。传统象义上偏向失落、遗憾与仍可回看的剩余资源。',
    reversed: '洒掉的牛奶开始被收拾：接受、释怀、从遗憾里直起身来。逆位圣杯五象征修复进行时, 不作心理疗愈处方。',
  },
  {
    id: 41, name: '圣杯六', nameEn: 'Six of Cups', arcana: 'minor', suit: 'cups', rank: 6, glyph: '🎁',
    keywords: ['怀旧', '纯真', '故人', '童年'],
    upright: '旧照片、老朋友、童年味道的糖：过去带着善意回访。传统象义上关联叙旧、故乡、关系修复与纯真记忆；快乐像充电桩，不是牢笼。',
    reversed: '滤镜下的当年越看越美，眼前的日子越过越将就。逆位圣杯六象征怀旧过度、现实感变弱与旧壳仍在牵引。',
  },
  {
    id: 42, name: '圣杯七', nameEn: 'Seven of Cups', arcana: 'minor', suit: 'cups', rank: 7, glyph: '💭',
    keywords: ['幻想', '选择过多', '诱惑', '不切实际'],
    upright: '云端漂着七只杯子：城堡、珠宝、桂冠……每只都闪闪发光，每只都可能是海市蜃楼。传统象义上偏向选择过多、幻想丰盛与落地核验主题。',
    reversed: '云雾散去，梦想被折算成待办清单。逆位圣杯七象征幻想收束、选择变少与现实感回归。',
  },
  {
    id: 43, name: '圣杯八', nameEn: 'Eight of Cups', arcana: 'minor', suit: 'cups', rank: 8, glyph: '🚶',
    keywords: ['离开', '寻找意义', '放下', '远行'],
    upright: '八只杯子码得整整齐齐，却有人趁着月色转身上山。传统象义上偏向离开尚可之局、寻找意义与情感退场。',
    reversed: '走也不是，留也不是：明知不满足却怕后悔，在门口来回徘徊。逆位圣杯八象征迟疑、留恋与不舍离场的拉扯。',
  },
  {
    id: 44, name: '圣杯九', nameEn: 'Nine of Cups', arcana: 'minor', suit: 'cups', rank: 9, glyph: '😌',
    keywords: ['愿望满足', '满足', '享受', '小确幸'],
    upright: '传统里常称许愿牌：心里惦记的那件事，呈现更接近满足的象征方向。物质与情感的满足一起在线；知足不是躺平，是会心一笑。',
    reversed: '愿望接近了却没想象中开心，或永远只差最后一步。逆位圣杯九提示愿望、满足感与外界期待之间的落差。',
  },
  {
    id: 45, name: '圣杯十', nameEn: 'Ten of Cups', arcana: 'minor', suit: 'cups', rank: 10, glyph: '🌈',
    keywords: ['圆满幸福', '家庭和睦', '归属', '岁月静好'],
    upright: '彩虹下十杯齐列，一家人笑作一团：情感生活的满分画面。家庭和睦、关系稳定、心里踏实——珍惜这份平凡的圆满，它其实最贵。',
    reversed: '全家福里有人在假笑：表面和睦、内里疏离，或为了别人家的幸福标准表演生活。逆位圣杯十象征家庭图像、真实关系与外部标准之间的落差。',
  },
  {
    id: 46, name: '圣杯侍从', nameEn: 'Page of Cups', arcana: 'minor', suit: 'cups', rank: 11, glyph: '🐟',
    keywords: ['浪漫讯息', '天真', '创意萌芽', '心动初体验'],
    upright: '杯子里跳出一条鱼：意外的浪漫讯息、天马行空的灵感、一次心动的初体验。传统象义上偏向天真、感受与灵感初动。',
    reversed: '多愁善感开始误事：玻璃心、闹情绪、用幻想代替表达。逆位圣杯侍从象征感受珍贵但表达未成形。',
  },
  {
    id: 47, name: '圣杯骑士', nameEn: 'Knight of Cups', arcana: 'minor', suit: 'cups', rank: 12, glyph: '🌹',
    keywords: ['浪漫攻势', '追求', '魅力', '真诚提案'],
    upright: '白马骑士端着圣杯缓缓而来：表白、邀请、满怀诚意的提案成为牌面主题。这是全副武装的浪漫，传统象义上也把姿态与真实品质并置。',
    reversed: '玫瑰是真的，保质期也是真的：甜言蜜语兑现率存疑，或情绪上头忽冷忽热。逆位圣杯骑士象征浪漫表达与实际兑现之间可能存在落差。',
  },
  {
    id: 48, name: '圣杯王后', nameEn: 'Queen of Cups', arcana: 'minor', suit: 'cups', rank: 13, glyph: '🐚',
    keywords: ['共情', '温柔', '情绪智慧', '直觉敏锐'],
    upright: '她坐在海边捧着杯子，象征能接住未明说的情绪。传统象义上偏向共情、安抚、倾听与直觉主题, 不作疗愈或判断保证。',
    reversed: '共情过载成了情绪海绵。逆位圣杯王后象征情绪边界、过度吸收与照护失衡主题。',
  },
  {
    id: 49, name: '圣杯国王', nameEn: 'King of Cups', arcana: 'minor', suit: 'cups', rank: 14, glyph: '🌊',
    keywords: ['情绪成熟', '包容', '沉稳', '以柔驭刚'],
    upright: '海面波涛汹涌，他的王座纹丝不动：情绪来了不压抑、不失控，稳稳接住。传统象义上象征成熟、包容与情绪承载力。',
    reversed: '表面风平浪静，水下暗流成灾：情绪压抑成内伤，或用冷漠、操控代替沟通。逆位圣杯国王象征被压住的脆弱与情绪隔离。',
  },

  // ─────────── 宝剑 Swords (50-63) ───────────
  {
    id: 50, name: '宝剑一', nameEn: 'Ace of Swords', arcana: 'minor', suit: 'swords', rank: 1, glyph: '🗡️',
    keywords: ['真相', '突破', '清晰', '新想法'],
    upright: '一剑劈开迷雾：真相大白、思路贯通、一个锋利的新想法破土而出。传统象义上关联契约、谈判、判断与清晰表达，但不替代现实决策。',
    reversed: '剑刃钝了：想法混乱、信息误导、话到嘴边变了味。逆位宝剑一象征判断未清、表达失准与决策依据不足。',
  },
  {
    id: 51, name: '宝剑二', nameEn: 'Two of Swords', arcana: 'minor', suit: 'swords', rank: 2, glyph: '🙈',
    keywords: ['僵局', '回避抉择', '左右为难', '刻意平衡'],
    upright: '蒙着眼、抱着剑、背对大海：用不选维持着脆弱的平衡。传统象义上偏向僵持、回避选择与信息已经足够却迟疑的状态。',
    reversed: '僵局松动：眼罩滑落，被回避的信息扑面而来，决定不得不做。逆位宝剑二虽然狼狈，却是解脱的开始——两害相权，选就对了。',
  },
  {
    id: 52, name: '宝剑三', nameEn: 'Three of Swords', arcana: 'minor', suit: 'swords', rank: 3, glyph: '💔',
    keywords: ['心碎', '伤痛', '残酷真相', '刮骨疗毒'],
    upright: '三剑穿心，不含糊：失恋、背叛、扎心的实话。疼痛感说明情绪真实存在；这张牌残忍，却从来不撒谎。',
    reversed: '剑开始一根根拔出来：伤痛进入修复期，或旧伤仍被反复攥紧。逆位宝剑三象征伤痛回看、释放与修复主题。',
  },
  {
    id: 53, name: '宝剑四', nameEn: 'Four of Swords', arcana: 'minor', suit: 'swords', rank: 4, glyph: '🛌',
    keywords: ['休整', '静养', '暂停', '恢复'],
    upright: '石棺上的骑士只是在睡觉：大战之间的战略性休整。传统象义上象征暂停、安静与恢复性间隔，休息感也是排兵布阵的一部分。',
    reversed: '要么休息过度，要么忙到不敢合眼。逆位宝剑四象征休整失衡、恢复不足与暂停信号被忽略。',
  },
  {
    id: 54, name: '宝剑五', nameEn: 'Five of Swords', arcana: 'minor', suit: 'swords', rank: 5, glyph: '😤',
    keywords: ['惨胜', '冲突余波', '意气之争', '不体面'],
    upright: '捡起了所有的剑，也可能输光了所有的朋友——这就是惨胜之象。传统象义上偏向争胜、代价、口舌与关系损耗。',
    reversed: '战后清算时刻：有人想和解，有人想复盘，也可能旧怨死灰复燃。逆位宝剑五象征冲突后的余波、修复意愿与旧账回潮。',
  },
  {
    id: 55, name: '宝剑六', nameEn: 'Six of Swords', arcana: 'minor', suit: 'swords', rank: 6, glyph: '🛶',
    keywords: ['过渡', '离开风暴', '平复', '摆渡'],
    upright: '小船驶向对岸，水面从浑浊变得清亮：一段艰难正在被甩到身后。传统象义上偏向搬迁、过渡、换环境与心境转换。',
    reversed: '船划到一半总回头：旧事未了、故人难舍，或现实条件困住了离开的脚。逆位宝剑六象征负担、条件与去留拉扯。',
  },
  {
    id: 56, name: '宝剑七', nameEn: 'Seven of Swords', arcana: 'minor', suit: 'swords', rank: 7, glyph: '🦊',
    keywords: ['策略', '隐瞒', '独行', '小聪明'],
    upright: '有人抱着五把剑蹑手蹑脚溜出军营——可能是在用策略智取，也可能有人不够坦诚。传统象义上提示信息、底牌与隐蔽动机值得核对。',
    reversed: '纸包不住火：谎言败露、计划穿帮，或遮掩已经难以维持。逆位宝剑七象征隐情暴露、策略失效与诚实成本。',
  },
  {
    id: 57, name: '宝剑八', nameEn: 'Eight of Swords', arcana: 'minor', suit: 'swords', rank: 8, glyph: '⛓️',
    keywords: ['自我设限', '受困感', '恐惧', '思维牢笼'],
    upright: '蒙眼绑手站在剑阵里，可脚是自由的，绳子也松。传统象义上偏向思维困局、自我设限与可复核的出口线索。',
    reversed: '绳子松开了：那些所谓的不可能开始被质疑，视野和选项一起回来。逆位宝剑八象征限制松动与心智出口显现。',
  },
  {
    id: 58, name: '宝剑九', nameEn: 'Nine of Swords', arcana: 'minor', suit: 'swords', rank: 9, glyph: '😱',
    keywords: ['焦虑', '失眠', '噩梦', '灾难化想象'],
    upright: '半夜惊坐起，九把剑挂在墙上——但注意：一把都没落下来。焦虑把明天预演成灾难片；传统象义上提示担忧与事实之间可能存在距离。',
    reversed: '天亮了：恐惧见光后开始缩水，或噩梦终于被说出口。逆位宝剑九象征焦虑外化、求助线索与恐惧减弱。',
  },
  {
    id: 59, name: '宝剑十', nameEn: 'Ten of Swords', arcana: 'minor', suit: 'swords', rank: 10, glyph: '🌄',
    keywords: ['谷底', '终结', '背叛之痛', '向死而生'],
    upright: '十剑插背，牌面惨烈——但远处天正在亮。一件事彻底结束了，回旋空间很小；传统象义上象征谷底、终结与之后的空白期。',
    reversed: '最坏的已经过去，剑在一根根拔除。逆位宝剑十象征复原、旧伤反复与终结后的空白期。',
  },
  {
    id: 60, name: '宝剑侍从', nameEn: 'Page of Swords', arcana: 'minor', suit: 'swords', rank: 11, glyph: '🔎',
    keywords: ['好奇', '侦查', '机敏', '口无遮拦'],
    upright: '踮着脚、竖着耳朵、剑已出鞘且急于追问原因：求知欲和警觉性正当旺。传统象义上关联调研、学习、新动态与言语前的观察。',
    reversed: '侦查变成偷窥，机敏变成毒舌：八卦、抬杠、消息未经核实就转发。逆位宝剑侍从象征信息伦理、言语伤人与核验不足。',
  },
  {
    id: 61, name: '宝剑骑士', nameEn: 'Knight of Swords', arcana: 'minor', suit: 'swords', rank: 12, glyph: '🌪️',
    keywords: ['雷厉风行', '直奔目标', '辩才', '横冲直撞'],
    upright: '认准目标就俯冲，风都要给他让路。传统象义上象征快速、锋利、辩才与限时压力；速度感明显，锐利过度也同属其阴影。',
    reversed: '冲得太快，脑子还在后面追：口不择言、树敌无数、把辩论当沟通。逆位宝剑骑士象征速度压过判断，言语锋芒可能失控。',
  },
  {
    id: 62, name: '宝剑王后', nameEn: 'Queen of Swords', arcana: 'minor', suit: 'swords', rank: 13, glyph: '🦉',
    keywords: ['清醒', '界限分明', '犀利', '独立判断'],
    upright: '经历过风霜的眼睛不好骗：她一眼看穿话术，一句话切中要害。传统象义上象征理性、界限、直言与温柔但不含糊的判断力。',
    reversed: '犀利过了头就成了刀子嘴，清醒过了头就成了心墙。逆位宝剑王后象征批判过度、防御过强与柔软不足。',
  },
  {
    id: 63, name: '宝剑国王', nameEn: 'King of Swords', arcana: 'minor', suit: 'swords', rank: 14, glyph: '🧠',
    keywords: ['理性权威', '公正裁决', '战略', '原则'],
    upright: '法庭级别的头脑上线：逻辑、原则、规则意识全部就位。传统象义上关联重大判断、契约与专业意见，并把情绪与事实的区分置于牌面前景。',
    reversed: '理性沦为压人的工具：冷酷、独断、拿规则当鞭子挥。逆位宝剑国王象征规则压迫、温度不足与理性失衡。',
  },

  // ─────────── 星币 Pentacles (64-77) ───────────
  {
    id: 64, name: '星币一', nameEn: 'Ace of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 1, glyph: '🪙',
    keywords: ['新财源', '务实开端', '机会落地', '种子资金'],
    upright: '一枚金币从云中递出：新工作、新收入、值得投入的机会成为牌面主题，而且偏向能落地的种子。传统象义上象征物质开端与现实条件。',
    reversed: '金币在手边打了个转又飞走：机会延迟、报价缩水，或钱来了却留不住。逆位星币一提示预算、契约与消费习惯中的漏洞主题。',
  },
  {
    id: 65, name: '星币二', nameEn: 'Two of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 2, glyph: '🤹',
    keywords: ['多线平衡', '灵活应变', '取舍', '现金流'],
    upright: '两枚金币在手里抛出无限循环：工作与生活、主业与副业、几个截止日并行。传统象义上偏向弹性、平衡、节奏与多线调度。',
    reversed: '球开始掉了：排期打架、现金流吃紧、顾此失彼。逆位星币二象征负荷过多、资源分散与取舍压力。',
  },
  {
    id: 66, name: '星币三', nameEn: 'Three of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 3, glyph: '🏗️',
    keywords: ['团队协作', '专业认可', '匠心', '初见成效'],
    upright: '石匠、设计师、出资人围在大教堂前对图纸。传统象义上偏向专业协作、技艺被看见与分工成形主题。',
    reversed: '图纸各画各的，施工各干各的：分工不清、水平参差、没人听人说话。逆位星币三象征共识不足与协作结构松散。',
  },
  {
    id: 67, name: '星币四', nameEn: 'Four of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 4, glyph: '🔒',
    keywords: ['守财', '安全感', '控制', '紧握不放'],
    upright: '一枚踩脚下、一枚抱怀里、两枚顶头上：守得很稳，也抱得很累。传统象义上偏向储蓄、边界、控制与对失去的担心。',
    reversed: '两种极端：要么突然松手消耗资源，要么守到一毛不拔滴水不漏。逆位星币四象征安全感与资源控制之间的紧绷。',
  },
  {
    id: 68, name: '星币五', nameEn: 'Five of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 5, glyph: '🥶',
    keywords: ['匮乏', '困顿', '被排除感', '求助'],
    upright: '风雪夜路过教堂，窗里明明有光。传统象义上偏向困顿、孤立感、资源吃紧与可见却未触及的援手。',
    reversed: '寒冬开始回暖：新的进项、外部援手、状态的复原。逆位星币五象征支持回流、保障意识与困顿缓解。',
  },
  {
    id: 69, name: '星币六', nameEn: 'Six of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 6, glyph: '🤲',
    keywords: ['给予与接受', '慷慨', '资源流动', '公平'],
    upright: '商人一手施予一手持天平：资源在流动，而且流得公平。传统象义上关联给与受、资助、交换与体面边界，需要看清自己站在哪一端。',
    reversed: '天平藏在施舍背后：附带条件的帮助、还不清的人情、施恩图报的甜蜜陷阱。逆位星币六象征交换失衡、条件援助与资源关系需复核。',
  },
  {
    id: 70, name: '星币七', nameEn: 'Seven of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 7, glyph: '🌱',
    keywords: ['耐心等待', '阶段复盘', '长期投入', '评估'],
    upright: '拄着锄头看藤上的果子：种下去的正在长，只是还没到摘的时候。传统象义上关联投入、产出、评估与等待。',
    reversed: '眼看着藤蔓疯长就是不结果：回报迟迟不来，原先选择开始被怀疑。逆位星币七象征投入评估、收益延迟与取舍压力。',
  },
  {
    id: 71, name: '星币八', nameEn: 'Eight of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 8, glyph: '🔨',
    keywords: ['精进', '刻意练习', '工匠精神', '埋头苦干'],
    upright: '长凳上的学徒把第八枚星币敲得叮当响：重复、打磨、再重复。传统象义上象征熟练、工匠精神与经验累积，机会不是必然承诺。',
    reversed: '敲了一万锤，件件平庸：机械重复不长进，或完美主义把交付无限推迟。逆位星币八象征练习失焦、技能瓶颈与交付拖延。',
  },
  {
    id: 72, name: '星币九', nameEn: 'Nine of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 9, glyph: '🍇',
    keywords: ['独立富足', '自我成就', '优雅享受', '底气'],
    upright: '葡萄园里的她臂上停着猎鹰：靠自己挣来的丰盛，享受得心安理得。传统象义上关联独立、丰足、自我成就与一砖一瓦攒出的底气。',
    reversed: '橱窗式的精致：账单在裸奔，朋友圈在度假；或忙到富而不闲，没空生活。逆位星币九象征丰盛外观与根基稳定之间的落差。',
  },
  {
    id: 73, name: '星币十', nameEn: 'Ten of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 10, glyph: '🏰',
    keywords: ['家业', '传承', '长期保障', '根基深厚'],
    upright: '祖孙三代与拱门族徽同框：财富沉淀成了家业与传承。传统象义上关联置产、家族结构、长期保障与“百年工程”的想象。',
    reversed: '家产变成家务事：遗产纠纷、家族干涉、稳定得让人窒息。逆位星币十象征金钱、家族情感与控制感之间的本末倒置。',
  },
  {
    id: 74, name: '星币侍从', nameEn: 'Page of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 11, glyph: '📚',
    keywords: ['勤学', '脚踏实地', '新技能', '务实起步'],
    upright: '少年捧着金币看得入神：一门新技能、一个可落地的兴趣、一份踏实的开端。传统象义上偏向学习、练习、现实技能与务实起步。',
    reversed: '教材买了三套，视频收藏了八十个，进度却是零。逆位星币侍从象征准备过量、练习不足与务实节奏未成形。',
  },
  {
    id: 75, name: '星币骑士', nameEn: 'Knight of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 12, glyph: '🐂',
    keywords: ['稳扎稳打', '可靠', '按部就班', '慢工细活'],
    upright: '全套骑士里走得最慢的一位，但从不缺席：耕好每一垄地，兑现每一句话。此刻拼的不是灵感是耐力——按部就班，本身就是超能力。',
    reversed: '稳变成了僵：流程至上、拒绝变通、把勤奋熬成惯性麻木。逆位星币骑士象征节奏僵化、变通不足与长期疲劳。',
  },
  {
    id: 76, name: '星币王后', nameEn: 'Queen of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 13, glyph: '🐇',
    keywords: ['务实滋养', '持家有道', '温暖可靠', '身心照料'],
    upright: '她把王座安在花园里，脚边还蹲着只兔子：事业、家庭与生活滋养同框。传统象义上关联理财、养护、身体感与把日子过出热气的能力。',
    reversed: '照顾了全世界，却漏掉自身; 或把爱折算成物质，用忙碌逃避亲密。逆位星币王后象征照护失衡、物质替代情感与家宅温度不足。',
  },
  {
    id: 77, name: '星币国王', nameEn: 'King of Pentacles', arcana: 'minor', suit: 'pentacles', rank: 14, glyph: '💰',
    keywords: ['富足掌局', '商业头脑', '稳健', '点石成金'],
    upright: '王座缠着葡萄藤，手边全是丰收：事业版图成型，资源管理能力突出。传统象义上关联长期布局、责任边界与稳定掌局。',
    reversed: '点石成金的手开始只认金子：固执、物化、用价格衡量一切，甚至包括感情。逆位星币国王象征物质尺度过强、固执与情感被量化。',
  },
]

export interface TarotSpread {
  id: string
  name: string
  count: number
  positions: string[]   // length === count，每个位置的中文含义标签
  desc: string          // 一句话说明适用场景
}

export const TAROT_SPREADS: TarotSpread[] = [
  {
    id: 'single',
    name: '单牌指引',
    count: 1,
    positions: ['指引'],
    desc: '一事一问，抽一张牌观察当下提示与主导象义。',
  },
  {
    id: 'three',
    name: '圣三角 · 过去现在未来',
    count: 3,
    positions: ['过去', '现在', '未来'],
    desc: '梳理事情的来龙去脉：观察过去的因、现在的局与未来的势。',
  },
  {
    id: 'celtic',
    name: '凯尔特十字',
    count: 10,
    positions: ['现状', '阻碍', '显意识目标', '潜意识根基', '过去', '未来', '自我态度', '外部环境', '希望与恐惧', '最终结果'],
    desc: '流传最广的深度牌阵，从内外十个角度观察复杂议题的结构。',
  },
]
