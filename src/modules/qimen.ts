// 奇门遁甲 — 时家奇门 · 转盘 · 拆补法/置闰法
import type { FieldSpec, ModuleDef, Section } from '../core/types.ts'
import { jdFromUT, jdnFromYMD, utFromJD } from '../core/astro.ts'
import { BRANCH_WUXING, dayGanzhi, gzName, gzIndex, solarTermsOfYear, STEMS, STEM_WUXING, BRANCHES, wangShuai, xunKong, yimaOf } from '../core/chinese.ts'
import { F_QUESTION } from './common.ts'

// 二十四节气 → 三元局数 (阳遁: 冬至~芒种; 阴遁: 夏至~大雪)
const JU_TABLE: Record<string, { yang: boolean; ju: [number, number, number] }> = {
  冬至: { yang: true, ju: [1, 7, 4] }, 小寒: { yang: true, ju: [2, 8, 5] }, 大寒: { yang: true, ju: [3, 9, 6] },
  立春: { yang: true, ju: [8, 5, 2] }, 雨水: { yang: true, ju: [9, 6, 3] }, 惊蛰: { yang: true, ju: [1, 7, 4] },
  春分: { yang: true, ju: [3, 9, 6] }, 清明: { yang: true, ju: [4, 1, 7] }, 谷雨: { yang: true, ju: [5, 2, 8] },
  立夏: { yang: true, ju: [4, 1, 7] }, 小满: { yang: true, ju: [5, 2, 8] }, 芒种: { yang: true, ju: [6, 3, 9] },
  夏至: { yang: false, ju: [9, 3, 6] }, 小暑: { yang: false, ju: [8, 2, 5] }, 大暑: { yang: false, ju: [7, 1, 4] },
  立秋: { yang: false, ju: [2, 5, 8] }, 处暑: { yang: false, ju: [1, 4, 7] }, 白露: { yang: false, ju: [9, 3, 6] },
  秋分: { yang: false, ju: [7, 1, 4] }, 寒露: { yang: false, ju: [6, 9, 3] }, 霜降: { yang: false, ju: [5, 8, 2] },
  立冬: { yang: false, ju: [6, 9, 3] }, 小雪: { yang: false, ju: [5, 8, 2] }, 大雪: { yang: false, ju: [4, 7, 1] },
}

const QI_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] // 六仪三奇布局顺序
const STARS = ['', '天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'] // 宫序1-9
const DOORS: Record<number, string> = { 1: '休门', 8: '生门', 3: '伤门', 4: '杜门', 9: '景门', 2: '死门', 7: '惊门', 6: '开门' }
const CIRCLE = [1, 8, 3, 4, 9, 2, 7, 6] // 转盘宫序 (坎艮震巽离坤兑乾)
const GODS = ['值符', '腾蛇', '太阴', '六合', '勾陈(白虎)', '朱雀(玄武)', '九地', '九天']
const GODS_AUDIT = '八神按《奇门遁甲统宗》阳遁值符、腾蛇、太阴、六合、勾陈、朱雀、九地、九天; 阴遁逆布, 勾陈下有白虎、朱雀下有玄武。'
const CHAIBU_BOUNDARY = '拆补边界: 当前按占时所在节气与日干支符头定三元, 未另判超神、接气、正授等交节交符头异说; 临节气或符头交接需按所从师承复核。'
const ZHIRUN_AUDIT = '置闰法审计: 按时家奇门通行置闰说, 以上元符头(甲/己日且符头支属四仲)与节气交接先后判超神、接气、正授; 符头先到为超神, 节气先到为接气, 同日为正授。超神过九日列为置闰候选; 闰奇/夹闰的具体基数与重复哪一节三元传本有异, 本实现仅作候选标注并在补隙处标待考/非文献确证, 不冒称已全量实现师承细法。'
const QIMEN_DAY_BOUNDARY = '日界口径: 子初换日, 23:00 起按次日干支起局。'
const PALACE_DIR: Record<number, string> = { 1: '正北', 2: '西南', 3: '正东', 4: '东南', 5: '中宫', 6: '西北', 7: '正西', 8: '东北', 9: '正南' }
const DOOR_LUCK: Record<string, string> = { 开门: '传统吉门·开创与贵人象', 休门: '传统吉门·休养谋事象', 生门: '传统吉门·生机资源象', 伤门: '传统凶门·争斗损伤象(传统作讨债竞技象)', 杜门: '平门·闭藏躲避象', 景门: '传统吉门·文书虚火象', 死门: '传统凶门·沉滞收束象(传统作吊唁渔猎象)', 惊门: '传统凶门·惊恐口舌象(传统作刑讼象)' }
const STAR_LUCK: Record<string, string> = { 天蓬: '传统凶星·智而险象', 天芮: '传统凶星·病符学问象', 天冲: '传统吉星·冲动武勇象', 天辅: '传统吉星·文昌辅佐象', 天禽: '传统吉星·中正持重象', 天心: '传统吉星·医道谋略象', 天柱: '传统凶星·口舌破坏象', 天任: '传统吉星·任重致远象', 天英: '平星·明丽虚华象' }

