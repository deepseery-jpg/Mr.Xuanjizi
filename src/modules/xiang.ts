// 相术四门 — 面相 / 手相 / 风水 / Vastu (多模态观相: 固定观察协议 → 固定断语映射 → AI 综合)
import type { AiProvider, ModuleDef, Section } from '../core/types.ts'
import { getAiProvider, observeImage } from '../core/ai.ts'
import { findSunLongitude, jdFromUT, utFromJD } from '../core/astro.ts'

const F_IMG = (hint: string) => ({ key: 'image', label: '呈上照片', type: 'image' as const, required: true, placeholder: hint })
const F_FOCUS = { key: 'focus', label: '想重点看什么(可选)', type: 'text' as const, placeholder: '如: 三停 / 气色 / 掌纹清晰度' }
const TZ_OPTIONS = [
  { value: '8', label: 'UTC+8 中国/东南亚' }, { value: '9', label: 'UTC+9 日韩' },
  { value: '7', label: 'UTC+7 泰越印尼西部' }, { value: '5.5', label: 'UTC+5.5 印度' },
  { value: '0', label: 'UTC+0 英国(冬令)' }, { value: '1', label: 'UTC+1 欧洲中部(冬令)' },
  { value: '-5', label: 'UTC-5 美东(冬令)' }, { value: '-8', label: 'UTC-8 美西(冬令)' },
  { value: '10', label: 'UTC+10 澳东' },
]

function needKey(v: Record<string, string>) {
  if (!v._apiKey) throw new Error('相术图像观测需要配置大模型 API Key。')
  if (!v.image) throw new Error('请先呈上照片')
}

function aiProvider(v: Record<string, string>): AiProvider {
  return getAiProvider(v._provider)
}

function imgData(v: Record<string, string>) {
  return v.image.split(',')[1]
}

const enumProp = (vals: string[]) => ({ type: 'string', enum: vals })
const obj = (props: Record<string, unknown>) => ({
  type: 'object', additionalProperties: false,
  required: Object.keys(props), properties: props,
})

type PalmHand = 'left' | 'right'
const VASTU_DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] as const
type VastuDirection = typeof VASTU_DIRECTIONS[number]

export function parsePalmHand(raw: unknown): PalmHand {
  if (raw === 'left' || raw === 'right') return raw
  throw new Error('手相左右手需从表单选项中选择')
}

export function parseVastuEntrance(raw: unknown): VastuDirection {
  if (typeof raw !== 'string') throw new Error('Vastu 大门朝向需从八方选项中选择')
  const value = raw.trim()
  if ((VASTU_DIRECTIONS as readonly string[]).includes(value)) return value as VastuDirection
  throw new Error('Vastu 大门朝向需从八方选项中选择')
}

export const FACE_AUDIT = '面相当前为 AI 图像粗分类 + 三停五官少量可见特征映射; 未完整排十二宫、骨相、气色四时、痣纹细法与流年部位。自由备注中的痣、法令、颧骨仅记录, 痣相/骨相未断。照片角度、光线、表情会显著影响观测, 不作生死寿夭、疾病或身份定论。'
export const PALM_AUDIT = '手相当前为 AI 图像粗分类 + 掌型、三大主线、事业线与三丘位粗看; 采用左手先天、右手后天一说, 未按男左女右或惯用手派修正。未细判岛纹、十字纹、星纹、断掌异格、指节指甲与左右手全套流年。掌纹会随用手习惯和状态变化, 不作寿命或疾病定论。'
export const FENGSHUI_AUDIT = '风水当前为照片观形 + 二十四山向首 + 玄空下卦/替卦飞星 + 七星打劫结构判定 + 城门诀 + 指定流年飞星 + 八宅游年/命卦; 玄空元运与八宅命卦按所填时区比较立春年界, 未填时默认 UTC+8。兼向替卦依《沈氏玄空学》所录替星诀作起星表, 七星打劫按《沈氏玄空学》七星打劫章所述离/坎向首与父母三般卦联珠作结构判定, 坎宫打劫、水口库气与真假细断派别异说标待考; 城门以向首旁两宫的向星合十或父母三般卦作候选; 仍未做实地罗盘复测、水法、外局砂水、择日与师承断验。'
export const VASTU_AUDIT = 'Vastu 属印度建筑方位传统, 不属于中国风水或国学堪舆。本模块当前为 AI 图像粗分类 + 九宫功能方位提示; 未做实地罗盘、精确户型比例、地块坡向、Ayadi 量度、Muhurat 择日与师承调整; 只作空间象义观察, 不作祈祷、供奉、镇物、颜色补救、装修或择日处方。'

// ================= 面相 =================
const FACE_MAP: Record<string, Record<string, string>> = {
  upper: { 饱满开阔: '天庭饱满——早运得势, 长辈缘厚, 思虑格局大', 中等: '上停平正——早年平稳, 根基自立', 低窄: '天庭偏窄——早年多历练, 靠后天补足, 越走越开' },
  middle: { 挺拔有势: '中停有势——中年担当与执行象较明', 中等: '中停平和——中年节律较稳', 塌陷无力: '中停气弱——中年借势/协作象较重, 需合全脸复核' },
  lower: { 方圆有力: '地阁方圆——晚景收束与承载象较足', 中等: '下停平正——晚运象中平', 尖削后缩: '地阁偏薄——晚年储备/安顿象较重, 不作健康判断' },
  eyebrows: { 浓密有形: '眉浓有形——情义与同侪象较强', 疏淡: '眉形疏淡——情感克制象, 亲缘需合全脸复核', 杂乱: '眉乱压眼——情绪易扰思虑, 可作专注与情绪观察线索' },
  eyes: { 有神藏光: '目有神光——心志坚定, 是非分明象较明', 平和: '眼神平和——性情中正象', 露光游移: '目光游移——心思多变, 可作专注力观察线索' },
  nose: { 丰隆有肉: '鼻若悬胆——财帛宫厚, 承载与掌控象较足', 中等: '鼻相平正——财帛象中平', 鼻梁起节: '鼻梁见节——性子刚, 财帛象有起伏线索, 不作财务判断' },
  mouth: { 棱角分明: '口方棱正——言而有信, 食禄象较稳', 适中: '口相适中——言语得体象', 唇薄下垂: '唇形偏薄——言辞锋利象, 需合全脸复核' },
  ears: { 厚大贴脑: '耳厚贴脑——根器与早年承托象较足', 中等: '耳相平常——早年承托象中平', 薄小外张: '耳薄外张——早年奔波象, 主意多变, 需合全脸复核' },
  qise: { 明润: '气色明润——画面状态清朗, 仅作照片状态观察', 平常: '气色平平——画面状态中平, 需结合光线与作息复核', 晦暗疲惫: '气色偏暗——可能受光线、休息与拍摄状态影响, 仅作照片状态提示' },
}

