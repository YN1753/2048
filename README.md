# 2048 · 粉色版 💗

粉色主题的 2048 经典小游戏，纯前端实现（HTML + CSS + 原生 JavaScript），无任何构建步骤和第三方依赖。

## 玩法

- 使用 <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> 或 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动方块，手机上直接滑动屏幕
- 相同数字的方块碰撞时会合并，得分随之累加
- 合成 **2048** 即获胜，还可以继续挑战更高的数字
- 棋盘填满且无法移动时游戏结束
- 最高分保存在浏览器 `localStorage` 中

## 本地运行

目录是纯静态站点，任选一种方式：

```bash
# Python
python3 -m http.server 8080

# 或 Node
npx serve .
```

然后访问 http://localhost:8080 。直接双击打开 `index.html` 也可以玩。

## 部署到 GitHub Pages

仓库已配置好 GitHub Actions（`.github/workflows/deploy.yml`）：推送到 `main` 分支即自动部署，纯静态文件直接上线，无需构建。

首次部署只需三步：

```bash
# 1. 在 GitHub 上新建一个空仓库（建议名字就叫 2048），不要勾选任何初始化选项
# 2. 关联远端并推送
git remote add origin git@github.com:<你的用户名>/2048.git
git push -u origin main

# 3. 打开仓库页面 → Settings → Pages → Source 选择 "GitHub Actions"
```

> 工作流里的 `actions/configure-pages` 带 `enablement: true`，通常会自动帮你开启 Pages；
> 如果首次运行仍报 "Pages not enabled"，按第 3 步手动选一次 "GitHub Actions" 再重跑工作流即可。

之后每次 `git push` 都会自动重新部署，也可以在 **Actions** 页面手动触发（`workflow_dispatch`）。

## 目录结构

```
.
├── index.html                  # 页面结构
├── style.css                   # 粉色主题样式与动画
├── script.js                   # 游戏核心逻辑（移动 / 合并 / 计分 / 胜负判定）
└── .github/workflows/deploy.yml  # GitHub Pages 自动部署
```