// ---- 断局要素 ----
const PALACE_WX: Record<number, string> = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' }
const DOOR_WX: Record<string, string> = { 休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金' }
const KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const TERM_MONTH_BRANCH: Record<string, number> = {
  立春: 2, 雨水: 2, 惊蛰: 3, 春分: 3, 清明: 4, 谷雨: 4,
  立夏: 5, 小满: 5, 芒种: 6, 夏至: 6, 小暑: 7, 大暑: 7,
  立秋: 8, 处暑: 8, 白露: 9, 秋分: 9, 寒露: 10, 霜降: 10,
  立冬: 11, 小雪: 11, 大雪: 0, 冬至: 0, 小寒: 1, 大寒: 1,
}
const STAR_WX: Record<string, string> = { 天蓬: '水', 天芮: '土', 天芮禽: '土', 天冲: '木', 天辅: '木', 天禽: '土', 天心: '金', 天柱: '金', 天任: '土', 天英: '火' }
const SAN_QI = ['乙', '丙', '丁'] as const
const LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸'] as const
const QIMEN_GE_SOURCE_AUDIT = '格局依据: 十干克应、三奇得使、三奇升殿、玉女守门、九遁等按《奇门遁甲统宗》《御定奇门宝鉴》常见表诀整理，并以《烟波钓叟歌》三奇得使诀互校；异本冲突处并列标注，不静默择一。'
const STAR_WANG_AUDIT = '八门旺相休囚死按门五行对月令五行常法；九星旺相休囚废按星为天象之口径: 月令生星为旺、同气为相、星生月令为休、星克月令为囚、月令克星为废。'

type GeKind = '吉格' | '凶格' | '平格' | '待考'
type StarWangState = '旺' | '相' | '休' | '囚' | '废'

function geText(name: string, kind: GeKind, note: string, source = '统宗/宝鉴十干克应表'): string {
  const label = kind === '待考' ? '待考' : `传统${kind}`
  return `${name} [${label}·${note}; ${source}]`
}

function starWxOf(star: string): string {
  if (STAR_WX[star]) return STAR_WX[star]
  if (star.includes('天芮')) return '土'
  if (star.includes('天禽')) return '土'
  return '土'
}

function starWangState(star: string, monthBranch: number): StarWangState {
  const elem = starWxOf(star)
  const ling = BRANCH_WUXING[((monthBranch % 12) + 12) % 12]
  if (SHENG[ling] === elem) return '旺'
  if (elem === ling) return '相'
  if (SHENG[elem] === ling) return '休'
  if (KE[elem] === ling) return '囚'
  return '废'
}

function stemPalaceState(stem: string, palace: number): { state: '比和' | '得生' | '泄气' | '制宫' | '受制'; stemWx: string; palaceWx: string } | null {
  const stemIndex = (STEMS as readonly string[]).indexOf(stem)
  if (stemIndex < 0) return null
  const stemWx = STEM_WUXING[stemIndex]
  const palaceWx = PALACE_WX[palace]
  if (stemWx === palaceWx) return { state: '比和', stemWx, palaceWx }
  if (SHENG[palaceWx] === stemWx) return { state: '得生', stemWx, palaceWx }
  if (SHENG[stemWx] === palaceWx) return { state: '泄气', stemWx, palaceWx }
  if (KE[stemWx] === palaceWx) return { state: '制宫', stemWx, palaceWx }
  return { state: '受制', stemWx, palaceWx }
}/** 十二支所在九宫 (子1 丑寅8 卯3 辰巳4 午9 未申2 酉7 戌亥6) */
const BRANCH_PALACE = [1, 8, 8, 3, 4, 4, 9, 2, 2, 7, 6, 6]
/** 六仪击刑: 天盘仪落宫 (甲子戊刑卯三, 甲戌己刑未二, 甲申庚刑寅八, 甲午辛刑午九, 甲辰壬刑辰四, 甲寅癸刑巳四) */
const JI_XING: Record<string, number> = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 }
/** 十干入墓宫 (十二长生墓库: 阳顺阴逆) — 甲墓未 乙戌 丙戌 丁丑 戊戌 己丑 庚丑 辛辰 壬辰 癸未 */
const MU_GONG: Record<string, number> = { 甲: 2, 乙: 6, 丙: 6, 丁: 8, 戊: 6, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2 }
/** 十干克应经典格局 (天盘干+地盘干): 乙丙丁三奇与戊己庚辛壬癸六仪九干互加。 */
export const SHIGAN_GE: Record<string, string> = {
  乙乙: geText('日奇伏吟', '平格', '日奇重见，宜守分安常'),
  乙丙: geText('奇仪顺遂', '吉格', '日奇逢月奇，谋为有顺助'),
  乙丁: geText('奇仪相佐', '吉格', '日奇逢星奇，文书音信有助'),
  乙戊: geText('利阴害阳', '平格', '阴柔得地，阳事减力，须合门神'),
  乙己: geText('日奇入墓', '凶格', '日奇被土暗昧，事多迟滞'),
  乙庚: geText('日奇被刑', '凶格', '乙庚相合带刑，争讼耗散'),
  乙辛: geText('青龙逃走', '凶格', '日奇受辛金相逼，人财离散象'),
  乙壬: geText('日奇入地', '凶格', '尊卑悖乱，是非暗害象'),
  乙癸: geText('华盖逢星', '平格', '宜遁迹修习，动谋须合门'),
  丙乙: geText('日月并行', '吉格', '日月二奇相会，公私谋为有光明象'),
  丙丙: geText('月奇悖师(悖格)', '凶格', '月奇重见成悖，文书逼迫破耗'),
  丙丁: geText('月照星门', '吉格', '月奇逢星奇，贵显文书可参'),
  丙戊: geText('飞鸟跌穴', '吉格', '月奇归甲子戊，机遇可成'),
  丙己: geText('大悖入刑(悖格)', '凶格', '悖格入刑，文书囚系象'),
  丙庚: geText('荧入太白', '凶格', '火入金乡，门户耗损、攻守相伤象'),
  丙辛: geText('月奇合辛', '平格', '丙辛相合，谋事有合亦防因财生讼'),
  丙壬: geText('火入天罗', '凶格', '火奇入水罗，客不利而多是非'),
  丙癸: geText('华盖悖师(悖格)', '凶格', '月奇受癸，阴私阻文书'),
  丁乙: geText('玉女奇生', '吉格', '星奇生日奇，婚姻文书喜庆可参'),
  丁丙: geText('星随月转', '吉格', '星奇随月奇，贵人进阶、常人防乐极'),
  丁丁: geText('星奇伏吟', '平格', '星奇重见，文书音信近而宜静'),
  丁戊: geText('青龙转光', '吉格', '星奇承甲子戊，求名谒贵有光彩象'),
  丁己: geText('火入勾陈', '凶格', '星奇入己土，奸私仇怨因女事起'),
  丁庚: geText('星奇受阻', '凶格', '星奇遇庚，文书道路阻隔'),
  丁辛: geText('朱雀入狱', '凶格', '朱雀受辛，文书口舌入狱象'),
  丁壬: geText('五神互合', '吉格', '丁壬相合，贵人恩诏、讼狱可平'),
  丁癸: geText('朱雀投江', '凶格', '星奇入癸水，文书音信沉溺'),
  戊乙: geText('青龙合灵', '吉格', '甲子戊逢日奇，门吉则尤顺'),
  戊丙: geText('青龙返首', '吉格', '甲子戊逢月奇，谋事顺象'),
  戊丁: geText('青龙耀明', '吉格', '甲子戊逢星奇，求名文书有明象'),
  戊戊: geText('伏吟', '平格', '甲子戊重见，宜静守复核'),
  戊己: geText('贵人入狱', '凶格', '甲子戊入己土，贵气受困'),
  戊庚: geText('值符飞宫', '凶格', '甲子戊逢庚，吉事减力凶事加重'),
  戊辛: geText('青龙折足', '凶格', '青龙受辛，行动受伤折'),
  戊壬: geText('青龙入天牢', '凶格', '青龙入壬罗，阴阳谋事皆受系'),
  戊癸: geText('青龙华盖', '平格', '青龙逢癸，吉门招福、凶门多乖'),
  己乙: geText('墓神不明', '平格', '己土地户逢日奇，幽隐未明'),
  己丙: geText('火悖地户', '凶格', '丙火入地户，冤抑污滞象'),
  己丁: geText('朱雀入墓', '凶格', '丁奇入己墓，文书词讼先曲后直'),
  己戊: geText('犬遇青龙', '吉格', '己土遇甲子戊，门吉谋望可遂'),
  己己: geText('地户逢鬼', '凶格', '己土重见，病讼不利'),
  己庚: geText('刑格返名', '待考', '己庚异本多歧，词讼道路先动不利', '统宗/宝鉴十干克应异本'),
  己辛: geText('游魂入墓', '凶格', '辛金入己墓，阴邪暗滞象'),
  己壬: geText('地网高张', '凶格', '壬水入地网，奸私伤害象'),
  己癸: geText('地刑玄武', '凶格', '癸水入地刑，病讼囚系象'),
  庚乙: geText('太白逢星', '凶格', '庚金迫日奇，退吉进凶'),
  庚丙: geText('太白入荧', '凶格', '庚金入丙火，贼方来犯守势象'),
  庚丁: geText('亭亭之格', '凶格', '庚金遇丁，私昵官司象'),
  庚戊: geText('天乙伏宫', '凶格', '庚压甲子戊，值符受伏'),
  庚己: geText('刑格', '凶格', '庚加己入刑，刑讼受制象'),
  庚庚: geText('太白同宫', '凶格', '庚金重见，官非灾扰象'),
  庚辛: geText('白虎干格', '凶格', '庚辛并金，远行折伤象'),
  庚壬: geText('小格', '凶格', '庚壬相加，远行迷失、音信难通'),
  庚癸: geText('大格', '凶格', '庚癸相加，行人不至、官事纠缠象'),
  辛乙: geText('白虎猖狂', '凶格', '辛金克乙奇，远行动荡象'),
  辛丙: geText('干合悖师', '凶格', '丙辛合而成悖，因财文书致讼'),
  辛丁: geText('狱神得奇', '吉格', '辛逢丁奇，囚人逢赦、经商有利象'),
  辛戊: geText('困龙被伤', '凶格', '辛金伤甲子戊，屈抑守分'),
  辛己: geText('入狱自刑', '凶格', '辛己相加，自刑难伸'),
  辛庚: geText('白虎出力', '凶格', '辛庚并金，主客相残，逊让可安'),
  辛辛: geText('伏吟天庭', '平格', '辛金重见，公废私就，讼狱自罹'),
  辛壬: geText('凶蛇入狱', '凶格', '辛壬相缠，争讼不息'),
  辛癸: geText('天牢华盖', '凶格', '辛癸相加，误入天网、动止乖张'),
  壬乙: geText('小蛇得势', '吉格', '壬水逢乙，柔顺通达象'),
  壬丙: geText('水蛇入火', '凶格', '壬丙相冲，官灾刑禁离乱'),
  壬丁: geText('干合蛇刑', '平格', '丁壬合带刑，文书牵连，男女分看'),
  壬戊: geText('小蛇化龙', '吉格', '壬水逢甲子戊，男子发达、孕育可参'),
  壬己: geText('反吟蛇刑', '凶格', '壬己相加，官司败诉、大祸象'),
  壬庚: geText('太白擒蛇', '平格', '庚制壬蛇，刑狱可辨邪正'),
  壬辛: geText('腾蛇相缠', '凶格', '壬辛相缠，谋望防欺瞒'),
  壬壬: geText('蛇入地罗', '凶格', '壬水重见，外缠内索'),
  壬癸: geText('壬癸阴私格', '凶格', '壬癸并水，家内阴私丑声象'),
  癸乙: geText('华盖逢星', '吉格', '癸逢乙奇，贵人禄位、常人平安'),
  癸丙: geText('华盖悖师', '凶格', '癸丙成悖，贵贱皆不利'),
  癸丁: geText('腾蛇夭矫', '凶格', '癸水克丁奇，文书刑讼惊恐象'),
  癸戊: geText('天乙会合', '吉格', '癸戊相合，吉门财喜，凶门反凶'),
  癸己: geText('华盖地户', '平格', '癸入己土，音信阻隔，宜避灾藏形'),
  癸庚: geText('太白入网', '凶格', '癸网罩庚，争讼自罹罪责'),
  癸辛: geText('网盖天牢', '凶格', '癸辛相加，病讼重困'),
  癸壬: geText('复见腾蛇', '凶格', '癸壬并水，婚嫁后嗣须慎辨'),
  癸癸: geText('天网四张', '凶格', '癸水重见，行人失伴、病讼皆伤'),
}
const SAN_QI_DE_SHI: Record<string, string> = {
  乙己: '三奇得使(乙奇逢犬)', 乙辛: '三奇得使(乙奇逢马)',
  丙戊: '三奇得使(丙奇逢鼠)', 丙庚: '三奇得使(丙奇逢猴)',
  丁壬: '三奇得使(丁奇骑龙)', 丁癸: '三奇得使(丁奇骑虎)',
}
const SAN_QI_SHENG_DIAN: Record<string, { palace: number; label: string }> = {
  乙: { palace: 3, label: '乙临震三·日出扶桑' },
  丙: { palace: 9, label: '丙临离九·月照端门' },
  丁: { palace: 7, label: '丁临兑七·星见西方' },
}
const DUN_GE_RULES: { name: string; gan: string; door: string; god?: string; star?: string; palace?: number; kind: GeKind; note: string }[] = [
  { name: '天遁', gan: '丙', door: '生门', god: '值符', kind: '吉格', note: '丙奇、生门、值符同宫' },
  { name: '地遁', gan: '乙', door: '开门', god: '九地', kind: '吉格', note: '乙奇、开门、九地同宫' },
  { name: '人遁', gan: '丁', door: '休门', god: '太阴', kind: '吉格', note: '丁奇、休门、太阴同宫' },
  { name: '风遁', gan: '乙', door: '开门', star: '天辅', kind: '吉格', note: '乙奇、开门、天辅同宫' },
  { name: '云遁', gan: '乙', door: '开门', god: '六合', kind: '吉格', note: '乙奇、开门、六合同宫' },
  { name: '龙遁', gan: '乙', door: '休门', palace: 1, kind: '待考', note: '常见表作乙奇、休门临坎，异本需按师承复核' },
  { name: '虎遁', gan: '乙', door: '生门', palace: 8, kind: '待考', note: '常见表作乙奇、生门临艮，异本需按师承复核' },
  { name: '神遁', gan: '丙', door: '生门', god: '九天', kind: '吉格', note: '丙奇、生门、九天同宫' },
  { name: '鬼遁', gan: '丁', door: '杜门', god: '九地', kind: '凶格', note: '丁奇、杜门、九地同宫，宜隐伏不宜张扬' },
]
const SAN_QI_RU_MU: Record<string, { palace: number; label: string }> = {
  乙: { palace: 6, label: '乙奇临乾六' },
  丙: { palace: 6, label: '丙奇临乾六' },
  丁: { palace: 8, label: '丁奇临艮八' },
}