export const faceModule: ModuleDef = {
  id: 'face',
  category: 'xiang',
  name: '面相',
  subtitle: '中国 · 三停五官粗分类',
  tagline: '三停五官的可观察特征分析',
  glyph: '🎭',
  ritual: 'lens',
  vision: true,
  inputs: [F_IMG('正面免冠照, 光线均匀, 五官清晰'), F_FOCUS],
  async compute(v) {
    needKey(v)
    const schema = obj({
      isFace: { type: 'boolean' },
      santing: obj({ upper: enumProp(['饱满开阔', '中等', '低窄']), middle: enumProp(['挺拔有势', '中等', '塌陷无力']), lower: enumProp(['方圆有力', '中等', '尖削后缩']) }),
      wuguan: obj({ eyebrows: enumProp(['浓密有形', '疏淡', '杂乱']), eyes: enumProp(['有神藏光', '平和', '露光游移']), nose: enumProp(['丰隆有肉', '中等', '鼻梁起节']), mouth: enumProp(['棱角分明', '适中', '唇薄下垂']), ears: enumProp(['厚大贴脑', '中等', '薄小外张']) }),
      qise: enumProp(['明润', '平常', '晦暗疲惫']),
      note: { type: 'string' },
    })
    const o = await observeImage({
      provider: aiProvider(v),
      apiKey: v._apiKey, apiBaseUrl: v._apiBaseUrl, model: v._model, imageBase64: imgData(v), mediaType: 'image/jpeg',
      reasoningEffort: v._deepThink ? 'xhigh' : 'medium',
      protocol: '你是传统面相学的观察员。请按中国面相学「三停五官」框架对照片做客观特征分类(不评美丑、不猜身份、不做健康诊断, 仅按视觉形态归类)。isFace: 是否为清晰人脸正面照。santing: 上停(发际至眉)/中停(眉至鼻底)/下停(鼻底至下巴)的形态。wuguan: 眉眼鼻口耳形态。qise: 整体气色光泽。note: 20字内其它显著面部特征(如痣/法令/颧骨, 无则写"无"; 只记录, 不展开痣相或骨相断语)。',
      schema,
    }) as { isFace: boolean; santing: Record<string, string>; wuguan: Record<string, string>; qise: string; note: string }
    if (!o.isFace) throw new Error('法眼未辨出清晰的正面人脸——请换一张光线好、五官完整的照片')

    const reads: { k: string; v: string; hint: string }[] = [
      { k: '上停 · 15-30早运', v: o.santing.upper, hint: FACE_MAP.upper[o.santing.upper] },
      { k: '中停 · 31-50中运', v: o.santing.middle, hint: FACE_MAP.middle[o.santing.middle] },
      { k: '下停 · 51后晚运', v: o.santing.lower, hint: FACE_MAP.lower[o.santing.lower] },
      { k: '眉 · 保寿官 / 兄弟宫参考', v: o.wuguan.eyebrows, hint: FACE_MAP.eyebrows[o.wuguan.eyebrows] },
      { k: '眼 · 监察官', v: o.wuguan.eyes, hint: FACE_MAP.eyes[o.wuguan.eyes] },
      { k: '鼻 · 审辨官 / 财帛宫参考', v: o.wuguan.nose, hint: FACE_MAP.nose[o.wuguan.nose] },
      { k: '口 · 出纳官', v: o.wuguan.mouth, hint: FACE_MAP.mouth[o.wuguan.mouth] },
      { k: '耳 · 采听官', v: o.wuguan.ears, hint: FACE_MAP.ears[o.wuguan.ears] },
      { k: '气色', v: o.qise, hint: FACE_MAP.qise[o.qise] },
    ]

    const sections: Section[] = [
      { title: '观相边界', kind: 'text', data: FACE_AUDIT },
      { title: '法眼观测 · 三停五官', kind: 'pairs', data: { items: reads } },
      ...(o.note && o.note !== '无' ? [{ title: '其它观测(仅记录)', kind: 'text' as const, data: `${o.note}。痣相/骨相未断, 需另按固定规则复核。` }] : []),
    ]

    const fixedReading = [
      `**三停**定大势: ${FACE_MAP.upper[o.santing.upper]}; ${FACE_MAP.middle[o.santing.middle]}; ${FACE_MAP.lower[o.santing.lower]}。`,
      `**五官**见细节: ${FACE_MAP.eyes[o.wuguan.eyes]}; ${FACE_MAP.nose[o.wuguan.nose]}。`,
      `**当下气色**: ${FACE_MAP.qise[o.qise]}。`,
      `相由心生, 亦由习惯生——面相是过去的沉淀, 不是未来的判决。`,
      FACE_AUDIT,
    ].join('\n')

    return {
      headline: `三停: ${o.santing.upper.slice(0, 2)}/${o.santing.middle.slice(0, 2)}/${o.santing.lower.slice(0, 2)} · 气色${o.qise}`,
      badge: '🎭',
      sections,
      fixedReading,
      aiContext: `面相观测(AI图像分类+传统断语)${v.focus ? ', 求测者关注: ' + v.focus : ''}; ${FACE_AUDIT}\n` + reads.map(r => `${r.k}: ${r.v} → ${r.hint}`).join('\n') + (o.note ? `\n其它(仅记录, 痣相/骨相未断): ${o.note}` : '') + '\n请综合三停五官作整体面相解读, 语气庄重温和, 不评美丑不断生死; 不猜身份/年龄/职业/族裔, 不做健康诊断; 不给职业路线、关系或现实行动处方; 气色仅作照片光线与状态观测; 不展开自由备注中的痣相、骨相断语。',
      followups: ['三停五官只能作哪些观察参考?', '哪个部位的象义最需要复核?', '照片气色观测有哪些局限?'],
    }
  },
}

// ================= 手相 =================
const PALM_MAP: Record<string, Record<string, string>> = {
  life: { 深长清晰: '生命线深长——传统掌相称活动力与续航象征, 不作身体健康判断', 中等: '生命线中平——传统称活动力平稳, 仍须合全掌复核', 浅短断续: '生命线浅淡——传统称续航象偏弱, 需合全掌复核, 不作寿命判断' },
  head: { 深长平直: '智慧线平直——理性务实, 决断条理象较明', 弯向月丘: '智慧线入月丘——想象力丰沛, 创意与感受象较强', 浅淡: '智慧线浅淡——直觉先行, 细节组织象需合全掌复核' },
  heart: { 深长上扬: '感情线上扬——重情且敢表达, 情感推进象较强', 平直: '感情线平直——感情内敛克制, 细水长流象', 浅乱分叉: '感情线多歧——心思细腻善感, 情感节律多分歧象' },
  fate: { 清晰贯穿: '事业线贯掌——目标感与路径连续象较强', 若隐若现: '事业线隐现——多轨并行象, 需合全掌复核', 不显: '事业线不显——自由生长象较重' },
  shape: { 金形方掌: '金形手——方正务实, 执行与管理象较明', 木形长掌: '木形手——修长敏感, 审美与思辨象较明', 火形尖掌: '火形手——热烈外放, 表达与感染象较明', 土形厚掌: '土形手——厚实沉稳, 积累与守成象较明', 水形圆掌: '水形手——圆融灵动, 沟通与变通象较明' },
}

export const palmModule: ModuleDef = {
  id: 'palm',
  category: 'xiang',
  name: '手相',
  subtitle: '中国-印度 Hast Rekha',
  tagline: '掌纹三才线与手形特征分析',
  glyph: '🖐️',
  ritual: 'lens',
  vision: true,
  inputs: [
    F_IMG('摊开手掌拍摄, 掌纹清晰、光线充足'),
    { key: 'hand', label: '哪只手', type: 'select', default: 'left', options: [{ value: 'left', label: '左手 (左先天右后天一说)' }, { value: 'right', label: '右手 (左先天右后天一说)' }], help: '当前采用左手先天、右手后天一说; 未按男左女右或惯用手派修正' },
    F_FOCUS,
  ],
  async compute(v) {
    const hand = parsePalmHand((v as Record<string, unknown>).hand)
    needKey(v)
    const schema = obj({
      isPalm: { type: 'boolean' },
      lines: obj({ life: enumProp(['深长清晰', '中等', '浅短断续']), head: enumProp(['深长平直', '弯向月丘', '浅淡']), heart: enumProp(['深长上扬', '平直', '浅乱分叉']), fate: enumProp(['清晰贯穿', '若隐若现', '不显']) }),
      shape: enumProp(['金形方掌', '木形长掌', '火形尖掌', '土形厚掌', '水形圆掌']),
      mounts: obj({ jupiter: enumProp(['饱满', '平', '低平']), sun: enumProp(['饱满', '平', '低平']), venus: enumProp(['饱满', '平', '低平']) }),
      note: { type: 'string' },
    })
    const o = await observeImage({
      provider: aiProvider(v),
      apiKey: v._apiKey, apiBaseUrl: v._apiBaseUrl, model: v._model, imageBase64: imgData(v), mediaType: 'image/jpeg',
      reasoningEffort: v._deepThink ? 'xhigh' : 'medium',
      protocol: '你是手相学观察员(通中式掌相与印度 Hast Rekha Shastra)。对照片做客观分类: isPalm是否清晰手掌; lines三大主线+事业线形态(life生命线=围绕拇指根的弧线, head智慧线=横贯掌心, heart感情线=指根下方横线, fate事业线=纵贯掌心); shape掌型五行(按掌与指的长宽厚薄); mounts丘位(jupiter木星丘=食指根, sun太阳丘=无名指根, venus金星丘=拇指根)饱满度; note其它显著特征20字内(如断掌/岛纹/十字纹, 无则"无")。不做健康诊断。',
      schema,
    }) as { isPalm: boolean; lines: Record<string, string>; shape: string; mounts: Record<string, string>; note: string }
    if (!o.isPalm) throw new Error('法眼没看清掌纹——请摊平手掌、对好焦、亮一点再拍')

    const reads = [
      { k: '掌型', v: o.shape, hint: PALM_MAP.shape[o.shape] },
      { k: '生命线', v: o.lines.life, hint: PALM_MAP.life[o.lines.life] },
      { k: '智慧线', v: o.lines.head, hint: PALM_MAP.head[o.lines.head] },
      { k: '感情线', v: o.lines.heart, hint: PALM_MAP.heart[o.lines.heart] },
      { k: '事业线', v: o.lines.fate, hint: PALM_MAP.fate[o.lines.fate] },
      { k: '木星丘 (志)', v: o.mounts.jupiter, hint: o.mounts.jupiter === '饱满' ? '进取心旺, 领导欲在线' : o.mounts.jupiter === '平' ? '企图心适中' : '不慕虚名, 求实自在' },
      { k: '太阳丘 (名)', v: o.mounts.sun, hint: o.mounts.sun === '饱满' ? '才艺声名有缘' : o.mounts.sun === '平' ? '名声平顺' : '低调行事, 实绩说话' },
      { k: '金星丘 (情)', v: o.mounts.venus, hint: o.mounts.venus === '饱满' ? '热情体力充沛, 生活热气腾腾' : o.mounts.venus === '平' ? '情感表达适中' : '温和恬淡, 蓄能型选手' },
    ]

    const fixedReading = [
      `采用左手先天、右手后天一说, ${hand === 'left' ? '左手观先天禀赋' : '右手观后天走势'}; 未按男左女右或惯用手派修正: **${o.shape}**——${PALM_MAP.shape[o.shape]}。`,
      `三大主线: ${PALM_MAP.life[o.lines.life]}; ${PALM_MAP.head[o.lines.head]}; ${PALM_MAP.heart[o.lines.heart]}。`,
      `${PALM_MAP.fate[o.lines.fate]}。`,
      `掌纹会受用手习惯和状态影响——手相是进行时, 不是判决书。`,
      PALM_AUDIT,
    ].join('\n')

    return {
      headline: `${o.shape} · 智慧线${o.lines.head}`,
      badge: '🖐',
      sections: [
        { title: '观掌边界', kind: 'text', data: PALM_AUDIT },
        { title: '法眼观掌', kind: 'pairs', data: { items: reads } },
        ...(o.note && o.note !== '无' ? [{ title: '特殊纹相', kind: 'text' as const, data: o.note }] : []),
      ],
      fixedReading,
      aiContext: `手相观测(${hand === 'left' ? '左手/先天' : '右手/后天'})${v.focus ? ', 关注: ' + v.focus : ''}; ${PALM_AUDIT}\n` + reads.map(r => `${r.k}: ${r.v} → ${r.hint}`).join('\n') + (o.note ? `\n特殊: ${o.note}` : '') + '\n请融合中式掌相与印度Hast Rekha视角作象义解读; 不给职业行当、关系、健康或现实行动处方。',
      followups: ['掌型五行只作哪些性情参考?', '智慧线的象义边界是什么?', '左右手差异一般说明什么?'],
    }
  },
}

