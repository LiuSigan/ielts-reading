# 雅思阅读日练

每天自动生成一篇原创雅思学术类阅读（约 800 词、13 题），覆盖全部 16 种题型，按正确率自动升降难度。交卷后给出得分、原文定位和中文解析。

- 网页：`index.html`（纯静态，GitHub Pages 托管）
- 题目：`data/passages/<日期>.json`，答案与解析：`data/keys/<日期>.json`，目录：`data/index.json`
- 出题规范：`gen/spec.md`；校验器：`gen/validate.mjs`（每篇题目必须通过才会发布）
- 成绩同步接口：`worker/worker.js`（Cloudflare Worker + KV，免费额度足够）

## 每天怎么更新

云端定时任务每天 6:47（新加坡/北京时间）读取 `config.json` 里的同步接口拿到最新成绩和难度，按 `gen/spec.md` 出题，
跑 `gen/validate.mjs` 校验，再运行 `gen/build-index.mjs` 更新目录，然后提交到 `main`。GitHub Pages 几分钟内自动更新，
网页打开时（以及每 10 分钟、切回页面时）会自动加载新文章。

## 难度规则

- 一篇正确率 ≥ 85% → 升半档；< 50% → 降半档
- 连续两篇都 ≥ 70% → 升半档；连续两篇都 < 60% → 降半档
- 范围 Band 5.0–9.0，只有每篇的第一次作答计入；重做不计入

## 一次性设置

### 1. 打开 GitHub Pages
仓库 Settings → Pages → Build and deployment → Source 选 **Deploy from a branch**，Branch 选 **main** / **/(root)**，保存。
几分钟后网址是 `https://<用户名>.github.io/<仓库名>/`。

### 2. 部署成绩同步接口（可选，但建议做）
不做这一步网站也能用，只是成绩只存在做题那台设备的浏览器里，第二天出题读不到成绩，难度也就不会自动调整。

1. 注册 Cloudflare 免费账号。
2. **Workers & Pages → Create → Worker**，名字填 `ielts-api`，先 Deploy，再点 **Edit code**，把 `worker/worker.js` 的全部内容粘贴进去，Deploy。
3. **Storage & Databases → KV → Create**，名字填 `ielts`。
4. 回到 Worker → **Settings → Bindings → Add → KV namespace**，Variable name 填 `IELTS`，选刚建的 `ielts`。
5. Worker → **Settings → Variables and Secrets → Add**，类型选 **Secret**，Name 填 `WRITE_KEY`，Value 填一个自己定的同步口令。
6. 把 Worker 的网址（`https://ielts-api.<子域>.workers.dev`）写进 `config.json` 的 `apiBase`。
7. 打开网站 → 记录 → 成绩同步，输入同步口令。之前存在本机的成绩会自动补传。

接口说明：`GET /state` 公开读取成绩和难度；`POST /attempt`、`/level`、`/check` 需要请求头 `X-Key: <同步口令>`。

## 本地预览

```bash
python3 -m http.server 8000
```

然后打开 http://localhost:8000/ 。