const QIMEN_YUAN_NAME = ['上元', '中元', '下元'] as const
type QimenYuan = 0 | 1 | 2
type QimenBranchGroup = '仲' | '孟' | '季'
type QimenZhiRunRelation = '超神' | '接气' | '正授'

/** 拆补法三元审计: 由日干支回推本候符头(甲/己), 再以符头地支仲/孟/季定上/中/下元 */
export function qimenSanYuanAudit(dayGz: number): {
  fuTou: number
  fuTouName: string
  fuTouBranch: string
  yuan: QimenYuan
  yuanName: typeof QIMEN_YUAN_NAME[QimenYuan]
  branchGroup: QimenBranchGroup
} {
  const normalizedDayGz = ((Math.trunc(dayGz) % 60) + 60) % 60
  const fuTou = (normalizedDayGz - (normalizedDayGz % 10 % 5) + 60) % 60
  const fuTouBranchIndex = fuTou % 12
  let yuan: QimenYuan
  let branchGroup: QimenBranchGroup

  if ([0, 3, 6, 9].includes(fuTouBranchIndex)) {
    yuan = 0
    branchGroup = '仲'
  } else if ([2, 5, 8, 11].includes(fuTouBranchIndex)) {
    yuan = 1
    branchGroup = '孟'
  } else {
    yuan = 2
    branchGroup = '季'
  }

  return {
    fuTou,
    fuTouName: gzName(fuTou),
    fuTouBranch: BRANCHES[fuTouBranchIndex],
    yuan,
    yuanName: QIMEN_YUAN_NAME[yuan],
    branchGroup,
  }
}

/** 拆补法三元: 由日干支取符头(甲/己), 四仲日上元, 四孟日中元, 四季日下元 */
export function sanYuanOf(dayGz: number): number {
  return qimenSanYuanAudit(dayGz).yuan
}

const localJdnAtTz = (jdUT: number, tz: number) => Math.floor(jdUT + tz / 24 + 0.5)

function isUpperFuTouJdn(jdn: number): boolean {
  return [0, 15, 30, 45].includes(dayGanzhi(jdn))
}

function upperFuTouBeforeOrOn(jdn: number): number {
  let cur = jdn
  while (!isUpperFuTouJdn(cur)) cur--
  return cur
}

function upperFuTouAfterOrOn(jdn: number): number {
  let cur = jdn
  while (!isUpperFuTouJdn(cur)) cur++
  return cur
}

function ymdOfJdn(jdn: number): string {
  const u = utFromJD(jdn - 0.5)
  return `${u.y}-${pad2(u.m)}-${pad2(u.d)}`
}

interface QimenZhiRunTermAnchor {
  termName: string
  termJdUT: number
  termJdn: number
  termDay: string
  upperStartJdn: number
  upperStartDay: string
  fuTouName: string
  relation: QimenZhiRunRelation
  offsetDays: number
  leapCandidate: boolean
}

interface QimenZhiRunAudit {
  termName: string
  yuan: QimenYuan
  yuanName: typeof QIMEN_YUAN_NAME[QimenYuan]
  relation: QimenZhiRunRelation
  termDay: string
  upperStartDay: string
  fuTouName: string
  offsetDays: number
  leapCandidate: boolean
  isIntercalary: boolean
  intercalaryNote: string
  sourceTermName: string
  actualSolarTermName: string
  actualSolarTermDay: string
  note: string
}