// ================= 风水 =================
const GUAS = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾']
const DIR_OF_GUA: Record<string, string> = { 坎: '北', 艮: '东北', 震: '东', 巽: '东南', 离: '南', 坤: '西南', 兑: '西', 乾: '西北' }

// ---- 二十四山 (罗盘, 每山15°) ----
export const MOUNTS = ['壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥']
/** 各山中线度数 (子=0°即正北, 顺时针; 罗盘惯例午=180°) */
const mountDeg = (i: number) => ((i - 1) * 15 + 360) % 360
/** 山所属九宫 (壬子癸坎1, 丑艮寅艮8, 甲卯乙震3, 辰巽巳巽4, 丙午丁离9, 未坤申坤2, 庚酉辛兑7, 戌乾亥乾6) */
const MOUNT_PALACE = [1, 1, 1, 8, 8, 8, 3, 3, 3, 4, 4, 4, 9, 9, 9, 2, 2, 2, 7, 7, 7, 6, 6, 6]
/** 三元龙阴阳 (玄空下卦): 地元 甲庚丙壬+辰戌丑未-; 天元 乾坤艮巽+子午卯酉-; 人元 寅申巳亥+乙辛丁癸- */
const MOUNT_YANG = [true, false, false, false, true, true, true, false, false, false, true, true, true, false, false, false, true, true, true, false, false, false, true, true]
const PALACE_GUA: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' }
/** 宫→该宫三山索引 */
const PALACE_MOUNTS: Record<number, [number, number, number]> = { 1: [0, 1, 2], 8: [3, 4, 5], 3: [6, 7, 8], 4: [9, 10, 11], 9: [12, 13, 14], 2: [15, 16, 17], 7: [18, 19, 20], 6: [21, 22, 23] }
const PALACE_DIR_NAME: Record<number, string> = { 1: '北', 2: '西南', 3: '东', 4: '东南', 5: '中宫', 6: '西北', 7: '西', 8: '东北', 9: '南' }
const COMPASS_PALACES = [1, 8, 3, 4, 9, 2, 7, 6] as const
const DIR_LAYOUT_P = [4, 9, 2, 3, 5, 7, 8, 1, 6] as const // 上南下北

const STAR_NAMES: Record<number, string> = {
  1: '一白贪狼', 2: '二黑巨门', 3: '三碧禄存', 4: '四绿文曲', 5: '五黄廉贞', 6: '六白武曲', 7: '七赤破军', 8: '八白左辅', 9: '九紫右弼',
}

/** 《沈氏玄空学》所录替星诀: 子癸甲申贪狼, 壬卯乙未坤巨门, 乾亥辰巽巳戌武曲, 酉辛丑艮丙破军, 寅午庚丁右弼。 */
export const XUANKONG_REPLACEMENT_STARS: Record<string, number> = {
  子: 1, 癸: 1, 甲: 1, 申: 1,
  壬: 2, 卯: 2, 乙: 2, 未: 2, 坤: 2,
  乾: 6, 亥: 6, 辰: 6, 巽: 6, 巳: 6, 戌: 6,
  酉: 7, 辛: 7, 丑: 7, 艮: 7, 丙: 7,
  寅: 9, 午: 9, 庚: 9, 丁: 9,
}
const SAN_BAN_GROUPS = [[1, 4, 7], [2, 5, 8], [3, 6, 9]] as const

export type XuanKongPanKind = '下卦盘' | '替卦盘'
export interface ReplacementUse {
  side: 'shan' | 'xiang'
  mountain: string
  original: number
  replacement: number
  source: string
}
export interface XuanKongDegreeResult {
  degree: number | null
  xiangIdx: number
  zuoIdx: number
  offset: number
  panKind: XuanKongPanKind
  useReplacement: boolean
  note: string
}
export interface CityGateCandidate {
  palace: number
  direction: string
  xiangStar: number
  facingXiangStar: number
  relation: string
  status: '正城门' | '未成城门'
}
export interface CityGateResult {
  facingPalace: number
  facingDirection: string
  candidates: CityGateCandidate[]
  summary: string
}
export type SevenStarRobberyStatus = '真打劫' | '假打劫' | '不成立'
export interface SevenStarRobberyPalace {
  palace: number
  direction: string
  xiangStar: number
  role: '向首' | '借气'
}
export interface SevenStarRobberyResult {
  status: SevenStarRobberyStatus
  mode: '离宫打劫' | '坎宫打劫' | '非离坎向'
  facingPalace: number
  facingDirection: string
  parentGroup: readonly number[] | null
  palaces: SevenStarRobberyPalace[]
  robbedPalaces: SevenStarRobberyPalace[]
  borrowedQi: string[]
  note: string
  source: string
}
export interface AnnualFlyingStars {
  year: number
  center: number
  pan: Record<number, number>
  warningText: string
  auspiciousText: string
}

function starName(n: number): string { return STAR_NAMES[n] ?? `${n}` }
function palaceName(p: number): string { return PALACE_DIR_NAME[p] ?? `${p}宫` }
function sameSanBan(a: number, b: number): boolean { return SAN_BAN_GROUPS.some(g => (g as readonly number[]).includes(a) && (g as readonly number[]).includes(b)) }
function sanBanGroupOf(stars: number[]): readonly number[] | null {
  return SAN_BAN_GROUPS.find(g => stars.every(s => (g as readonly number[]).includes(s))) ?? null
}
function circularDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180)
  return Math.round(d * 1000) / 1000
}

// ---- 玄空飞星 ----
/** 洛书飞行路径: 中5→乾6→兑7→艮8→离9→坎1→坤2→震3→巽4 */
const FLY_PATH = [5, 6, 7, 8, 9, 1, 2, 3, 4]
function flyStars(center: number, forward: boolean): Record<number, number> {
  const out: Record<number, number> = {}
  for (let i = 0; i < 9; i++) out[FLY_PATH[i]] = ((center - 1 + (forward ? i : -i)) % 9 + 9) % 9 + 1
  return out
}
/** 三元九运 (1864 甲子上元一运起, 每运20年) */
export function yunOf(year: number): number {
  return Math.floor((((year - 1864) % 180 + 180) % 180) / 20) + 1
}
export interface YunDateResult {
  yun: number
  year: number
  boundary: string
  source: 'constructionDate'
  label: string
}
type ManualYunResult = { yun: number; boundary: string }
export interface FeiXing {
  yun: number
  yunPan: Record<number, number>
  shanPan: Record<number, number>
  xiangPan: Record<number, number>
  geju: string
  zuo: number; xiang: number // 山索引
  panKind: XuanKongPanKind
  replacementUses: ReplacementUse[]
}
export interface FeiXingOptions {
  useReplacement?: boolean | { shan?: boolean; xiang?: boolean }
}

function useReplacementForSide(options: FeiXingOptions | undefined, side: 'shan' | 'xiang'): boolean {
  const opt = options?.useReplacement
  if (typeof opt === 'boolean') return opt
  return Boolean(opt?.[side])
}

function replacementStarForMount(idx: number): number {
  const mount = MOUNTS[idx]
  const star = XUANKONG_REPLACEMENT_STARS[mount]
  if (!star) throw new Error(`二十四山替星表缺 ${mount} 山; 不可臆造替卦`)
  return star
}

/**
 * 玄空飞星: 下卦盘以坐/向宫运星入中; 替卦盘以坐山/向首替星诀之星入中。
 * 替星入中后仍按替星本宫同元龙阴阳定顺逆, 五黄入中随坐/向山本身阴阳。
 */
export function feiXing(yun: number, zuoIdx: number, xiangIdx: number, options: FeiXingOptions = {}): FeiXing {
  const yunPan = flyStars(yun, true)
  const shanLong = zuoIdx % 3 // 元龙位: 0地元 1天元 2人元
  const xiangLong = xiangIdx % 3
  const yangOf = (star: number, selfIdx: number, long: number) => star === 5 ? MOUNT_YANG[selfIdx] : MOUNT_YANG[PALACE_MOUNTS[star][long]]
  const originalShanBase = yunPan[MOUNT_PALACE[zuoIdx]]
  const originalXiangBase = yunPan[MOUNT_PALACE[xiangIdx]]
  const useShanReplacement = useReplacementForSide(options, 'shan')
  const useXiangReplacement = useReplacementForSide(options, 'xiang')
  const shanBase = useShanReplacement ? replacementStarForMount(zuoIdx) : originalShanBase
  const xiangBase = useXiangReplacement ? replacementStarForMount(xiangIdx) : originalXiangBase
  const replacementUses: ReplacementUse[] = []
  if (useShanReplacement) replacementUses.push({ side: 'shan', mountain: MOUNTS[zuoIdx], original: originalShanBase, replacement: shanBase, source: `${MOUNTS[zuoIdx]}山替${starName(shanBase)}` })
  if (useXiangReplacement) replacementUses.push({ side: 'xiang', mountain: MOUNTS[xiangIdx], original: originalXiangBase, replacement: xiangBase, source: `${MOUNTS[xiangIdx]}向替${starName(xiangBase)}` })

  const shanPan = flyStars(shanBase, yangOf(shanBase, zuoIdx, shanLong))
  const xiangPan = flyStars(xiangBase, yangOf(xiangBase, xiangIdx, xiangLong))
  const zg = MOUNT_PALACE[zuoIdx], xg = MOUNT_PALACE[xiangIdx]
  const shanDao = shanPan[zg] === yun, xiangDao = xiangPan[xg] === yun
  const shanShang = xiangPan[zg] === yun, xiangXia = shanPan[xg] === yun
  let geju: string
  if (shanDao && xiangDao) geju = '旺山旺向 (到山到向) — 传统称丁财两旺名局, 仍须峦头外局复核'
  else if (shanShang && xiangXia) geju = '上山下水 — 山向颠倒, 传统作丁财受损之象; 非坐实朝空反局不用'
  else if (shanPan[xg] === yun && xiangPan[xg] === yun) geju = '双星到向 — 向上旺星重见, 财象偏显; 丁象须另参山星、坐实与外局砂水'
  else if (shanPan[zg] === yun && xiangPan[zg] === yun) geju = '双星到坐 — 坐上旺星重见, 丁象偏显; 坐方以高实有靠为象; 水法须配合外局砂水复核, 不可单凭室内水物断吉'
  else geju = '山向星力平常, 细看各宫组合'
  const panKind: XuanKongPanKind = replacementUses.length ? '替卦盘' : '下卦盘'
  return { yun, yunPan, shanPan, xiangPan, geju, zuo: zuoIdx, xiang: xiangIdx, panKind, replacementUses }
}

