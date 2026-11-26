# 学情档案（每天出题前更新）

这份档案记录学生每一篇的错题分析：错在哪里、选了哪个干扰项、属于哪类陷阱。每天出题前，用
`node gen/analyze.mjs --since <上次复盘日期>` 逐题看完新做的篇目，把结论补进下面的「当前画像」和「每日记录」。
出题的难度和针对点以这份档案为准，规则算出的 profile.level 只作参考。

---

## 当前画像（2026-11-26 更新，基于 24 篇首次作答，约 100 道错题）

### 难度判断
| Part 2 难度 | 篇数 | 正确率 |
|---|---|---|
| 5.0 | 1 | 13/13 |
| 5.5 | 2 | 12/13、9/13 |
| 6.0 | 1 | 10/13 |
| 6.5 | 3 | 10/13（11-04）、7/13、7/13 |
| 7.0 | 2 | 4/13、5/13 |

- 结论：Part 2 的实际能力在 **6.0 左右**。6.5 最近两篇都是 54%，7.0 明显超出。
- Part 1 在 5.0–6.0 稳定在 62–77%；Part 3 在 7.0–7.5 只有 36–57%，是最弱的一块。
- 用时：多数 15–23 分钟，Part 3 常超过 20 分钟（最长 28 分钟）。
- 出题策略：**文章难度先稳在 6.0（Part 1 5.5，Part 3 7.0）**，靠在她的弱点上加大题目难度来“提升难度”，而不是一味提高文章档位。等 6.0 的 Part 2 连续两篇 ≥ 77%，且 match_info、headings 各有一篇 ≥ 5/6，再升到 6.5。

### 题型总表（全部首次作答）
| 题型 | 正确率 | 判断 |
|---|---|---|
| match_info | 29/63（46%） | 最大短板，必须天天练 |
| mcq | 20/40（50%） | 早期很差，最近 75%+，在恢复 |
| summary_box | 6/12（50%） | 弱 |
| headings | 26/46（57%） | 弱，Part 3 尤其差（2/6） |
| sentence_completion | 17/28（61%） | 中 |
| sentence_endings | 26/39（67%） | Part 1/2 已稳（9/9），Part 3 仍弱（0/4） |
| ynng / tfng | 6/9、13/19 | 中 |
| note / flowchart / table / short_answer | 75–100% | 稳，偶尔练即可 |

### 她反复掉进的陷阱（按出现频率排序，出题时要专门设）

**T1 相邻段 / 错位**（match_info 约 10/34 次错选相邻段落；headings 约 7/20 次把相邻段的标题套到本段）
- 典型例子：11-24 Q7 选 B（应为 A）、Q9 选 E（应为 F）、Q10 选 F（应为 G），连续三题都差一段。
- 典型例子：11-11-a headings 把 C 段标题给了 D、D 段标题给了 E，整体错位。
- 推测原因：她找到了大致位置，但证据句常在段首或段末，她没确认句子属于哪一段。
- 出题对策：证据句放在段首或段末；相邻段写一句同话题、但信息类型不同的近似句。

**T2 按话题词配对，而不是按“信息类型 / 限定词”配对**（match_info 主要错因）
- 例子：“a reason why beavers were once killed”，她选了讲现在持证捕杀的 F 段，漏看 once 和 reason。
- 例子：“an estimate of the proportion of spending”，她选了只提维修费、没有比例的段落，漏看 proportion。
- 出题对策：题干用 a reason / an estimate / a comparison / a warning 等信息类型词；干扰段放同一话题，但给的是另一种信息。

**T3 细节当主旨**（headings 约 7/20）
- 例子：选“男女差异”“悉尼歌剧院造价”“网购兴起”“新员工观察学习”这类只对应段中一个细节的标题。
- 例子：先让步再转折的段落（Admittedly… / In principle… In practice…）她常选让步部分的细节。
- 出题对策：每组 headings 至少 2 段主旨在段尾或转折之后，并配一个“段中细节”干扰标题。

**T4 张冠李戴：主语 / 人物互换**（sentence_endings、mcq）
- 例子：11-21-p 把 Okoye 和 Eriksen 的观点对调；把“宫颈癌筛查”结尾配给了韩国甲状腺筛查和 Nair。
- 例子：mcq 选了“欧洲移民带来小费”，原文是“出国回来的富裕美国人”。
- 例子：男女比例说反。
- 出题对策：多人观点相近时专门出 sentence_endings；每个干扰结尾都写成文中另一个人说过的话。

**T5 方向 / 比较 / 让步后否定没读出来**（ynng、tfng、mcq）
- 例子：“more effective than expected”对“achieved less than hoped”，她选了 YES。
- 例子：“It is tempting to conclude… but…”，她把被作者否定的观点当成作者观点。
- 例子：“may be the price of catching the cases that matter”是“可能无法避免”的意思，她以为没提到，选了 NOT GIVEN。
- 出题对策：每篇判断题至少一道“作者先引出再否定”的观点，一道比较级方向题，一道需要换说法才能理解的 YES/TRUE。

**T6 凭常识或联想补信息**（tfng）
- 例子：看到 Danish 就认为是丹麦政府资助，选 TRUE（应为 NOT GIVEN）。
- 例子：“less than a decade”需要算 1980–1994，她没算，选了 NOT GIVEN（应为 FALSE）。
- 出题对策：保留“需要简单计算”的 FALSE 题，以及“看起来顺理成章但没写”的 NOT GIVEN 题。

**T7 选词不检查语法 / 搭配，被近义或邻近词吸引**（summary_box、completion）
- 例子：“overpriced figures”“unusual”配 bargain；irregular 被 unusual leaps 吸引；mind 对 mouth。
- 例子：daydreaming 填进 letting thoughts ___；fetching 填进 how to ___；added 填进主语位置。
- 出题对策：干扰选项与原文邻近词同形或近义，但语法 / 搭配不通或对象不对；解析里写明“放进空格读一遍”。

**T8 填空时定位到错的地方，或超出字数 / 词形不对**
- 例子：eight-year-old 对 eight；pocket 对 pocket watch；从同段别的数字或年份里抄答案（Act、King George III、thirty years、millimetre wide）。
- 出题对策：同段放同类数字或名词做竞争，题干改写定位词。

### 已经稳住的
- note / flowchart / short_answer：近期满分或接近满分。
- 5.0–5.5 的 Part 2 能拿满分，说明基础定位没问题。
- 问题集中在 6.0 以上的改写深度，以及上面的 T1–T5。

### 下一阶段的训练重点
1. match_info 每天至少一组，重点设 T1、T2。
2. headings 每天至少一组，设 T3，并且至少一段主旨在段尾。
3. Part 3 多出 sentence_endings（T4）和 ynng（T5）。
4. 解析里点名陷阱类型（如“这是相邻段干扰”“这是细节当主旨”），让她自己认出套路。

---

## 每日记录

### 2026-11-26（首次全面复盘，覆盖 11-01 至 11-24 全部 24 篇）
- 新做：11-24《The Tunes That Won't Go Away》（Part 2，6.5）7/13。
- 错题：
  - summary_box 错 3 道：D irregular（T7）、F obscure（T7）、L mind（T7）。
  - match_info 错 3 道：B/E/F，正确答案分别是 A/F/G，全部相邻段（T1）。
- 判断：6.5 连续两篇 54%，规则降到 6.0，我同意。6.0 的 Tiny Forests 是 10/13，说明 6.0 合适。
- 今天已出的 11-26 两篇（Part 1 5.5、Part 2 6.0）是在建档前出的；从 11-27 起按本档案的对策设题。