function zhiRunAnchorOfTerm(t: { name: string; jdUT: number }, tz: number): QimenZhiRunTermAnchor {
  const termJdn = localJdnAtTz(t.jdUT, tz)
  const prevUpper = upperFuTouBeforeOrOn(termJdn)
  const nextUpper = upperFuTouAfterOrOn(termJdn)
  const offsetDays = termJdn - prevUpper
  const relation: QimenZhiRunRelation = offsetDays === 0 ? '正授' : offsetDays <= 9 ? '超神' : '接气'
  const upperStartJdn = relation === '接气' ? nextUpper : prevUpper
  const fuTouGz = dayGanzhi(upperStartJdn)
  return {
    termName: t.name,
    termJdUT: t.jdUT,
    termJdn,
    termDay: ymdOfJdn(termJdn),
    upperStartJdn,
    upperStartDay: ymdOfJdn(upperStartJdn),
    fuTouName: gzName(fuTouGz),
    relation,
    offsetDays,
    leapCandidate: offsetDays > 9,
  }
}

export function qimenZhiRunAudit(jdUT: number, tz = 8): QimenZhiRunAudit {
  const { y } = utFromJD(jdUT)
  const anchors = [...solarTermsOfYear(y - 1), ...solarTermsOfYear(y), ...solarTermsOfYear(y + 1)]
    .sort((a, b) => a.jdUT - b.jdUT)
    .map(t => zhiRunAnchorOfTerm(t, tz))
  const localJdn = localJdnAtTz(jdUT, tz)
  let actual = anchors[0]
  for (const a of anchors) if (a.termJdUT <= jdUT) actual = a

  type Period = {
    startJdn: number
    endJdn: number
    yuan: QimenYuan
    anchor: QimenZhiRunTermAnchor
    isIntercalary: boolean
    intercalaryNote: string
  }
  const periods: Period[] = []
  for (const anchor of anchors) {
    for (let yuan = 0; yuan < 3; yuan++) {
      const startJdn = anchor.upperStartJdn + yuan * 5
      periods.push({
        startJdn,
        endJdn: startJdn + 5,
        yuan: yuan as QimenYuan,
        anchor,
        isIntercalary: false,
        intercalaryNote: '',
      })
    }
  }
  periods.sort((a, b) => a.startJdn - b.startJdn)
  const expanded: Period[] = []
  for (const period of periods) {
    const prev = expanded[expanded.length - 1]
    if (prev && period.startJdn > prev.endJdn) {
      let startJdn = prev.endJdn
      let yuan = 0
      while (startJdn < period.startJdn) {
        const endJdn = Math.min(startJdn + 5, period.startJdn)
        expanded.push({
          startJdn,
          endJdn,
          yuan: yuan as QimenYuan,
          anchor: prev.anchor,
          isIntercalary: true,
          intercalaryNote: `置闰补隙候选: ${prev.anchor.termName}三元后至${period.anchor.termName}上元符头前存在空隙; 暂按前一节三元循环补足, 闰奇/夹闰基数待考/非文献确证。`,
        })
        startJdn = endJdn
        yuan = ((yuan + 1) % 3) as QimenYuan
      }
    }
    expanded.push(period)
  }

  const matched = expanded
    .filter(p => p.startJdn <= localJdn && localJdn < p.endJdn)
    .sort((a, b) => b.startJdn - a.startJdn)[0]
  const period = matched ?? expanded.filter(p => p.startJdn <= localJdn).sort((a, b) => b.startJdn - a.startJdn)[0]
  const anchor = period.anchor
  const intercalaryNote = period.intercalaryNote || (anchor.leapCandidate ? '超神已过九日, 本节按接气取下一上元符头; 是否另作闰奇/夹闰须按师承复核。' : '')

  return {
    termName: anchor.termName,
    yuan: period.yuan,
    yuanName: QIMEN_YUAN_NAME[period.yuan],
    relation: anchor.relation,
    termDay: anchor.termDay,
    upperStartDay: anchor.upperStartDay,
    fuTouName: anchor.fuTouName,
    offsetDays: anchor.offsetDays,
    leapCandidate: anchor.leapCandidate || period.isIntercalary,
    isIntercalary: period.isIntercalary,
    intercalaryNote,
    sourceTermName: anchor.termName,
    actualSolarTermName: actual.termName,
    actualSolarTermDay: actual.termDay,
    note: ZHIRUN_AUDIT,
  }
}

const F_DIVINATION_DATE: FieldSpec = { key: 'divinationDate', label: '占卜日期', type: 'date', help: '不填则使用当前日期; 指定占时时需与时间、数字 UTC 偏移同时填写' }
const F_DIVINATION_TIME: FieldSpec = { key: 'divinationTime', label: '占卜时间', type: 'time', help: '不填则使用当前时间; 指定占时时需与日期、数字 UTC 偏移同时填写' }
const F_DIVINATION_TZ: FieldSpec = {
  key: 'divinationTz', label: '占卜时区', type: 'select', default: 'local',
  options: [
    { value: 'local', label: '本机当前时区(仅当前占时)' },
    { value: '8', label: 'UTC+8 中国/东南亚' },
    { value: '9', label: 'UTC+9 日韩' },
    { value: '7', label: 'UTC+7 泰越印尼西部' },
    { value: '5.5', label: 'UTC+5.5 印度' },
    { value: '0', label: 'UTC+0 英国(冬令)' },
    { value: '1', label: 'UTC+1 欧洲中部(冬令)' },
    { value: '-5', label: 'UTC-5 美东(冬令)' },
    { value: '-8', label: 'UTC-8 美西(冬令)' },
  ],
  help: '指定历史课例/指定占时时必须选择数字 UTC 偏移; 当前占时可用本机时区; 夏令时请自行选择实际 UTC 偏移',
}
const F_QIMEN_JU_METHOD: FieldSpec = {
  key: 'qimenJuMethod',
  label: '起局法',
  type: 'select',
  default: 'chaibu',
  options: [
    { value: 'chaibu', label: '拆补法（默认）' },
    { value: 'zhirun', label: '置闰法（超神接气）' },
  ],
  help: '默认拆补法; 置闰法按符头与节气先后判超神/接气/正授，超神过九日仅作置闰候选并标待考',
}
const F_QIMEN_PAN_METHOD: FieldSpec = {
  key: 'qimenPanMethod',
  label: '盘法',
  type: 'select',
  default: 'zhuanpan',
  options: [
    { value: 'zhuanpan', label: '转盘法（当前实际算法）' },
    { value: 'feipan', label: '飞盘法（未实现，仅审计提示）' },
  ],
  help: '选择飞盘法时仅记录审计提示，当前仍按转盘法排盘',
}

type QimenJuMethod = 'chaibu' | 'zhirun'
type QimenPanMethod = 'zhuanpan' | 'feipan'

function parseQimenSelect<T extends string>(raw: unknown, allowed: readonly T[], defaultValue: T, label: string): T {
  if (raw == null || raw === '') return defaultValue
  if (typeof raw !== 'string') throw new Error(`${label}需从表单选项中选择`)
  const value = raw.trim()
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${label}需从表单选项中选择`)
}

interface DivinationMoment {
  y: number
  m: number
  d: number
  hh: number
  mi: number
  tz: number
  jdUT: number
  label: string
  source: string
}

const pad2 = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0')
const formatTz = (tz: number) => {
  const total = Math.round(Math.abs(tz) * 60)
  const sign = tz >= 0 ? '+' : '-'
  return `UTC${sign}${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}
function partsAtTz(now: Date, tz: number) {
  const shifted = new Date(now.getTime() + tz * 3600000)
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    hh: shifted.getUTCHours(),
    mi: shifted.getUTCMinutes(),
  }
}

