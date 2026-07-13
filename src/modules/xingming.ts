// 姓名学 — 五格剖象法 (康熙笔画 + 81数理 + 三才)
// 体系说明: 五格剖象法为日本熊崎健翁 1918 年前后定型之近代术, 上世纪经台湾回流中文圈,
// 并非中国古代姓名术 (古法以八字喜用五行配字义/字形为主)。本模块如实标注来源, 不作古法宣称。
// 康熙笔画库为常用字子集, 生僻字请用「笔画修正」手动指定。
import type { ModuleDef, Section } from '../core/types.ts'
import { KANGXI_STROKES, SHULI_81, WUXING_OF_DIGIT } from '../data/names.ts'
import { F_GENDER } from './common.ts'

const DOUBLE_SURNAMES = ['欧阳', '太史', '端木', '上官', '司马', '东方', '独孤', '南宫', '万俟', '闻人', '夏侯', '诸葛', '尉迟', '公羊', '赫连', '澹台', '皇甫', '宗政', '濮阳', '公冶', '太叔', '申屠', '公孙', '慕容', '仲孙', '钟离', '长孙', '宇文', '司徒', '鲜于', '司空', '闾丘', '子车', '亓官', '司寇', '巫马', '公西', '颛孙', '壤驷', '公良', '漆雕', '乐正', '宰父', '谷梁', '拓跋', '夹谷', '轩辕', '令狐', '段干', '百里', '呼延', '东郭', '南门', '羊舌', '微生', '梁丘', '左丘', '东门', '西门', '第五']
const AMBIGUOUS_STROKES: Record<string, string> = {
  云: '云/雲义项不同, 五格需先定繁体笔画',
  丰: '丰/豐义项不同, 五格需先定繁体笔画',
  发: '發/髮义项不同, 五格需先定繁体笔画',
  谷: '谷/穀义项不同, 五格需先定繁体笔画',
  钟: '鍾/鐘义项不同, 五格需先定繁体笔画',
  宁: '寧/甯义项不同, 五格需先定繁体笔画',
  余: '余/餘义项不同, 五格需先定繁体笔画',
  范: '范/範义项不同, 五格需先定繁体笔画',
  朴: '朴/樸义项不同, 五格需先定繁体笔画',
  征: '征/徵义项不同, 五格需先定繁体笔画',
}
const XINGMING_AUDIT = '五格剖象为日本熊崎氏近代姓名判断法, 非中国古代正统命名法; 本盘只按康熙笔画、五格、81数理与三才生克演算。传统取名仍应合看八字喜用、字义、字音、字形、避讳、辈分与出处; 未计算生肖姓名学/生肖字根/部首宜忌, 且生肖姓名学多属近现代民俗支派; 不可仅凭五格定名或改名。'

export function normalizeShuliNumber(n: number) {
  return n <= 81 ? n : ((n - 2) % 80) + 2
}
function shuli(n: number) {
  return SHULI_81[normalizeShuliNumber(n) - 1]
}

const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
function shuliNumText(n: number) {
  const norm = normalizeShuliNumber(n)
  return norm === n ? String(n) : `${n}→${norm}`
}
function shuliNote(n: number) {
  const norm = normalizeShuliNumber(n)
  return norm === n ? '' : `原数${n}按超过81减80归为${norm}`
}
function sancaiRel(fromLabel: string, from: string, toLabel: string, to: string) {
  if (from === to) return { short: `${from}比和`, text: `${fromLabel}${from}与${toLabel}${to}比和 — 同气相扶`, code: '比和', tone: 'good' as const }
  if (GEN[from] === to) return { short: `${from}生${to}`, text: `${fromLabel}${from}生${toLabel}${to} — 顺生而泄`, code: '顺生', tone: 'good' as const }
  if (GEN[to] === from) return { short: `${to}生${from}(逆生)`, text: `${toLabel}${to}生${fromLabel}${from} — 逆生, 气回上位`, code: '逆生', tone: 'accent' as const }
  if (GEN[from] && GEN[GEN[from]] === to) return { short: `${from}克${to}`, text: `${fromLabel}${from}克${toLabel}${to} — 顺克有制`, code: '顺克', tone: 'bad' as const }
  return { short: `${to}克${from}(逆克)`, text: `${toLabel}${to}克${fromLabel}${from} — 逆克有压`, code: '逆克', tone: 'bad' as const }
}

