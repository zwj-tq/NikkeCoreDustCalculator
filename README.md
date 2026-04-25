# 芯尘策略计算器

一个可直接部署到 GitHub Pages 的静态网页工具，用于模拟 NIKKE 红球成长过程，并对比不同开箱策略在一段时间内的表现。

## 在线访问

GitHub Pages 地址：

https://zwj-tq.github.io/NikkeCoreDustCalculator/

## 项目说明

本项目为纯前端静态页面，不依赖 Python、后端服务或数据库。

当前实现包含：

- 基础参数配置
- 主线更新配置
- 活动配置
- 额外来源 / 日常获取配置
- 多策略模拟
- 策略对比图表
- 每日明细查看
- CSV 导出
- PNG 导出

## 目录结构

- `index.html`：页面结构
- `styles.css`：页面样式
- `nikke-data.js`：NIKKE 主线进度与基地等级本地快照，由 GitHub Actions 定时同步
- `app.js`：模拟逻辑与交互逻辑

## 本地使用

直接打开 `index.html` 即可使用。

如果需要更接近线上环境，也可以使用任意静态服务器进行预览。

## 部署到 GitHub Pages

1. 将 `index.html`、`styles.css`、`app.js`、`nikke-data.js` 提交到仓库。
2. 在仓库 `Settings -> Pages` 中选择部署分支。
3. 如果使用仓库根目录作为发布目录，则入口文件为 `index.html`。

## 数据同步

浏览器端只读取仓库内置的 `nikke-data.js` 快照，不再直接请求 `nikkeoutpost.netlify.app`，避免 GitHub Pages 跨域访问外部 JSON 时触发 CORS 拦截。

远程数据刷新由 `.github/workflows/sync-nikke-data.yml` 完成：

- 每天定时运行一次，也可以在 GitHub Actions 页面手动触发。
- 运行 `npm run sync:nikke-data` 拉取 `chapters.json` 与 `outpost.json`。
- 生成新的 `nikke-data.js` 后先运行测试。
- 如果快照有变化，Action 会自动提交更新。

本地手动同步：

```bash
npm run sync:nikke-data
```

## 数据来源与鸣谢

部分规则整理与数值校对参考了 NIKKE 相关社区工具与资料。

当前版本通过 GitHub Actions 定时同步 `NIKKE Outpost` 的远程章节 / 基地产出数据，并将结果保存为仓库内置的 `nikke-data.js` 快照。

感谢：

- NIKKE Outpost  
  https://nikkeoutpost.netlify.app/

## 说明

当前项目重点在于：

- 便于快速修改配置
- 便于比较多个策略结果
- 便于直接挂载到静态托管平台

如果后续继续扩展，建议优先保持静态网页方案不变，避免重新引入本地运行环境依赖。