function parseDivinationMoment(v: Record<string, string>): DivinationMoment {
  const now = new Date()
  const dateText = (v.divinationDate || v.date || '').trim()
  const timeText = (v.divinationTime || v.time || '').trim()
  const tzText = (v.divinationTz ?? v.tz)?.trim()
  if ((dateText !== '') !== (timeText !== '')) throw new Error('奇门指定占时需同时填写占卜日期和占卜时间')
  const hasSpecifiedMoment = dateText !== '' && timeText !== ''
  if (hasSpecifiedMoment && (!tzText || tzText === 'local')) throw new Error('奇门指定占时需明确选择数字 UTC 偏移, 不能使用本机时区')
  const localTz = -now.getTimezoneOffset() / 60
  let tz = localTz
  if (tzText && tzText !== 'local') {
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(tzText)) throw new Error('奇门占卜时区需为数字, 如 8、5.5、-5')
    tz = Number(tzText)
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) throw new Error('奇门占卜时区需在 UTC-12 到 UTC+14 之间')
  }
  let { y, m, d, hh, mi } = partsAtTz(now, tz)
  if (dateText) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
    if (!dateMatch) throw new Error('奇门占卜日期需为 YYYY-MM-DD 格式')
    y = Number(dateMatch[1])
    m = Number(dateMatch[2])
    d = Number(dateMatch[3])
    const dt = new Date(Date.UTC(y, m - 1, d))
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) throw new Error('奇门占卜日期需为有效公历日期')
  }
  if (timeText) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeText)
    if (!timeMatch) throw new Error('奇门占卜时间需为 HH:mm 格式')
    hh = Number(timeMatch[1])
    mi = Number(timeMatch[2])
    if (hh < 0 || hh > 23 || mi < 0 || mi > 59) throw new Error('奇门占卜时间需为 00:00 到 23:59')
  }
  const jdUT = jdFromUT(y, m, d, hh + mi / 60 - tz)
  const source = dateText && timeText ? '指定占时' : '当前占时'
  return {
    y, m, d, hh, mi, tz, jdUT, source,
    label: `${y}-${pad2(m)}-${pad2(d)} ${pad2(hh)}:${pad2(mi)} ${formatTz(tz)}`,
  }
}

function qimenMethodAudit(v: Record<string, string>) {
  const juMethod: QimenJuMethod = parseQimenSelect((v as Record<string, unknown>).qimenJuMethod, ['chaibu', 'zhirun'] as const, 'chaibu', '奇门起局法')
  const panMethod: QimenPanMethod = parseQimenSelect((v as Record<string, unknown>).qimenPanMethod, ['zhuanpan', 'feipan'] as const, 'zhuanpan', '奇门盘法')
  const requestedJu = juMethod === 'zhirun' ? '置闰法' : '拆补法'
  const requestedPan = panMethod === 'feipan' ? '飞盘法' : '转盘法'
  const unsupported = [
    requestedPan === '飞盘法' ? '飞盘法' : '',
  ].filter(Boolean)
  const actual = `${requestedJu} + 转盘法`
  const status = unsupported.length
    ? `未实现提示: 已选择${unsupported.join('、')}，当前不能按该法排盘；本次仍按${actual}生成核心盘。`
    : `实际算法: ${actual}；与所选法一致。`
  return {
    juMethod,
    panMethod,
    requestedJu,
    requestedPan,
    actual,
    unsupported,
    status,
    aiLine: `流派/模式审计: 所选起局法=${requestedJu}，所选盘法=${requestedPan}；实际计算=${actual}。${status}`,
  }
}

