# 《琵琶曲》Web 原型

《琵琶曲》是一款正在验证核心玩法的 2D 横版弹幕 Boss 战原型。玩家直接控制角色的屁股躲避弹幕，在短暂窗口内反弹特殊弹积攒能量，并在短期强化与满能量大招之间作出选择。

当前版本：`0.9.0-playtest`（原型初期试玩版）

## 在线试玩

[打开 GitHub Pages 试玩版](https://yylee-orange.github.io/SongOfPipa.github.io/)

建议使用桌面版 Chrome 或 Edge，并保持浏览器标签页处于前台。游戏以 1280 × 720 为逻辑分辨率，会根据窗口尺寸等比缩放。

## 操作方式

- `WASD`／方向键：移动屁股，也就是唯一受击核心。
- `Z`／`J`：开启短暂反弹窗口；成功反弹特殊弹可获得 1 点能量。
- `X`／`K` 短按：消耗 2 点能量，进入 3.5 秒强化，期间接触核心的弹丸会自动反弹。
- 满 10 点能量时长按 `X`／`K` 2 秒：释放大招，吸收场上弹幕并从屁股处连续射出反击弹；演出期间无敌。
- 胜利或失败后按 `Enter`：重新开始。

普通弹在常态下只能躲避。特殊弹具有不同的颜色、轮廓和脉冲效果，需要在靠近屁股时主动反弹。反弹后的弹丸按照接触位置决定出射方向，只会在屏幕上下边界镜面弹射，到达左右边界后飞出。

## 当前原型内容

- 三锚点程序骨骼：头部有限游移、梯形躯干跟随、固定脚底与弹性腿部连接。
- 屁股覆盖全屏移动，是控制点、受击点与反弹反馈点。
- 3 点生命、受伤无敌、胜负结算与快速重开。
- 三阶段测试 Boss：随生命降低提高移动、射击与弹速压力；每发子弹有 20% 概率成为特殊弹。
- 0～10 点能量、2 点强化与 10 点大招的完整战斗循环。
- 大招吸收、连射、Boss 命中反馈及安全退场。

目前仍使用几何占位美术。后续批次将替换为原创暖色橡皮管角色、弹丸资源和室内木制三层视差背景。

## 本地开发

环境要求：Node.js 22（建议使用当前 LTS 版本）与 npm。

```bash
npm ci
npm run dev
```

默认开发地址：<http://127.0.0.1:5173/>

## 测试与构建

```bash
npm run typecheck
npm run test:rig
npm run test:movement
npm run test:combat
npm run build
npm run preview
```

生产构建输出到 `dist/`。每次推送到 `main` 分支后，GitHub Actions 会重新执行类型检查、自动化测试和生产构建，并将构建结果部署到 GitHub Pages。

## 项目结构

```text
src/
  game/
    entities/    玩家骨骼、Boss 与弹丸实体
    scenes/      启动与原型战斗场景
    systems/     战斗、碰撞与技能逻辑
    ui/          HUD
tests/           骨骼、移动与战斗自动化测试
public/assets/   后续正式资源入口
```

完整玩法规则、分批开发顺序与验收记录见 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)。

## 自动部署

部署流程位于 `.github/workflows/deploy-pages.yml`：

1. 检出 `main` 分支代码并安装锁定依赖。
2. 执行类型检查和全部自动化测试。
3. 生成 Vite 静态构建。
4. 将 `dist/` 发布到 GitHub Pages。

如仓库首次启用 Pages，请在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中将 Source 设为 **GitHub Actions**。工作流首次成功完成后，上方在线试玩链接即可访问。
