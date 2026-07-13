// 术数总注册表 — 命 / 相 / 卜
import type { ModuleDef } from '../core/types.ts'
import { baziModule, sajuModule } from './bazi.ts'
import { ziweiModule } from './ziwei.ts'
import { westernModule, vedicModule } from './astrology.ts'
import { tibetanModule } from './tibetan.ts'
import { numerologyModule } from './numerology.ts'
import { xingmingModule } from './xingming.ts'
import { humanDesignModule } from './humandesign.ts'
import { mayaModule } from './maya.ts'
import { aztecModule } from './aztec.ts'
import { wetonModule } from './weton.ts'
import { faceModule, palmModule, fengshuiModule, vastuModule } from './xiang.ts'
import { liuyaoModule, meihuaModule } from './yijing.ts'
import { tarotModule, runesModule } from './drawing.ts'
import { qimenModule } from './qimen.ts'
import { liurenModule } from './liuren.ts'
import { taiyiModule } from './taiyi.ts'
import { ifaModule, ramlModule, sikidyModule } from './geomancy.ts'
import { allSystemsModule } from './allSystems.ts'

export const MODULES: ModuleDef[] = [
  // 综观 — 一键全术数聚合(交 AI 通观)
  allSystemsModule,
  // 命 — 生辰/姓名代入固定公式
  baziModule,
  ziweiModule,
  sajuModule,
  westernModule,
  vedicModule,
  tibetanModule,
  numerologyModule,
  xingmingModule,
  humanDesignModule,
  mayaModule,
  aztecModule,
  wetonModule,
  // 相 — 观察物理对象, 模式识别
  faceModule,
  palmModule,
  fengshuiModule,
  vastuModule,
  // 卜 — 当下起一课, 答具体之问
  liuyaoModule,
  meihuaModule,
  tarotModule,
  runesModule,
  qimenModule,
  liurenModule,
  taiyiModule,
  ifaModule,
  ramlModule,
  sikidyModule,
]