export const qimenModule: ModuleDef = {
  id: 'qimen',
  category: 'bu',
  name: '奇门遁甲',
  subtitle: '中国 · 帝王之学',
  tagline: '四盘布局呈现方位与时机',
  glyph: '🌀',
  ritual: 'luopan',
  inputs: [F_QUESTION, F_DIVINATION_DATE, F_DIVINATION_TIME, F_DIVINATION_TZ, F_QIMEN_JU_METHOD, F_QIMEN_PAN_METHOD],
  compute(v) {
    const divination = parseDivinationMoment(v)
    const methodAudit = qimenMethodAudit(v)
    const { y, m: mo, d, hh, mi, tz, jdUT } = divination

    // 日/时干支
    let cy = y, cm = mo, cd = d
    if (hh >= 23) { const u = utFromJD(jdUT + tz / 24 + 1 / 24) /* 仅取次日日期 */; cy = u.y; cm = u.m; cd = u.d }
    const dayGz = dayGanzhi(jdnFromYMD(cy, cm, cd))
    const hourBranch = Math.floor(((hh + 1) % 24) / 2) % 12
    const hourStem = ((dayGz % 10 % 5) * 2 + hourBranch) % 10
    const hourGz = gzIndex(hourStem, hourBranch)

    // 节气 + 三元: 拆补以当下节气与日符头定元; 置闰以节气与上元符头先后定超神/接气/正授。
    const { y: yy } = utFromJD(jdUT)
    const terms = [...solarTermsOfYear(yy - 1), ...solarTermsOfYear(yy), ...solarTermsOfYear(yy + 1)].sort((a, b) => a.jdUT - b.jdUT)
    let actualTerm = terms[0]
    for (const t of terms) if (t.jdUT <= jdUT) actualTerm = t
    // 符头(甲/己日)地支定三元: 四仲(子午卯酉)上元, 四孟(寅巳申亥)中元, 四季(辰戌丑未)下元
    const sanYuanAudit = qimenSanYuanAudit(dayGz)
    const zhiRunAudit = qimenZhiRunAudit(jdUT, tz)
    const useZhiRun = methodAudit.juMethod === 'zhirun'
    const yuan = useZhiRun ? zhiRunAudit.yuan : sanYuanAudit.yuan
    const yuanName = QIMEN_YUAN_NAME[yuan]
    const termName = useZhiRun ? zhiRunAudit.termName : actualTerm.name
    const term = { ...actualTerm, name: termName }
    const conf = JU_TABLE[term.name]
    const monthBranch = TERM_MONTH_BRANCH[term.name] ?? 0
    const monthWx = BRANCH_WUXING[monthBranch]
    const ju = conf.ju[yuan]
    const yang = conf.yang
    const dunJuName = `${yang ? '阳' : '阴'}遁${ju}局`
    const juAuditTitle = useZhiRun ? '置闰审计' : '拆补审计'
    const juAuditBoundary = useZhiRun ? ZHIRUN_AUDIT : CHAIBU_BOUNDARY
    const juAuditSummary = useZhiRun
      ? `置闰审计: 实际节气=${zhiRunAudit.actualSolarTermName}(${zhiRunAudit.actualSolarTermDay}); 用局节气=${zhiRunAudit.termName}; 节气日=${zhiRunAudit.termDay}; 上元符头=${zhiRunAudit.fuTouName}(${zhiRunAudit.upperStartDay}); 交接=${zhiRunAudit.relation}; 偏差=${zhiRunAudit.offsetDays}日; 三元=${zhiRunAudit.yuanName}; 阴阳遁=${yang ? '阳遁' : '阴遁'}; 局数=${ju}局; 置闰候选=${zhiRunAudit.leapCandidate ? '是' : '否'}${zhiRunAudit.intercalaryNote ? '; ' + zhiRunAudit.intercalaryNote : ''}; ${ZHIRUN_AUDIT}`
      : `拆补审计: 节气=${term.name}; 日干支=${gzName(dayGz)}; 符头干支=${sanYuanAudit.fuTouName}; 符头地支=${sanYuanAudit.fuTouBranch}; 符头地支类别=${sanYuanAudit.branchGroup}; 三元=${sanYuanAudit.yuanName}; 阴阳遁=${yang ? '阳遁' : '阴遁'}; 局数=${ju}局; ${CHAIBU_BOUNDARY}; ${QIMEN_DAY_BOUNDARY}`
    // 地盘布奇仪
    const dipan: Record<number, string> = {}
    for (let i = 0; i < 9; i++) {
      const palace = yang ? ((ju - 1 + i) % 9) + 1 : ((ju - 1 - i) % 9 + 9) % 9 + 1
      dipan[palace] = QI_ORDER[i]
    }

    // 旬首遁仪
    const YI_BY_XUN = ['戊', '己', '庚', '辛', '壬', '癸']
    const hourXunIdx = Math.floor(hourGz / 10)
    const dayXunIdx = Math.floor(dayGz / 10)
    const dunYi = YI_BY_XUN[hourXunIdx]
    const dayDunYi = YI_BY_XUN[dayXunIdx]
    const xunName = gzName(hourGz - (hourGz % 10))
    const dayXunName = gzName(dayGz - (dayGz % 10))
    const p0 = Number(Object.keys(dipan).find(p => dipan[Number(p)] === dunYi)) // 值符原始宫

    // 值符星/值使门 (中五宫: 星用天禽寄二, 门寄死门)
    const zhiFuStar = STARS[p0]
    const zhiFuStarDisplay = p0 === 5 ? '天禽寄坤随芮' : zhiFuStar
    const zhiFuStarLuck = p0 === 5 ? STAR_LUCK['天禽'] : STAR_LUCK[zhiFuStar] ?? ''
    const zhiFuAudit = p0 === 5 ? '旬首在中五: 天禽寄坤二宫, 随天芮同转, 九宫星名以天芮禽呈现; 当前采用天禽阳阴俱寄坤二口径' : '旬首不在中五: 值符星按原宫九星转布'
    const zhiShiDoor = p0 === 5 ? '死门' : DOORS[p0]
    const zhiShiOrigin = p0 === 5 ? 2 : p0

    // 时干落宫 (甲时用遁仪)
    const hourQi = hourStem === 0 ? dunYi : STEMS[hourStem]
    let hourPalace = Number(Object.keys(dipan).find(p => dipan[Number(p)] === hourQi))
    if (!hourPalace || hourPalace === 5) hourPalace = hourPalace === 5 ? 2 : p0 // 干在中宫寄坤二

    // 天盘: 值符星转至时干宫, 九星(8星圈)随转; 禽随芮
    const circleOf = (p: number) => CIRCLE.indexOf(p === 5 ? 2 : p)
    const shift = ((circleOf(hourPalace) - circleOf(p0)) % 8 + 8) % 8
    const tianStars: Record<number, string[]> = {}
    const tianGan: Record<number, string[]> = {}
    for (let i = 0; i < 8; i++) tianStars[CIRCLE[i]] = []
    for (let i = 0; i < 8; i++) tianGan[CIRCLE[i]] = []
    for (let i = 0; i < 8; i++) {
      const orig = CIRCLE[i]
      const dest = CIRCLE[(i + shift) % 8]
      const starName = orig === 2 ? '天芮禽' : STARS[orig]
      tianStars[dest].push(starName)
      tianGan[dest].push(dipan[orig])
      if (orig === 2) tianGan[dest].push(dipan[5]) // 禽携中五之干
    }

    // 八门: 值使随时支飞宫 (阳顺阴逆按宫序数)
    const elapsed = hourGz - (hourGz - (hourGz % 10)) // 0-9
    const destNum = yang ? ((zhiShiOrigin - 1 + elapsed) % 9) + 1 : ((zhiShiOrigin - 1 - elapsed) % 9 + 9) % 9 + 1
    const doorDest = destNum === 5 ? 2 : destNum
    const doors: Record<number, string> = {}
    const doorShift = ((circleOf(doorDest) - circleOf(zhiShiOrigin)) % 8 + 8) % 8
    for (let i = 0; i < 8; i++) {
      const orig = CIRCLE[i]
      const dest = CIRCLE[(i + doorShift) % 8]
      doors[dest] = DOORS[orig]
    }

    // 八神: 自值符(时干宫)起, 阳顺阴逆
    const gods: Record<number, string> = {}
    const startIdx = circleOf(hourPalace)
    for (let i = 0; i < 8; i++) {
      const pos = yang ? CIRCLE[(startIdx + i) % 8] : CIRCLE[(startIdx - i + 8) % 8]
      gods[pos] = GODS[i]
    }

    // ---- 断局要素 ----
    // 局伏吟/反吟 (天盘星与地盘星同宫/对宫)
    const juXing = shift === 0 ? '伏吟局' : shift === 4 ? '反吟局' : ''
    const menXing = doorShift === 0 ? '门伏吟' : doorShift === 4 ? '门反吟' : ''
    // 转盘法下值符(天盘星)随时干飞、值使(门)随时支飞, 二者分立: 天盘伏/反吟(juXing)与门伏/反吟(menXing)未必同现,
    // 仅二者俱伏或俱反才是严格全局伏/反吟。juXing 判天盘, 门是否同步以 menXing 为准, 此处标注消歧。
    const starMenSync = !!juXing && !!menXing && juXing[0] === menXing[1]
    const juXingNote = juXing
      ? `值符星${juXing.startsWith('伏') ? '伏吟, 主静守缓图' : '反吟, 主反复颠倒'}; 值使门${starMenSync ? '同' + juXing[0] + '吟, 星门俱' + juXing[0] : '不同步, 详见值使行'}`
      : ''
    // 时旬空亡与驿马落宫为主, 日旬空亡/日马仅列为辅助审计。
    const kong = xunKong(hourGz)
    const kongPalaces = kong.map(k => BRANCH_PALACE[BRANCHES.indexOf(k as typeof BRANCHES[number])])
    const dayKong = xunKong(dayGz)
    const dayKongPalaces = dayKong.map(k => BRANCH_PALACE[BRANCHES.indexOf(k as typeof BRANCHES[number])])
    const maBranch = yimaOf(hourBranch)
    const maPalace = BRANCH_PALACE[maBranch]
    const dayMaBranch = yimaOf(dayGz % 12)
    const dayMaPalace = BRANCH_PALACE[dayMaBranch]
    // 日干/时干落宫 (天盘) — 甲以旬遁仪代之
    const dayStemName = STEMS[dayGz % 10] === '甲' ? dayDunYi : STEMS[dayGz % 10]
    const dayStemAudit = STEMS[dayGz % 10] === '甲' ? `日干甲按日旬${dayXunName}遁${dayDunYi}` : `日干${STEMS[dayGz % 10]}直接取用`
    const hourStemAudit = hourStem === 0 ? `时干甲按时旬${xunName}遁${dunYi}` : `时干${STEMS[hourStem]}直接取用`
    const findTian = (g: string) => [1, 2, 3, 4, 6, 7, 8, 9].find(p => tianGan[p].includes(g))
    const dayPalace = findTian(dayStemName)
    const hourPalaceTian = findTian(hourQi)
    const wuBuYu = hourStem === ((dayGz % 10) + 6) % 10
    const wuBuYuText = wuBuYu ? `五不遇时(${STEMS[hourStem]}克${STEMS[dayGz % 10]})` : ''
    // 逐宫格局: 十干克应 / 击刑 / 入墓 / 门迫门制 / 空亡 / 马星
    const geOf = (p: number): string[] => {
      const out: string[] = []
      const push = (entry: string) => {
        const name = entry.split(' [')[0]
        if (!out.some(g => g.split(' [')[0] === name)) out.push(entry)
      }
      for (const tg of tianGan[p]) {
        const comboKey = tg + dipan[p]
        const combo = SHIGAN_GE[comboKey]
        if (combo) push(combo)
        const deShi = SAN_QI_DE_SHI[comboKey]
        if (deShi) push(geText(deShi, '吉格', '按“乙马逢犬、丙鼠猴、六丁玉女骑龙虎”歌诀；若同宫另见凶名须并参', '《烟波钓叟歌》三奇得使诀'))
        const shengDian = SAN_QI_SHENG_DIAN[tg]
        if (shengDian?.palace === p) push(geText(`三奇升殿(${shengDian.label})`, '吉格', '三奇临本殿，奇气得位', '统宗/宝鉴三奇升殿表'))
        const palaceState = stemPalaceState(tg, p)
        if (palaceState && (SAN_QI as readonly string[]).includes(tg)) {
          if (palaceState.state === '比和' || palaceState.state === '得生') push(geText(`三奇之灵(${tg}${palaceState.state})`, '吉格', `${tg}奇五行${palaceState.stemWx}，落${PALACE_DIR[p]}宫${palaceState.palaceWx}，奇气有根`, '三奇落宫五行生克'))
          else if (palaceState.state === '受制') push(geText(`三奇受制(${tg}受宫克)`, '凶格', `${tg}奇五行${palaceState.stemWx}受${PALACE_DIR[p]}宫${palaceState.palaceWx}所克`, '三奇落宫五行生克'))
        }
        if (palaceState && (LIU_YI as readonly string[]).includes(tg) && palaceState.state === '受制') push(geText(`六仪受制(${tg}受宫克)`, '凶格', `${tg}仪五行${palaceState.stemWx}受${PALACE_DIR[p]}宫${palaceState.palaceWx}所克`, '六仪落宫五行生克'))
        if (tg === '庚' && dipan[p] === dunYi) push(geText('天乙伏宫', '凶格', '庚压本旬遁甲，主受伏受阻', '统宗/宝鉴天乙伏飞宫格'))
        if (tg === dunYi && dipan[p] === '庚') push(geText('天乙飞宫', '凶格', '本旬遁甲加庚，主客相伤', '统宗/宝鉴天乙伏飞宫格'))
        if (tg === '庚' && dipan[p] === dayStemName) push(geText('伏干格', '凶格', '庚加日干，求谋阻滞象', '统宗/宝鉴伏干飞干格'))
        if (tg === dayStemName && dipan[p] === '庚') push(geText('飞干格', '凶格', '日干加庚，同室操戈象', '统宗/宝鉴伏干飞干格'))
        if (JI_XING[tg] === p) push(geText('六仪击刑', '凶格', `${tg}仪刑于此宫`, '六仪击刑表'))
        const sanQiMu = SAN_QI_RU_MU[tg]
        if (sanQiMu?.palace === p) push(geText(`三奇入墓(${sanQiMu.label})`, '凶格', '奇气受困之象', '三奇入墓表'))
        else if (MU_GONG[tg] === p) push(geText(`${tg}入墓`, '凶格', '事物昏晦无力', '十干入墓表'))
      }
      for (const rule of DUN_GE_RULES) {
        if (!tianGan[p].includes(rule.gan)) continue
        if (doors[p] !== rule.door) continue
        if (rule.god && gods[p] !== rule.god) continue
        if (rule.star && !tianStars[p].some(s => s.includes(rule.star ?? ''))) continue
        if (rule.palace && p !== rule.palace) continue
        push(geText(rule.name, rule.kind, rule.note, '统宗/宝鉴遁格表'))
      }
      if (p === doorDest && tianGan[p].includes('丁')) push(geText('玉女守门', '吉格', '丁奇与值使门同宫，传统主阴贵守门，仍须合门星宫', '统宗/宝鉴玉女守门格'))
      if (wuBuYu && p === hourPalaceTian) push(geText(wuBuYuText, '凶格', '时干克日干，多作阻滞象', '五不遇时'))
      const dwx = DOOR_WX[doors[p]]
      if (dwx && KE[dwx] === PALACE_WX[p]) push(`门迫 [${doors[p]}克宫, 吉门失吉凶门更凶]`)
      else if (dwx && KE[PALACE_WX[p]] === dwx) push(`门制 [宫克${doors[p]}, 门力受制]`)
      if (kongPalaces.includes(p)) push('时旬空 [事未实, 待出旬]')
      if (maPalace === p) push('时马 [动象, 主变迁动象]')
      return out
    }
    const geMap: Record<number, string[]> = {}
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) geMap[p] = geOf(p)
    const doorSeason: Record<number, string> = {}
    const starSeason: Record<number, string> = {}
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
      doorSeason[p] = wangShuai(DOOR_WX[doors[p]], monthBranch)
      starSeason[p] = tianStars[p].map(s => `${s}${starWangState(s, monthBranch)}`).join('/')
    }

    // 展示 (洛书: 492/357/816)
    const LAYOUT = [4, 9, 2, 3, 5, 7, 8, 1, 6]
    const cells = LAYOUT.map(p => {
      if (p === 5) return { title: '中五宫', lines: [`地盘 ${dipan[5]}`, '[[禽随芮寄坤二]]'] }
      return {
        title: `${p}宫 ${PALACE_DIR[p]}`,
        lines: [
          `${gods[p]} · ${tianStars[p].join('')}`,
          `${doors[p]} [[${DOOR_LUCK[doors[p]].split('·')[0]}]]`,
          `天 ${tianGan[p].join('')} / 地 ${dipan[p]}`,
          ...(geMap[p].length ? [`[[${geMap[p].map(g => g.split(' [')[0]).join(' · ')}]]`] : []),
        ],
      }
    })

    const auspicious = [1, 2, 3, 4, 6, 7, 8, 9].filter(p => ['开门', '休门', '生门'].includes(doors[p]))
    const allGe = [1, 2, 3, 4, 6, 7, 8, 9].flatMap(p => geMap[p].map(g => `${PALACE_DIR[p]}${p}宫: ${g}`))
    const sections: Section[] = [
      {
        title: `${dunJuName} · ${term.name}${yuanName} (转盘${methodAudit.requestedJu})${juXing ? ' · ' + juXing : ''}`,
        kind: 'grid9',
        data: { cells, note: `占时 ${divination.label}（${divination.source}） · ${gzName(dayGz)}日 ${gzName(hourGz)}时 · ${xunName}旬(遁${dunYi}) · 值符${zhiFuStarDisplay}落${hourPalace}宫 · 值使${zhiShiDoor}落${doorDest}宫 · ${zhiFuAudit} · 时旬空亡${kong.join('')} · 日旬空亡${dayKong.join('')} · 时马${BRANCHES[maBranch]}(${maPalace}宫) · 日马${BRANCHES[dayMaBranch]}(${dayMaPalace}宫)` },
      },
      {
        title: '流派/模式审计',
        kind: 'pairs',
        data: {
          items: [
            { k: '所选起局法', v: methodAudit.requestedJu, hint: methodAudit.requestedJu === '置闰法' ? '当前实际支持; 闰奇/夹闰基数待考处会标注' : '当前实际支持' },
            { k: '所选盘法', v: methodAudit.requestedPan, hint: methodAudit.requestedPan === '飞盘法' ? '未实现提示: 当前不能按飞盘法排盘' : '当前实际支持' },
            { k: '实际计算', v: methodAudit.actual, hint: methodAudit.status },
          ],
        },
      },
      {
        title: juAuditTitle,
        kind: 'pairs',
        data: {
          items: [
            { k: '用局节气', v: term.name, hint: useZhiRun ? `置闰法用局节气; 实际占时节气为${zhiRunAudit.actualSolarTermName}(${zhiRunAudit.actualSolarTermDay})` : `按占时 ${divination.label} 取当前节气` },
            { k: '日干支', v: `${gzName(dayGz)}日`, hint: useZhiRun ? '置闰法以节气与上元符头先后定超神/接气/正授' : '拆补法以日干支回推本候符头' },
            { k: '日界口径', v: '子初换日', hint: '23:00 起按次日干支起局; 子时口径异说需按师承复核' },
            { k: '符头干支', v: useZhiRun ? zhiRunAudit.fuTouName : sanYuanAudit.fuTouName, hint: useZhiRun ? `上元符头日期${zhiRunAudit.upperStartDay}; 节气日${zhiRunAudit.termDay}` : `${gzName(dayGz)}日所在五日候的甲/己符头` },
            { k: '符头/节气交接', v: useZhiRun ? `${zhiRunAudit.relation}（${zhiRunAudit.offsetDays}日）` : `${sanYuanAudit.fuTouBranch}（${sanYuanAudit.branchGroup}）`, hint: useZhiRun ? '符头先到为超神, 节气先到为接气, 同日为正授' : '四仲(子午卯酉)=上元; 四孟(寅巳申亥)=中元; 四季(辰戌丑未)=下元' },
            { k: '三元', v: yuanName, hint: useZhiRun ? `按置闰法周期取${yuanName}` : `由符头${sanYuanAudit.fuTouBranch}支属${sanYuanAudit.branchGroup}定元` },
            { k: '阴阳遁', v: yang ? '阳遁' : '阴遁', hint: `由节气${term.name}所在阴阳遁段确定` },
            { k: '局数', v: `${ju}局`, hint: `${term.name}${yuanName}按二十四节气局数表取${dunJuName}` },
            { k: useZhiRun ? '置闰边界' : '拆补边界', v: useZhiRun ? (zhiRunAudit.leapCandidate ? '置闰候选/待考' : zhiRunAudit.relation) : '未判超神接气正授', hint: useZhiRun ? (zhiRunAudit.intercalaryNote || juAuditBoundary) : CHAIBU_BOUNDARY },
          ],
        },
      },
      {
        title: '用局速断',
        kind: 'pairs',
        data: {
          items: [
            { k: '占时', v: divination.label, hint: `${divination.source}; 节气、日时干支均按此时刻起局` },
            { k: '值符 (贵神方)', v: `${zhiFuStarDisplay} @ ${PALACE_DIR[hourPalace]}`, hint: `${zhiFuStarLuck}${zhiFuStarLuck ? '; ' : ''}${zhiFuAudit}` },
            { k: '值使 (行事门)', v: `${zhiShiDoor} @ ${PALACE_DIR[doorDest]}`, hint: DOOR_LUCK[zhiShiDoor] + (menXing ? ' · ' + menXing : '') },
            { k: '日干落宫 (求测人)', v: dayPalace ? `${dayStemName} @ ${PALACE_DIR[dayPalace]}${dayPalace}宫` : '—', hint: dayPalace ? `${dayStemAudit}; 临${doors[dayPalace]}·${gods[dayPalace]}${geMap[dayPalace].length ? ' · ' + geMap[dayPalace].map(g => g.split(' [')[0]).join('/') : ''}` : dayStemAudit },
            { k: '时干落宫 (所问事)', v: hourPalaceTian ? `${hourQi} @ ${PALACE_DIR[hourPalaceTian]}${hourPalaceTian}宫` : '—', hint: hourPalaceTian ? `${hourStemAudit}; 临${doors[hourPalaceTian]}·${gods[hourPalaceTian]}${geMap[hourPalaceTian].length ? ' · ' + geMap[hourPalaceTian].map(g => g.split(' [')[0]).join('/') : ''}` : hourStemAudit },
            { k: '三吉门方位', v: auspicious.map(p => `${doors[p]}·${PALACE_DIR[p]}`).join(' / ') || '—', hint: '吉门方位只作顺象线索, 需兼看落宫格局' },
          ],
        },
      },
    ]
    if (allGe.length) {
      sections.push({
        title: '格局提要',
        kind: 'pairs',
        data: { items: allGe.slice(0, 10).map(g => { const [w, rest] = g.split(': '); return { k: w, v: rest.split(' [')[0], hint: rest.includes('[') ? rest.split(' [')[1].replace(']', '') : '' } }) },
      })
    }

    const fixedReading = [
      `所问: 「${v.question}」`,
      `占时: ${divination.label}（${divination.source}）。${QIMEN_DAY_BOUNDARY}`,
      `流派/模式审计: 所选起局法为${methodAudit.requestedJu}，所选盘法为${methodAudit.requestedPan}；实际计算为${methodAudit.actual}。${methodAudit.status}`,
      juAuditSummary,
      `此刻起局: **${dunJuName}**, ${term.name}${yuanName}, ${gzName(hourGz)}时, ${xunName}旬遁**${dunYi}**${juXing ? `, **${juXing}**(${juXingNote})` : ''}。`,
      `**值符${zhiFuStarDisplay}**落${hourPalace}宫(${PALACE_DIR[hourPalace]})——${zhiFuStarLuck || '中正之气'}; ${zhiFuAudit}; 贵人气场所在。`,
      `**值使${zhiShiDoor}**落${doorDest}宫(${PALACE_DIR[doorDest]})——${DOOR_LUCK[zhiShiDoor]}${menXing ? ', ' + menXing : ''}; 传统以值使所临之门作事象定位参考。`,
      dayPalace ? `**日干${dayStemName}**(求测人)落${PALACE_DIR[dayPalace]}, **时干${hourQi}**(所问事)落${hourPalaceTian ? PALACE_DIR[hourPalaceTian] : '—'}——${dayStemAudit}; ${hourStemAudit}; 人与事的宫位生克, 是断应之纲。` : '',
      wuBuYu ? `**${wuBuYuText}**: 传统以时干克日干为五不遇, 主谋事多乖; 此处只作阻滞象义提示, 不作行动处方。` : '',
      allGe.length ? `盘中格局: ${allGe.slice(0, 6).map(g => `**${g.split(' [')[0]}**`).join('; ')}。` : '盘面无大格, 以星门神克应细断。',
      `吉门方位: ${auspicious.map(p => `**${PALACE_DIR[p]}**(${doors[p]})`).join('、')}——仅列传统吉门所临方位供盘面复核, 不作为出行、谈判、递交或朝向行动指令。`,
    ].filter(Boolean).join('\n')

    return {
      headline: `${yang ? '阳' : '阴'}遁${ju}局 · 值符${zhiFuStarDisplay} · 值使${zhiShiDoor}${juXing ? ' · ' + juXing : ''}`,
      badge: '🌀',
      sections,
      fixedReading,
      aiContext: [
        `奇门遁甲(时家转盘${methodAudit.requestedJu})占问: ${v.question}`,
        `流派与边界: 时家奇门 · 转盘 · ${methodAudit.requestedJu}; ${useZhiRun ? '非飞盘法' : '非置闰法、非飞盘法'}。${juAuditBoundary} ${QIMEN_DAY_BOUNDARY} ${GODS_AUDIT} 天禽采用阳阴俱寄坤二; 时旬空亡/时马为主, 日旬空亡/日马仅作辅助审计。日干/时干、值符值使、门迫击刑入墓空亡等仅为当前实现层。转盘法下值符(天盘星)随时干、值使(门)随时支分立飞转, 故天盘伏/反吟(局)与值使门伏/反吟未必同现, 仅二者俱伏或俱反方为严格全局伏/反吟。`,
        methodAudit.aiLine,
        `占时: ${divination.label}（${divination.source}）; 起局时区=${formatTz(tz)}; ${QIMEN_DAY_BOUNDARY}`,
        juAuditSummary,
        `${gzName(dayGz)}日${gzName(hourGz)}时, ${term.name}${yuanName}, ${dunJuName}, ${xunName}旬遁${dunYi}${juXing ? ', ' + juXing : ''}${menXing ? ', ' + menXing : ''}`,
        `值符${zhiFuStarDisplay}落${hourPalace}宫(${PALACE_DIR[hourPalace]}), 值使${zhiShiDoor}落${doorDest}宫(${PALACE_DIR[doorDest]}); ${zhiFuAudit}; 时旬空亡${kong.join('')}(落${kongPalaces.join('/')}宫), 日旬空亡${dayKong.join('')}(落${dayKongPalaces.join('/')}宫), 时马${BRANCHES[maBranch]}(${maPalace}宫), 日马${BRANCHES[dayMaBranch]}(${dayMaPalace}宫)`,
        `甲干遁仪审计: ${dayStemAudit}; ${hourStemAudit}; 值符值使仍按时旬${xunName}遁${dunYi}`,
        `日干${dayStemName}落${dayPalace ?? '?'}宫(求测人), 时干${hourQi}落${hourPalaceTian ?? '?'}宫(所问事)`,
        `九宫盘(宫:八神/九星/八门/天盘干/地盘干/格局): ` + [1, 2, 3, 4, 6, 7, 8, 9].map(p => `${p}宫${PALACE_DIR[p]}:${gods[p]}/${tianStars[p].join('')}/${doors[p]}/天${tianGan[p].join('')}/地${dipan[p]}${geMap[p].length ? '/' + geMap[p].map(g => g.split(' [')[0]).join(',') : ''}`).join('; ') + `; 中五地盘${dipan[5]}`,
        `五不遇时: ${wuBuYu ? wuBuYuText : '未见'}; 三奇入墓按乙临乾六、丙临乾六、丁临艮八标注，乙临坤二等异本需按师承复核。`,
        `象义参考: 以日干宫为求测人、时干宫为所问事, 参值符值使; 五不遇、门迫、击刑、入墓、空亡皆为传统减力象, 得奇(乙丙丁)与吉门为顺象线索; 用神宫生克日干宫仅供资料复核, 不作成败或应期定案。`,
      ].join('\n'),
      followups: ['以我问的事, 用神取法有哪些依据?', '拆补三元与符头审计怎么复核?', '吉门方位在本盘如何标注?'],
    }
  },
}