export const xingmingModule: ModuleDef = {
  id: 'xingming',
  category: 'ming',
  name: '姓名学 · 五格',
  subtitle: '日本 · 熊崎氏(1918)近代法',
  tagline: '按康熙笔画计算五格',
  glyph: '✍️',
  ritual: 'luopan',
  inputs: [
    { key: 'cnName', label: '中文姓名', type: 'text', required: true, placeholder: '如: 张伟 / 欧阳修', help: '以康熙字典笔画(繁体)计; 内置常见复姓自动识别, 罕见复姓请用姓氏切分指定' },
    { key: 'surnameMode', label: '姓氏切分', type: 'select', default: 'auto', options: [{ value: 'auto', label: '自动识别' }, { value: 'single', label: '单姓' }, { value: 'double', label: '复姓' }], help: '笔画修正只修笔画, 不改变姓氏切分; 罕见复姓请选复姓' },
    { key: 'strokeFix', label: '笔画修正(可选)', type: 'text', placeholder: '如: 11,11,14 逐字覆盖', help: '若填写, 必须按姓名每字给出正整数康熙笔画' },
    F_GENDER,
  ],
  compute(v) {
    const name = (v.cnName ?? '').replace(/\s/g, '')
    if (name.length < 2 || name.length > 4) throw new Error('请输入 2-4 字中文姓名')
    if (!/^\p{Script=Han}+$/u.test(name)) throw new Error('姓名只能填写汉字; 外文名不能按康熙笔画五格计算')
    const chars = [...name]
    const strokeFixText = (v.strokeFix ?? '').trim()
    const manualParts = strokeFixText ? strokeFixText.split(/[,，\s]+/).filter(Boolean) : []
    if (strokeFixText && manualParts.length !== chars.length) throw new Error(`笔画修正需逐字填写 ${chars.length} 个正整数`)
    if (manualParts.some(p => !/^[1-9]\d*$/.test(p))) throw new Error('笔画修正只能填写正整数康熙笔画')
    const manual = manualParts.map(Number)
    if (manual.some(n => !Number.isSafeInteger(n) || n < 1 || n > 64)) throw new Error('笔画修正需为 1-64 之间的安全整数康熙笔画, 请查康熙字典复核')
    const strokes = chars.map((c, i) => {
      if (manualParts.length) return manual[i]!
      if (AMBIGUOUS_STROKES[c]) throw new Error(`「${c}」存在一简多繁: ${AMBIGUOUS_STROKES[c]}。请在「笔画修正」里按顺序手填每字康熙笔画`)
      const s = KANGXI_STROKES[c]
      if (!s) throw new Error(`「${c}」不在笔画字库中——请在「笔画修正」里按顺序手填每字康熙笔画(可查在线康熙字典)`)
      return s
    })
    const surnameMode = v.surnameMode ?? 'auto'
    if (!['auto', 'single', 'double', ''].includes(surnameMode)) throw new Error('姓氏切分只能选择自动、单姓或复姓')
    if (surnameMode === 'double' && chars.length < 3) throw new Error('复姓至少需要 3 个汉字: 两字姓加名字')
    const autoDouble = DOUBLE_SURNAMES.includes(chars.slice(0, 2).join('')) && chars.length >= 3
    const isDouble = surnameMode === 'double' ? true : surnameMode === 'single' ? false : autoDouble
    const surname = isDouble ? strokes.slice(0, 2) : [strokes[0]]
    const given = strokes.slice(surname.length)
    if (given.length === 0) throw new Error('未识别到名字部分')
    if (given.length > 2) throw new Error('五格剖象模块当前只支持单字名或双字名; 单姓三字名/更长名请改用人工姓名学复核')

    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
    const tian = surname.length === 2 ? sum(surname) : surname[0] + 1
    const ren = surname[surname.length - 1] + given[0]
    const di = given.length >= 2 ? given[0] + given[1] : given[0] + 1
    const zong = sum(strokes)
    const wai = (() => {
      if (surname.length === 1 && given.length === 1) return 2
      if (surname.length === 1) return given[given.length - 1] + 1
      if (given.length === 1) return surname[0] + 1
      return surname[0] + given[given.length - 1]
    })()

    const grids = [
      { name: '天格', n: tian, meaning: '祖荫根基 (先天, 不主吉凶)' },
      { name: '人格', n: ren, meaning: '主运参考 · 五格法称性情与主运' },
      { name: '地格', n: di, meaning: '前运参考 · 五格法称早年与基础' },
      { name: '外格', n: wai, meaning: '副运参考 · 五格法称外缘' },
      { name: '总格', n: zong, meaning: '后运参考 · 五格法称中晚年' },
    ]
    const sancai = [tian, ren, di].map(n => WUXING_OF_DIGIT[n % 10])
    const r1 = sancaiRel('天', sancai[0], '人', sancai[1])
    const r2 = sancaiRel('人', sancai[1], '地', sancai[2])
    const genderText = v.gender === 'female' ? '女' : v.gender === 'male' ? '男' : '未定'

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: XINGMING_AUDIT,
      },
      {
        title: '五格剖象',
        kind: 'pairs',
        data: {
          items: grids.map(g => {
            const e = shuli(g.n)
            const note = shuliNote(g.n)
            return { k: `${g.name} ${shuliNumText(g.n)}`, v: `${e.luck} · ${e.title}`, hint: note ? `${g.meaning}; ${note}` : g.meaning }
          }),
        },
      },
      {
        title: '三才配置',
        kind: 'tags',
        data: {
          items: [
            { label: `天 ${sancai[0]}`, tone: 'accent' as const },
            { label: `人 ${sancai[1]}`, tone: 'accent' as const },
            { label: `地 ${sancai[2]}`, tone: 'accent' as const },
            { label: `天→人 ${r1.short}`, tone: r1.tone },
            { label: `人→地 ${r2.short}`, tone: r2.tone },
          ],
        },
      },
      {
        title: '逐格断语 (81数理)',
        kind: 'table',
        data: {
          head: ['格', '数', '吉凶', '数理', '断语'],
          rows: grids.map(g => { const e = shuli(g.n); return [g.name, shuliNumText(g.n), e.luck, e.title, `${e.desc}${shuliNote(g.n) ? ' (' + shuliNote(g.n) + ')' : ''}`] }),
        },
      },
      {
        title: '笔画明细',
        kind: 'tags',
        data: { items: chars.map((c, i) => ({ label: `${c} ${strokes[i]}画` })) },
      },
    ]

    const renE = shuli(ren)
    const zongE = shuli(zong)
    const fixedReading = [
      `「${name}」按康熙笔画拆解为 ${chars.map((c, i) => `${c}(${strokes[i]})`).join(' ')}${isDouble ? ', 识别为复姓' : ''}。`,
      `按五格法, **人格 ${shuliNumText(ren)}**称主运参考, 传统数理标签为**${renE.luck}「${renE.title}」**——${renE.desc}${shuliNote(ren) ? ' (' + shuliNote(ren) + ')' : ''}; 标签名不作现实断语。`,
      `按五格法, **总格 ${shuliNumText(zong)}**称后运参考, 传统数理标签为**${zongE.luck}「${zongE.title}」**——${zongE.desc}${shuliNote(zong) ? ' (' + shuliNote(zong) + ')' : ''}; 标签名不作现实断语。`,
      `三才为**${sancai.join('')}**: ${r1.text}; ${r2.text}。`,
      `${XINGMING_AUDIT} 性别字段仅用于称谓记录, 不参与五格数理计算。${manualParts.length ? '本盘使用手填笔画。' : '本盘使用内置常用字康熙笔画; 一简多繁字需手填复核。'}`,
    ].join('\n')

    return {
      headline: `五格参考 · ${name} · 人格${shuliNumText(ren)}(${renE.luck}) · 总格${shuliNumText(zong)}(${zongE.luck})`,
      badge: chars[surname.length],
      sections,
      fixedReading,
      aiContext: `姓名学五格剖象审计: ${XINGMING_AUDIT} 「${name}」: ${chars.map((c, i) => `${c}=${strokes[i]}画`).join(', ')}${isDouble ? '; 复姓' + chars.slice(0, 2).join('') : '; 单姓' + chars[0]}; 天格${shuliNumText(tian)}(${shuli(tian).luck}${shuli(tian).title}) 人格${shuliNumText(ren)}(${renE.luck}${renE.title}) 地格${shuliNumText(di)}(${shuli(di).luck}${shuli(di).title}) 外格${shuliNumText(wai)}(${shuli(wai).luck}${shuli(wai).title}) 总格${shuliNumText(zong)}(${zongE.luck}${zongE.title}); 三才${sancai.join('')}(天人${r1.code}:${r1.text}, 人地${r2.code}:${r2.text}); 性别记录=${genderText}, 不参与五格计算; ${manualParts.length ? '笔画来源=手填逐字修正' : '笔画来源=内置常用字康熙笔画'}; 若用户追求古法, 应以八字喜用五行配字义/字音/字形/典籍出处为主、五格为辅; 未计算生肖姓名学/生肖字根; 不可仅凭五格定名。`,
      followups: ['仅按五格看有什么倾向?', '五格数理搭配只能作哪些参考?', '按古法取名还缺哪些信息?'],
    }
  },
}