export function resolveXuanKongFacing(rawFacing: string, rawDegree?: string, rawMode?: string): XuanKongDegreeResult {
  const mode = (rawMode ?? 'auto').trim() || 'auto'
  if (!['auto', 'lower', 'replacement'].includes(mode)) throw new Error('玄空盘式需选择自动、强制下卦或强制替卦')
  const selectedIdx = MOUNTS.indexOf(rawFacing)
  if (selectedIdx < 0) throw new Error('向首必须为二十四山之一')
  const text = (rawDegree ?? '').trim()
  let xiangIdx = selectedIdx
  let degree: number | null = null
  let offset = 0
  if (text) {
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) throw new Error('实测向首度数需为数字, 以0°=子/正北、顺时针计')
    degree = ((Number(text) % 360) + 360) % 360
    if (!Number.isFinite(degree)) throw new Error('实测向首度数需为有效数字')
    let best = 0
    let bestOffset = 360
    for (let i = 0; i < 24; i++) {
      const d = circularDiff(degree, mountDeg(i))
      if (d < bestOffset) { best = i; bestOffset = d }
    }
    xiangIdx = best
    offset = bestOffset
  }
  const zuoIdx = (xiangIdx + 12) % 24
  const autoReplacement = degree !== null && offset > 4.5
  const useReplacement = mode === 'replacement' ? true : mode === 'lower' ? false : autoReplacement
  const panKind: XuanKongPanKind = useReplacement ? '替卦盘' : '下卦盘'
  const zone = degree === null
    ? `未填实测度数, 以表单向首${MOUNTS[xiangIdx]}排下卦; 如在每山中线4.5°外、距邻山线约3°内, 应补度数排替卦`
    : `${degree.toFixed(2)}°归${MOUNTS[xiangIdx]}向, 偏中线${offset.toFixed(2)}°; ${offset > 4.5 ? '在兼线替卦带' : '在下卦正向带'}`
  const note = `${zone}${mode !== 'auto' ? `; 盘式由表单强制为${panKind}` : ''}`
  return { degree, xiangIdx, zuoIdx, offset, panKind, useReplacement, note }
}

export function cityGate(fx: FeiXing): CityGateResult {
  const xg = MOUNT_PALACE[fx.xiang]
  const compassIdx = COMPASS_PALACES.indexOf(xg as typeof COMPASS_PALACES[number])
  if (compassIdx < 0) throw new Error('向首宫不在八方宫内, 无法取城门旁宫')
  const sidePalaces = [COMPASS_PALACES[(compassIdx + 7) % 8], COMPASS_PALACES[(compassIdx + 1) % 8]]
  const facingXiangStar = fx.xiangPan[xg]
  const candidates = sidePalaces.map(p => {
    const xiangStar = fx.xiangPan[p]
    const relations: string[] = []
    if (xiangStar + facingXiangStar === 10) relations.push('与向星合十')
    if (xiangStar !== facingXiangStar && sameSanBan(xiangStar, facingXiangStar)) relations.push('与向星同父母三般')
    return {
      palace: p,
      direction: palaceName(p),
      xiangStar,
      facingXiangStar,
      relation: relations.join('、') || '未合十/未同父母三般',
      status: relations.length > 0 ? '正城门' as const : '未成城门' as const,
    }
  })
  const positive = candidates.filter(c => c.status === '正城门')
  const summary = positive.length
    ? `正城门候选在${positive.map(c => `${c.direction}(${c.relation})`).join('、')}; 只作收气旁门的理气复核线索, 仍须外局砂水与实际门路核验`
    : '向首旁两宫未见向星合十或父母三般卦, 本盘不标正城门; 其它城门派法待师承复核'
  return { facingPalace: xg, facingDirection: palaceName(xg), candidates, summary }
}

export function sevenStarRobbery(fx: FeiXing): SevenStarRobberyResult {
  const xg = MOUNT_PALACE[fx.xiang]
  const mode = xg === 9 ? '离宫打劫' : xg === 1 ? '坎宫打劫' : '非离坎向'
  const source = '《沈氏玄空学》七星打劫章: 以离/坎向首及向星父母三般卦联珠判真伪; 水口库气细法有派别异说, 本盘不作现场断验'
  if (mode === '非离坎向') {
    return {
      status: '不成立',
      mode,
      facingPalace: xg,
      facingDirection: palaceName(xg),
      parentGroup: null,
      palaces: [],
      robbedPalaces: [],
      borrowedQi: [],
      note: '向首不在离宫或坎宫, 不入七星打劫结构。',
      source,
    }
  }
  const palaceSet = mode === '离宫打劫'
    ? [9, 6, 3] // 离为向首, 乾、震为借气两宫。
    : [1, 4, 7] // 坎为向首, 巽、兑为借气两宫。
  const palaces = palaceSet.map((p, i) => ({
    palace: p,
    direction: palaceName(p),
    xiangStar: fx.xiangPan[p],
    role: i === 0 ? '向首' as const : '借气' as const,
  }))
  const facing = palaces[0]
  const borrowed = palaces.slice(1)
  const stars = palaces.map(p => p.xiangStar)
  const group = sanBanGroupOf(stars)
  const fullLinked = group !== null && new Set(stars).size === 3
  const partialBorrowed = borrowed.filter(p => sameSanBan(facing.xiangStar, p.xiangStar))
  const status: SevenStarRobberyStatus = fullLinked ? '真打劫' : partialBorrowed.length ? '假打劫' : '不成立'
  const robbedPalaces = fullLinked ? borrowed : partialBorrowed
  const borrowedQi = robbedPalaces.map(p => `${p.direction}${p.xiangStar}${starName(p.xiangStar)}`)
  const parentText = group ? group.join('') : '未成组'
  const note = status === '真打劫'
    ? `${mode}: ${palaces.map(p => `${p.direction}${p.xiangStar}`).join('、')}联成父母三般卦${parentText}, 判真打劫; 所借之气仅按向星结构列示, 具体水口/库气须现场复核。`
    : status === '假打劫'
      ? `${mode}: 向首${facing.direction}${facing.xiangStar}仅与${partialBorrowed.map(p => `${p.direction}${p.xiangStar}`).join('、')}同父母三般, 三宫未联珠, 判假打劫。`
      : `${mode}: ${palaces.map(p => `${p.direction}${p.xiangStar}`).join('、')}未成父母三般联珠, 不成立。`
  return {
    status,
    mode,
    facingPalace: xg,
    facingDirection: palaceName(xg),
    parentGroup: group,
    palaces,
    robbedPalaces,
    borrowedQi,
    note,
    source,
  }
}

export function parseAnnualYear(raw?: string): number {
  const text = (raw ?? '').trim()
  if (!text) throw new Error('玄空流年年份需填写, 不按系统当前年份自动推年飞星')
  if (!/^\d{1,4}$/.test(text)) throw new Error('玄空流年年份需为1-9999之间的整数')
  const year = Number(text)
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('玄空流年年份需为1-9999之间的整数')
  return year
}

export function annualFlyingStars(year: number): AnnualFlyingStars {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('玄空流年年份需为1-9999之间的整数')
  const root = digitRoot9(year)
  const center = 11 - root > 9 ? 11 - root - 9 : 11 - root
  const pan = flyStars(center, true)
  const dirOf = (star: number) => palaceName(Number(Object.keys(pan).find(p => pan[Number(p)] === star)))
  const warningText = `五黄${dirOf(5)}, 二黑病符${dirOf(2)}; 仅提示动土、装修、久坐等条件需复核, 不作镇物或改造处方`
  const auspiciousText = `一白${dirOf(1)}、六白${dirOf(6)}、八白${dirOf(8)}、九紫${dirOf(9)}为流年吉星方位线索; 四绿${dirOf(4)}可作文昌象义参考`
  return { year, center, pan, warningText, auspiciousText }
}
// ---- 命卦 (东四命/西四命, 以年支立春为界的出生年计) ----
function digitRoot9(n: number): number { let x = n; while (x > 9) x = String(x).split('').reduce((a, b) => a + Number(b), 0); return x }
export function mingGua(year: number, female: boolean): { gua: string; group: '东四命' | '西四命' } {
  const s = digitRoot9(year)
  let k = female ? digitRoot9(s + 4) : 11 - s
  while (k > 9) k = digitRoot9(k)
  if (k === 5) k = female ? 8 : 2
  const gua = ({ 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' } as Record<number, string>)[k]
  const group = ['坎', '离', '震', '巽'].includes(gua) ? '东四命' : '西四命'
  return { gua, group }
}
type MingGuaBirthResult = ReturnType<typeof mingGua> & {
  year: number
  boundary: string
  source: 'birthdate' | 'birthyear'
  label: string
}

function parseYmd(s?: string, label = '日期'): { y: number; m: number; d: number } | null {
  const text = (s ?? '').trim()
  if (!text) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!m) throw new Error(`${label}需为 YYYY-MM-DD 格式`)
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error(`${label}需为有效公历日期`)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) throw new Error(`${label}需为有效公历日期`)
  return { y, m: mo, d }
}

function parseHm(s?: string, label = '时间'): { hh: number; mi: number } | null {
  const text = (s ?? '').trim()
  if (!text) return null
  const m = /^(\d{2}):(\d{2})$/.exec(text)
  if (!m) throw new Error(`${label}需为 HH:mm 格式`)
  const hh = Number(m[1]), mi = Number(m[2])
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59) throw new Error(`${label}需为 00:00 到 23:59`)
  return { hh, mi }
}

function parseFengshuiTz(raw: string | undefined, label: string): number {
  const text = (raw ?? '8').trim()
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) throw new Error(`${label}需为数字, 如 8、5.5、-5`)
  const tz = Number(text)
  if (!Number.isFinite(tz) || tz < -12 || tz > 14) throw new Error(`${label}需在 UTC-12 到 UTC+14 之间`)
  return tz
}

function parseBirthYear(s?: string): number | null {
  const text = (s ?? '').trim()
  if (!text) return null
  if (!/^\d{1,4}$/.test(text)) throw new Error('宅主出生年需为公历年份数字')
  const year = Number(text)
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('宅主出生年需为有效公历年份')
  return year
}

export function yunOfDate(date: string, time = '', tz = 8): YunDateResult {
  const built = parseYmd(date, '建成/大修日期')
  if (!built) throw new Error('建成/大修日期需填写')
  const t = parseHm(time, '建成/大修时间')
  const lichun = findSunLongitude(315, jdFromUT(built.y, 2, 4))
  const start = jdFromUT(built.y, built.m, built.d, -tz)
  const end = jdFromUT(built.y, built.m, built.d, 24 - tz)
  const boundary = `玄空元运以立春为年界; 本年立春约 ${fmtLocalJd(lichun, tz)}`
  let year: number | null = null
  let precision: string
  if (t) {
    year = jdFromUT(built.y, built.m, built.d, t.hh + t.mi / 60 - tz) < lichun ? built.y - 1 : built.y
    precision = `按建成/大修时刻 ${date} ${time}`
  } else if (end <= lichun) {
    year = built.y - 1
    precision = `按建成/大修日期 ${date}; 此日仍在立春前`
  } else if (start >= lichun) {
    year = built.y
    precision = `按建成/大修日期 ${date}; 此日已过立春`
  } else {
    throw new Error(`建成/大修日期 ${date} 正逢立春交接日; 玄空元运以立春为年界, 请补建成/大修时间后再定运`)
  }
  return { yun: yunOf(year), year, boundary: `${boundary}; ${precision}`, source: 'constructionDate', label: `${date}${time ? ' ' + time : ''}` }
}

export function resolveManualYun(raw?: string): ManualYunResult {
  const text = (raw ?? '').trim()
  if (!text) {
    throw new Error('玄空元运需填写建成/大修日期, 或手动选择 1-9 运')
  }
  if (!/^[1-9]$/.test(text)) throw new Error('玄空手动元运需为 1-9 的整数')
  const yun = Number(text)
  return {
    yun,
    boundary: `手动选择${yun}运; 年份标签为简写, 未填建成/大修日期, 未按立春时刻自动分运`,
  }
}

export function resolveXuanKongYun(v: Record<string, string | undefined>): YunDateResult | ManualYunResult {
  const constructionDate = (v.constructionDate ?? '').trim()
  const constructionTime = (v.constructionTime ?? '').trim()
  if (!constructionDate && constructionTime) throw new Error('填写建成/大修时间时需同时填写建成/大修日期')
  if (constructionDate) return yunOfDate(constructionDate, constructionTime, parseFengshuiTz(v.constructionTz, '建成/大修时区'))
  return resolveManualYun(v.period)
}

function fmtLocalJd(jdUT: number, tz = 8): string {
  const u = utFromJD(jdUT + tz / 24)
  const hh = Math.floor(u.hours)
  const mi = Math.round((u.hours - hh) * 60)
  const h2 = String(mi === 60 ? hh + 1 : hh).padStart(2, '0')
  const m2 = String(mi === 60 ? 0 : mi).padStart(2, '0')
  return `${u.y}-${String(u.m).padStart(2, '0')}-${String(u.d).padStart(2, '0')} ${h2}:${m2} UTC${tz >= 0 ? '+' : ''}${tz}`
}

export function mingGuaFromBirthDate(date: string, female: boolean, time = '', tz = 8): MingGuaBirthResult | null {
  const birth = parseYmd(date, '宅主出生日期')
  if (!birth) return null
  const t = parseHm(time, '宅主出生时间')
  const lichun = findSunLongitude(315, jdFromUT(birth.y, 2, 4))
  const start = jdFromUT(birth.y, birth.m, birth.d, -tz)
  const end = jdFromUT(birth.y, birth.m, birth.d, 24 - tz)
  const boundary = `八宅命卦以立春为年界; 本年立春约 ${fmtLocalJd(lichun, tz)}`
  let year: number | null = null
  let precision: string
  if (t) {
    year = jdFromUT(birth.y, birth.m, birth.d, t.hh + t.mi / 60 - tz) < lichun ? birth.y - 1 : birth.y
    precision = `按出生时刻 ${date} ${time}`
  } else if (end <= lichun) {
    year = birth.y - 1
    precision = `按出生日期 ${date}; 此日仍在立春前`
  } else if (start >= lichun) {
    year = birth.y
    precision = `按出生日期 ${date}; 此日已过立春`
  } else {
    return null
  }
  return { ...mingGua(year, female), year, boundary: `${boundary}; ${precision}`, source: 'birthdate', label: `${date}${time ? ' ' + time : ''}` }
}

export function resolveMingGua(v: Record<string, string>): { mg: MingGuaBirthResult | null; prompt: string } {
  const by = parseBirthYear(v.birthyear)
  const hasBirthInput = Boolean(v.birthdate) || by !== null
  if (hasBirthInput && v.gender2 !== 'male' && v.gender2 !== 'female') {
    return {
      mg: null,
      prompt: '八宅命卦男女取法不同; 已填宅主生日/年份, 请先选择宅主性别后再定命卦。',
    }
  }
  const female = v.gender2 === 'female'
  if (v.birthdate) {
    const mg = mingGuaFromBirthDate(v.birthdate, female, v.birthtime, parseFengshuiTz(v.birthTz, '宅主出生时区'))
    if (mg) return { mg, prompt: '' }
    return {
      mg: null,
      prompt: `宅主生日 ${v.birthdate} 正逢立春交接日; 八宅命卦以立春为年界, 请补出生时间后再定命卦。`,
    }
  }
  if (by !== null) {
    return {
      mg: { ...mingGua(by, female), year: by, source: 'birthyear', label: `${by}年`, boundary: '仅按出生年估算; 未提供完整出生日期, 无法判定立春前年份归属' },
      prompt: '',
    }
  }
  return { mg: null, prompt: '填完整出生日期和宅主性别可按立春年界定命卦; 只填出生年则仅作年份口径估算。' }
}
// 大游年: 宅卦 → 按 乾坎艮震巽离坤兑 序的游星
const YOUNIAN: Record<string, Record<string, string>> = {
  乾: { 乾: '伏位', 坎: '六煞', 艮: '天医', 震: '五鬼', 巽: '祸害', 离: '绝命', 坤: '延年', 兑: '生气' },
  坎: { 乾: '六煞', 坎: '伏位', 艮: '五鬼', 震: '天医', 巽: '生气', 离: '延年', 坤: '绝命', 兑: '祸害' },
  艮: { 乾: '天医', 坎: '五鬼', 艮: '伏位', 震: '六煞', 巽: '绝命', 离: '祸害', 坤: '生气', 兑: '延年' },
  震: { 乾: '五鬼', 坎: '天医', 艮: '六煞', 震: '伏位', 巽: '延年', 离: '生气', 坤: '祸害', 兑: '绝命' },
  巽: { 乾: '祸害', 坎: '生气', 艮: '绝命', 震: '延年', 巽: '伏位', 离: '天医', 坤: '五鬼', 兑: '六煞' },
  离: { 乾: '绝命', 坎: '延年', 艮: '祸害', 震: '生气', 巽: '天医', 离: '伏位', 坤: '六煞', 兑: '五鬼' },
  坤: { 乾: '延年', 坎: '绝命', 艮: '生气', 震: '祸害', 巽: '五鬼', 离: '六煞', 坤: '伏位', 兑: '天医' },
  兑: { 乾: '生气', 坎: '祸害', 艮: '延年', 震: '绝命', 巽: '六煞', 离: '五鬼', 坤: '天医', 兑: '伏位' },
}
const STAR_NOTE: Record<string, string> = {
  生气: '传统吉名·贪狼木 — 生发之气, 门/主卧/办公位象', 延年: '传统吉名·武曲金 — 和合长久, 卧室/关系位象',
  天医: '传统吉名·巨门土 — 安康照护象, 卧室/厨房象', 伏位: '传统平稳名·辅弼 — 平稳守成, 静室象',
  祸害: '传统凶名·禄存土 — 口舌琐碎象, 储物/卫浴象', 六煞: '传统凶名·文曲水 — 桃花是非象, 卫浴/杂物象',
  五鬼: '传统凶名·廉贞火 — 是非耗财象, 静置/储藏象', 绝命: '传统凶名·破军金 — 耗损之位, 卫浴/杂物象',
}
const FS_MAP: Record<string, Record<string, string>> = {
  mingtang: { 开阔: '明堂开阔——纳气有余之象', 一般: '明堂平常——仅作空间尺度记录', 拥堵: '明堂拥堵——气口受阻之象, 需复核实际动线与堆放' },
  light: { 充足: '采光充足——明亮通透之象', 一般: '采光一般——明暗需结合时段复核', 阴暗: '采光阴暗——光气偏弱之象, 需复核照明与通风条件' },
  flow: { 顺畅: '动线顺畅——气行有情', 曲折: '动线曲折——气行迂回, 尚可', 穿堂: '门窗对穿——穿堂风直泄之象, 需现场复核风口' },
  backing: { 有靠: '座有实靠——背后有承托之象', 无靠: '背后空虚——主位悬空之象, 需复核实际座位与墙面关系' },
  clutter: { 整洁: '窗明几净——气场清爽', 一般: '略有杂物——仅作整洁度观察', 杂乱: '杂物淤积——气滞之象, 需复核真实使用状态' },
  sha: { 无: '未见明显形煞', 梁压顶: '横梁压顶——压迫之象, 需复核床/桌与梁的相对位置', 镜对床: '镜对床——扰神之象, 需复核镜面朝向', 门对门: '门门相对——口舌之象, 需复核门线关系', 尖角冲射: '尖角冲射——冲射之象, 需复核尖角与人位距离' },
}

export const fengshuiModule: ModuleDef = {
  id: 'fengshui',
  category: 'xiang',
  name: '风水 · 堪舆',
  subtitle: '中国 · 八宅+玄空飞星',
  tagline: '罗盘坐向与飞星格局',
  glyph: '🏮',
  ritual: 'lens',
  vision: true,
  inputs: [
    F_IMG('拍下房间全景或户型图, 站在门口向内拍最佳'),
    {
      key: 'facing', label: '向首/朝向 (二十四山)', type: 'select', default: '午',
      options: MOUNTS.map((m, i) => ({ value: m, label: `${m}向 (${['N', 'N', 'N', 'NE', 'NE', 'NE', 'E', 'E', 'E', 'SE', 'SE', 'SE', 'S', 'S', 'S', 'SW', 'SW', 'SW', 'W', 'W', 'W', 'NW', 'NW', 'NW'][i]} ${mountDeg(i)}°±7.5°)` })),
      help: '面向室外量建筑纳气朝向/向首: 0°=子(北) 90°=卯(东) 180°=午(南) 270°=酉(西)。若以阳台为向, 请不要再用大门所在方位混算',
    },
    { key: 'facingDegree', label: '实测向首度数(可选)', type: 'number', placeholder: '如 184.8', help: '0°=子/正北, 90°=卯/正东, 180°=午/正南, 顺时针; 填写后以度数自动归二十四山并判下卦/替卦。每山中线4.5°内为下卦, 外侧约3°兼线带排替卦。' },
    { key: 'xkPanMode', label: '玄空盘式', type: 'select', default: 'auto', options: [{ value: 'auto', label: '自动判定(有度数按兼线)' }, { value: 'lower', label: '强制下卦盘' }, { value: 'replacement', label: '强制替卦盘' }], help: '默认按实测度数判定; 无度数时沿用所选向首排下卦。若师承以3°/4.5°边界不同, 可手动强制盘式并在解读中说明。' },
    { key: 'annualYear', label: '流年年份(年紫白)', type: 'number', required: true, placeholder: '2026', help: '指定立春年复盘流年飞星; 不按系统当前年份自动推。年飞星以该年立春后的一白二黑等紫白入中飞九宫。' },
    {
      key: 'period', label: '元运 (建成/最近大装修年代)', type: 'select', default: '',
      options: [{ value: '', label: '不手动选择 · 填建成/大修日期自动判运' }, { value: '9', label: '九运 2024立春后-2044立春前' }, { value: '8', label: '八运 2004立春后-2024立春前' }, { value: '7', label: '七运 1984立春后-2004立春前' }, { value: '6', label: '六运 1964立春后-1984立春前' }],
      help: '玄空以宅之元运立盘, 常取建成或换天心(大修)之运; 不填日期时必须手动选择元运',
    },
    { key: 'constructionDate', label: '建成/大修日期(推元运可选)', type: 'date', help: '填后按立春精确分九运; 不填则必须使用上方手动元运' },
    { key: 'constructionTime', label: '建成/大修时间(立春日可选)', type: 'time', help: '立春交接日必须填写, 仅填时间无效' },
    { key: 'constructionTz', label: '建成/大修时区', type: 'select', default: '8', options: TZ_OPTIONS, help: '用于立春年界比较; 海外或夏令时请选实际 UTC 偏移' },
    { key: 'birthdate', label: '宅主出生日期(命卦可选)', type: 'date', help: '八宅命卦以立春为年界; 立春前出生按上一命卦年' },
    { key: 'birthtime', label: '宅主出生时间(立春日可选)', type: 'time', help: '仅用于立春当天精确判定命卦年界, 不影响玄空飞星' },
    { key: 'birthTz', label: '宅主出生时区', type: 'select', default: '8', options: TZ_OPTIONS, help: '用于八宅命卦立春年界比较; 海外或夏令时请选实际 UTC 偏移' },
    { key: 'birthyear', label: '宅主出生年(兼容估算)', type: 'number', placeholder: '如 1990; 无完整日期时才用' },
    { key: 'gender2', label: '宅主性别(命卦必填)', type: 'select', default: '', options: [{ value: '', label: '不填命卦' }, { value: 'male', label: '男' }, { value: 'female', label: '女' }] },
    { key: 'roomtype', label: '空间类型', type: 'select', default: '客厅', options: ['客厅', '卧室', '书房/办公', '门厅', '整屋户型图'].map(x => ({ value: x, label: x })) },
  ],
  async compute(v) {
    needKey(v)
    const schema = obj({
      isRoom: { type: 'boolean' },
      mingtang: enumProp(['开阔', '一般', '拥堵']),
      light: enumProp(['充足', '一般', '阴暗']),
      flow: enumProp(['顺畅', '曲折', '穿堂']),
      backing: enumProp(['有靠', '无靠']),
      clutter: enumProp(['整洁', '一般', '杂乱']),
      sha: enumProp(['无', '梁压顶', '镜对床', '门对门', '尖角冲射']),
      note: { type: 'string' },
    })
    const o = await observeImage({
      provider: aiProvider(v),
      apiKey: v._apiKey, apiBaseUrl: v._apiBaseUrl, model: v._model, imageBase64: imgData(v), mediaType: 'image/jpeg',
      reasoningEffort: v._deepThink ? 'xhigh' : 'medium',
      protocol: `你是风水堪舆观察员。此照片是「${v.roomtype}」。请客观分类: isRoom是否为室内空间/户型图; mingtang主要活动区开阔度; light采光; flow动线(若见门窗直线相对选"穿堂"); backing主座位/床头是否有实墙依靠; clutter整洁度; sha最显著的形煞(横梁正压床或座位=梁压顶; 镜子正对床=镜对床; 两门相对=门对门; 家具墙角尖锐正对人位=尖角冲射; 皆无=无); note其它风水相关观察25字内(无则"无")。`,
      schema,
    }) as { isRoom: boolean; mingtang: string; light: string; flow: string; backing: string; clutter: string; sha: string; note: string }
    if (!o.isRoom) throw new Error('这张照片看不出室内格局——请拍房间全景或户型图')

    // 坐向: 向山→坐山 (对宫), 宅卦取坐宫; 有实测度数时先归山并判下卦/替卦。
    const facing = resolveXuanKongFacing(v.facing, v.facingDegree, v.xkPanMode)
    const xiangIdx = facing.xiangIdx
    const zuoIdx = facing.zuoIdx
    const zhai = PALACE_GUA[MOUNT_PALACE[zuoIdx]]
    const stars = YOUNIAN[zhai]

    // 玄空飞星下卦/替卦盘
    const resolvedYun = resolveXuanKongYun(v)
    const yun = resolvedYun.yun
    const yunBoundary = resolvedYun.boundary
    const fx = feiXing(yun, zuoIdx, xiangIdx, { useReplacement: facing.useReplacement })
    const gates = cityGate(fx)
    const robbery = sevenStarRobbery(fx)
    const annual = annualFlyingStars(parseAnnualYear(v.annualYear))
    const sheng = yun % 9 + 1 // 生气星
    const starTag = (s: number) => s === yun ? '旺' : s === sheng ? '生' : [5].includes(s) ? '煞' : ''
    const replacementNote = fx.replacementUses.length
      ? `替星: ${fx.replacementUses.map(r => `${r.side === 'shan' ? '山' : '向'}${r.mountain}原${r.original}→${r.replacement}${starName(r.replacement)}`).join('、')}; 替星入中后按替星本宫同元龙阴阳定顺逆`
      : '下卦: 坐/向宫运星入中, 按同元龙阴阳顺逆飞布'
    const fxCells = DIR_LAYOUT_P.map(p => p === 5
      ? { title: '中宫', lines: [`${fx.shanPan[5]} ${fx.yunPan[5]} ${fx.xiangPan[5]}`, `[[山·运·向]]`] }
      : {
        title: `${palaceName(p)} ${PALACE_GUA[p]}${MOUNT_PALACE[zuoIdx] === p ? ' ·坐' : MOUNT_PALACE[xiangIdx] === p ? ' ·向' : ''}`,
        lines: [
          `${fx.shanPan[p]} ${fx.yunPan[p]} ${fx.xiangPan[p]}`,
          `[[山${fx.shanPan[p]}${starTag(fx.shanPan[p])} 向${fx.xiangPan[p]}${starTag(fx.xiangPan[p])}${fx.shanPan[p] === 5 || fx.xiangPan[p] === 5 ? ' 五黄慎动' : ''}]]`,
        ],
      })
    const annualCells = DIR_LAYOUT_P.map(p => {
      const s = annual.pan[p]
      const tags = [s === 5 ? '五黄慎动' : '', s === 2 ? '二黑病符' : '', [1, 6, 8, 9].includes(s) ? '吉星线索' : '', s === 4 ? '文昌象义' : ''].filter(Boolean)
      return { title: p === 5 ? '中宫' : palaceName(p), lines: [`流${s} ${starName(s)}`, `[[运${fx.yunPan[p]}${tags.length ? ' · ' + tags.join(' · ') : ''}]]`] }
    })
    const gateReads = gates.candidates.map(c => ({ k: `${c.direction}旁宫`, v: c.status, hint: `向星${c.xiangStar}, 向首${gates.facingDirection}向星${c.facingXiangStar}; ${c.relation}` }))
    const robberyReads = [
      { k: '判定', v: robbery.status, hint: robbery.note },
      { k: '向首宫', v: robbery.mode, hint: `向首${robbery.facingDirection}; ${robbery.source}` },
      { k: '三宫向星', v: robbery.palaces.length ? robbery.palaces.map(p => `${p.direction}${p.xiangStar}`).join('、') : '非离坎向', hint: robbery.parentGroup ? `父母三般卦${robbery.parentGroup.join('')}` : '未成父母三般卦联珠' },
      { k: '所借之气', v: robbery.borrowedQi.length ? robbery.borrowedQi.join('、') : '无', hint: robbery.robbedPalaces.length ? `所劫/所借宫: ${robbery.robbedPalaces.map(p => p.direction).join('、')}; 水口库气细法待考` : '未列借气宫' },
    ]

    // 八宅游年
    const DIR_LAYOUT = ['巽', '离', '坤', '震', null, '兑', '艮', '坎', '乾']
    const bzCells = DIR_LAYOUT.map(g => g === null
      ? { title: '中宫', lines: [`${zhai}宅`, `[[坐${MOUNTS[zuoIdx]}向${MOUNTS[xiangIdx]}]]`] }
      : { title: DIR_OF_GUA[g], lines: [`${stars[g]}`, `[[${STAR_NOTE[stars[g]].split(' — ')[0]}]]`] })

    // 命卦配宅
    const { mg, prompt: mingPrompt } = resolveMingGua(v)
    const zhaiGroup = ['坎', '离', '震', '巽'].includes(zhai) ? '东四宅' : '西四宅'
    const mgFit = mg ? (mg.group === '东四命') === (zhaiGroup === '东四宅') : null

    const obsReads = [
      { k: '明堂', v: o.mingtang, hint: FS_MAP.mingtang[o.mingtang] },
      { k: '采光', v: o.light, hint: FS_MAP.light[o.light] },
      { k: '动线', v: o.flow, hint: FS_MAP.flow[o.flow] },
      { k: '靠山', v: o.backing, hint: FS_MAP.backing[o.backing] },
      { k: '整洁', v: o.clutter, hint: FS_MAP.clutter[o.clutter] },
      { k: '形煞', v: o.sha, hint: FS_MAP.sha[o.sha] },
    ]
    const good = GUAS.filter(g => ['生气', '延年', '天医'].includes(stars[g]))
    const wangShanPalace = Object.keys(fx.xiangPan).find(p => fx.xiangPan[Number(p)] === yun)
    const shengPalace = Object.keys(fx.xiangPan).find(p => fx.xiangPan[Number(p)] === sheng)
    const dirOrCenter = (p: string | undefined) => p === undefined ? '未定' : p === '5' ? '中宫' : palaceName(Number(p))
    const wangShanNote = wangShanPalace === '5'
      ? '入中宫——玄空传统称「令星入囚」, 视为需留意的警讯而非纳气吉方, 传统多主张向方开阔见水可稍解'
      : `在**${dirOrCenter(wangShanPalace)}**——传统以此方为纳旺气的象义线索`

    const fixedReading = [
      `**坐${MOUNTS[zuoIdx]}向${MOUNTS[xiangIdx]}** (${zhai}宅·${zhaiGroup}), ${yun}运${fx.panKind}: **${fx.geju}**。`,
      `**元运口径**: ${yunBoundary}。`,
      `**盘式判定**: ${facing.note}; ${replacementNote}。`,
      `当运旺星${yun}(向星)${wangShanNote}; 生气星${sheng}${shengPalace === '5' ? '入中宫, 同样按入囚警讯参考' : `在${dirOrCenter(shengPalace)}, 可作下一步进气方参考`}。飞星盘上凡见**5(五黄)**之宫, 只提示需慎重复核动土、装修与久坐条件。`,
      `**城门诀**: ${gates.summary}。`,
      `**七星打劫**: ${robbery.note} ${robbery.borrowedQi.length ? `所借之气: ${robbery.borrowedQi.join('、')}。` : ''}`,
      `**${annual.year}流年飞星**: ${starName(annual.center)}入中; ${annual.warningText}; ${annual.auspiciousText}。`,
      `**八宅**: 三吉方在**${good.map(g => DIR_OF_GUA[g]).join('、')}**(生气/延年/天医), 仅作床/桌/门方位复核资料。`,
      mg ? `宅主${mg.label}生, 命卦年按**${mg.year}**计, 命卦**${mg.gua}(${mg.group})**, 此宅为${zhaiGroup}——${mgFit ? '**命宅相配**, 作同组象义参考' : '**命宅异组**, 需另复核卧室、床位与个人吉方资料, 不直接推出换宅或调改结论'}。${mg.boundary}。` : `(${mingPrompt})`,
      `**法眼观形**: ${FS_MAP.mingtang[o.mingtang]}; ${FS_MAP.light[o.light]}; ${FS_MAP.flow[o.flow]}; ${FS_MAP.backing[o.backing]}; ${FS_MAP.sha[o.sha]}。`,
      `理气(飞星/八宅)看方位, 峦头(形势/整洁/光)看基础——峦头不真, 理气不灵; 本盘只列复核线索, 不替代现场定案。`,
      FENGSHUI_AUDIT,
    ].filter(Boolean).join('\n')
    return {
      headline: `坐${MOUNTS[zuoIdx]}向${MOUNTS[xiangIdx]} · ${yun}运 · ${fx.geju.split(' ')[0]}`,
      badge: '🏮',
      sections: [
        { title: '堪舆边界', kind: 'text', data: FENGSHUI_AUDIT },
        { title: `玄空飞星 · ${yun}运 坐${MOUNTS[zuoIdx]}向${MOUNTS[xiangIdx]} (${fx.panKind})`, kind: 'grid9', data: { cells: fxCells, note: `每宫: 山星·运星·向星 (上南下北) · ${fx.geju} · ${yunBoundary} · ${facing.note} · ${replacementNote}` } },
        { title: `城门诀 · 向首${gates.facingDirection}旁两宫`, kind: 'pairs', data: { items: gateReads } },
        { title: `七星打劫 · ${robbery.status}`, kind: 'pairs', data: { items: robberyReads } },
        { title: `流年飞星 · ${annual.year}年 ${starName(annual.center)}入中`, kind: 'grid9', data: { cells: annualCells, note: `每宫: 流年星·运星 (上南下北) · ${annual.warningText} · ${annual.auspiciousText}` } },
        { title: `八宅游年 (${zhai}宅)`, kind: 'grid9', data: { cells: bzCells, note: '生气/延年/天医为三吉方 · 本盘以坐山起伏位(主流古法); 另有《阳宅三要》以大门起、《八宅明镜》以年命起两派, 门坐分离者宜并参' } },
        ...(mg ? [{ title: '命卦配宅', kind: 'pairs' as const, data: { items: [{ k: '宅主命卦', v: `${mg.gua} · ${mg.group}`, hint: `男命=11-年数根, 女命=年数根+4 (五寄坤艮); 命卦年=${mg.year}` }, { k: '年界口径', v: mg.source === 'birthdate' ? '立春年界' : '年份估算', hint: mg.boundary }, { k: '宅', v: `${zhai}宅 · ${zhaiGroup}`, hint: mgFit ? '命宅同组相配' : '命宅异组, 需复核床位书桌与个人方位资料, 不作调改结论' }] } }] : [{ title: '命卦配宅', kind: 'text' as const, data: mingPrompt }]),
        { title: '法眼观形', kind: 'pairs', data: { items: obsReads } },
        ...(o.note && o.note !== '无' ? [{ title: '其它观察', kind: 'text' as const, data: o.note }] : []),
      ],
      fixedReading,
      aiContext: [
        `风水观测(${v.roomtype}, 坐${MOUNTS[zuoIdx]}向${MOUNTS[xiangIdx]}, ${zhai}宅${zhaiGroup}, ${yun}运${fx.panKind}): ${yunBoundary}; ${facing.note}; ${replacementNote}; ${FENGSHUI_AUDIT}`,
        `玄空飞星(宫:山/运/向): ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => `${p === 5 ? '中' : palaceName(p)}${fx.shanPan[p]}/${fx.yunPan[p]}/${fx.xiangPan[p]}`).join(' ')} — ${fx.geju}`,
        `城门诀: 向首${gates.facingDirection}, ${gates.summary}`,
        `七星打劫: ${robbery.status}; ${robbery.note}; 所借之气=${robbery.borrowedQi.join('、') || '无'}; ${robbery.source}`,
        `流年飞星: ${annual.year}年${starName(annual.center)}入中; ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => `${p === 5 ? '中' : palaceName(p)}流${annual.pan[p]}运${fx.yunPan[p]}`).join(' ')}; ${annual.warningText}; ${annual.auspiciousText}`,
        `八宅游星: ${GUAS.map(g => `${DIR_OF_GUA[g]}${stars[g]}`).join(' ')}`,
        mg ? `宅主命卦${mg.gua}(${mg.group}), 命卦年${mg.year}, ${mg.boundary}, ${mgFit ? '与宅相配' : '与宅异组'}` : `命卦未定: ${mingPrompt}`,
        `观形: ` + obsReads.map(r => `${r.k}${r.v}(${r.hint})`).join('; ') + (o.note ? `; 其它: ${o.note}` : ''),
        `请综合玄空(下卦/替卦盘式、向星旺方、山星旺方、七星打劫真/假/不成立结构、城门候选、流年五黄二黑方只作理气象义)、八宅吉方、命卦、观形, 给出3-5条观察性复核提醒; 七星打劫只按向首宫与父母三般卦联珠说明, 不扩写水口库气处方; 明确说明未经实地罗盘复测与外局砂水核验前不可作定案, 不开镇物、改造或现实行动处方。`,
      ].filter(Boolean).join('\n'),
      followups: ['七星打劫真/假怎么按三宫复核?', '城门候选还需复核哪些外局?', '指定流年飞星怎么看五黄二黑?'],
    }
  },
}

// ================= Vastu =================
const VASTU_ZONES: { dir: string; deity: string; element: string; best: string }[] = [
  { dir: '东南', deity: 'Agni 火神', element: '火', best: '厨房/电器' },
  { dir: '南', deity: 'Yama 阎摩', element: '土', best: '卧室/重家具' },
  { dir: '西南', deity: 'Nairritya', element: '土', best: '主卧/保险柜' },
  { dir: '东', deity: 'Indra 因陀罗', element: '风', best: '门窗/晨光' },
  { dir: '中', deity: 'Brahma 梵天', element: '空', best: '留空/天井' },
  { dir: '西', deity: 'Varuna 水神', element: '水', best: '餐厅/儿童房' },
  { dir: '东北', deity: 'Ishanya 方位神', element: '水', best: '水源/静室' },
  { dir: '北', deity: 'Kubera 方位神', element: '水', best: '收纳/办公' },
  { dir: '西北', deity: 'Vayu 风神', element: '风', best: '客房/储藏' },
]

export const vastuModule: ModuleDef = {
  id: 'vastu',
  category: 'xiang',
  name: 'Vastu Shastra',
  subtitle: '印度 · 建筑吠陀',
  tagline: '户型方位映射 Vastu 分类',
  glyph: '🕌',
  ritual: 'lens',
  vision: true,
  inputs: [
    F_IMG('户型图或房间全景照'),
    { key: 'entrance', label: '大门朝向', type: 'select', default: '东', options: VASTU_DIRECTIONS.map(x => ({ value: x, label: '朝' + x })) },
  ],
  async compute(v) {
    const entrance = parseVastuEntrance((v as Record<string, unknown>).entrance)
    needKey(v)
    const schema = obj({
      isSpace: { type: 'boolean' },
      centerOpen: enumProp(['开敞', '有物但不重', '被重物占据']),
      light: enumProp(['明亮', '一般', '昏暗']),
      water: enumProp(['未见', '东北/北侧', '其它方位']),
      kitchenGuess: enumProp(['东南侧', '其它方位', '未见厨房']),
      clutter: enumProp(['整洁', '一般', '杂乱']),
      note: { type: 'string' },
    })
    const o = await observeImage({
      provider: aiProvider(v),
      apiKey: v._apiKey, apiBaseUrl: v._apiBaseUrl, model: v._model, imageBase64: imgData(v), mediaType: 'image/jpeg',
      reasoningEffort: v._deepThink ? 'xhigh' : 'medium',
      protocol: `你是 Vastu Shastra(印度建筑风水)观察员。用户说大门朝${entrance}(若是户型图, 以图上标注/门的位置推断方位; 若是照片, 按可见线索合理归类)。客观分类: isSpace是否为室内空间或户型图; centerOpen空间中心(Brahmasthan)是否开敞; light光照; water可见水元素(水槽/鱼缸/卫浴)大致方位; kitchenGuess厨房方位; clutter整洁度; note其它 Vastu 相关观察25字内(无则"无")。`,
      schema,
    }) as { isSpace: boolean; centerOpen: string; light: string; water: string; kitchenGuess: string; clutter: string; note: string }
    if (!o.isSpace) throw new Error('未能辨认出户型/室内空间, 请换一张')

    const ENTRANCE_LUCK: Record<string, string> = {
      北: '北门在 Kubera 方位——传统多作资源流动象', 东北: '东北门属 Ishanya 方位——传统作清净象',
      东: '东门迎晨光——传统作声望与活力象', 东南: '东南门 Agneya 火位开口——传统视为须化解之门位(火气过旺, 主口角急躁), 宜门色棕/橙、东北西南两区保持清净稳固',
      南: '南门阎摩位——传统视为需缓冲的方位象', 西南: '西南门土重之位——传统视为稳定少扰动之象',
      西: '西门水神位——中平, 社交象较重', 西北: '西北门风神位——多动迁之象, 需复核门位结构',
    }
    const cells = VASTU_ZONES.map(z => ({
      title: z.dir === '中' ? 'Brahmasthan' : z.dir,
      lines: [`${z.deity}`, `[[${z.element}行 · ${z.best}象]]`],
    }))
    const reads = [
      { k: '大门', v: '朝' + entrance, hint: ENTRANCE_LUCK[entrance] },
      { k: '中宫 Brahmasthan', v: o.centerOpen, hint: o.centerOpen === '开敞' ? '梵天位清净——空间开敞象较顺' : o.centerOpen === '有物但不重' ? '中宫微占——有轻度占用, 需合户型比例复核' : '中宫被压——传统作中宫受压象, 不开移动或改造处方' },
      { k: '光照', v: o.light, hint: o.light === '明亮' ? '明亮通透之象' : o.light === '一般' ? '可复核主要活动区采光' : '昏暗象较重, 需复核照明与通风条件' },
      { k: '水元素', v: o.water, hint: o.water === '东北/北侧' ? '水居北/东北——传统视为得位象' : o.water === '其它方位' ? '水不在北隅——仅作方位差异记录' : '未见水元素' },
      { k: '厨房', v: o.kitchenGuess, hint: o.kitchenGuess === '东南侧' ? '东南火位与厨房功能相合' : o.kitchenGuess === '其它方位' ? '厨房不在东南, 仅作方位差异记录, 不开补救处方' : '图中未见' },
      { k: '整洁', v: o.clutter, hint: o.clutter === '整洁' ? '通畅象较显' : '杂物较多作滞象, 仅记录整洁度' },
    ]

    const fixedReading = [
      `Vastu 以九宫铺开**Vastu Purusha Mandala**: 中央 Brahmasthan 以开敞为顺象; 八方有方位神名与属性, 本模块只作文化背景说明。`,
      `**大门朝${entrance}**: ${ENTRANCE_LUCK[entrance]}。`,
      `观测所见: 中宫${o.centerOpen}; 光照${o.light}; 水元素${o.water}; 厨房${o.kitchenGuess}。`,
      `Vastu 的常见观察线索: 中央少压迫、东北保持清爽、东南留意厨房火气、西南以稳定为象。此处只作图像观察提醒, 不替代实地罗盘、户型比例与师承判断。`,
      VASTU_AUDIT,
    ].join('\n')

    return {
      headline: `门朝${entrance} · 中宫${o.centerOpen} · 光照${o.light}`,
      badge: '🕌',
      sections: [
        { title: 'Vastu 边界', kind: 'text', data: VASTU_AUDIT },
        { title: 'Vastu Purusha Mandala', kind: 'grid9', data: { cells, note: '上南下北排布 · 方位神名仅作文化背景, 功能匹配需实地复核' } },
        { title: '法眼观宅', kind: 'pairs', data: { items: reads } },
        ...(o.note && o.note !== '无' ? [{ title: '其它观察', kind: 'text' as const, data: o.note }] : []),
      ],
      fixedReading,
      aiContext: `Vastu Shastra 观测(大门朝${entrance}): ${VASTU_AUDIT}\n` + reads.map(r => `${r.k}: ${r.v} (${r.hint})`).join('\n') + (o.note ? `\n其它: ${o.note}` : '') + '\n请以Vastu传统语境给出评价与3条空间观察要点; 方位神名只作文化背景, 不开祈祷、供奉、镇物、颜色补救、装修改造或仪轨处方。',
      followups: ['按 Vastu 卧室方位要复核哪些资料?', '哪些空间观测最需要现场确认?', 'Vastu 和中国风水口径差异怎么说明?'],
    }
  },
}
