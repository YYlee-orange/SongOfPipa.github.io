import Phaser from "phaser";
import { COLORS, DESIGN } from "../config";
import type { PlayerDamageSnapshot } from "../entities/player/PlayerDamageModel";
import type { PlayerParrySnapshot } from "../entities/player/PlayerParryModel";
import type { PlayerAbilitySnapshot } from "../entities/player/PlayerAbilityModel";

export class PlayerStatusHud {
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly stateText: Phaser.GameObjects.Text;
  private readonly parryText: Phaser.GameObjects.Text;
  private readonly energyText: Phaser.GameObjects.Text;
  private readonly boostText: Phaser.GameObjects.Text;
  private readonly defeatBackdrop: Phaser.GameObjects.Rectangle;
  private readonly defeatTitle: Phaser.GameObjects.Text;
  private readonly restartPrompt: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#4b2018",
      fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
      fontStyle: "bold",
    };
    this.healthText = scene.add
      .text(30, 70, "", { ...textStyle, fontSize: "25px" })
      .setDepth(900);
    this.stateText = scene.add
      .text(30, 104, "", { ...textStyle, fontSize: "18px" })
      .setDepth(900);
    this.parryText = scene.add
      .text(30, 132, "", { ...textStyle, fontSize: "18px" })
      .setDepth(900);
    this.energyText = scene.add
      .text(30, 160, "", { ...textStyle, fontSize: "19px" })
      .setDepth(900);
    this.boostText = scene.add
      .text(30, 188, "", { ...textStyle, fontSize: "18px" })
      .setDepth(900);
    this.defeatBackdrop = scene.add
      .rectangle(
        DESIGN.width / 2,
        DESIGN.height / 2,
        DESIGN.width,
        DESIGN.height,
        COLORS.page,
        0.72,
      )
      .setDepth(910)
      .setVisible(false);
    this.defeatTitle = scene.add
      .text(DESIGN.width / 2, DESIGN.height / 2 - 36, "挑战失败", {
        ...textStyle,
        color: "#fff4d6",
        fontSize: "54px",
      })
      .setOrigin(0.5)
      .setDepth(911)
      .setVisible(false);
    this.restartPrompt = scene.add
      .text(DESIGN.width / 2, DESIGN.height / 2 + 42, "按 Enter 立即重开", {
        ...textStyle,
        color: "#f6aa6f",
        fontSize: "26px",
      })
      .setOrigin(0.5)
      .setDepth(911)
      .setVisible(false);
  }

  update(
    snapshot: Readonly<PlayerDamageSnapshot>,
    parry: Readonly<PlayerParrySnapshot>,
    ability: Readonly<PlayerAbilitySnapshot>,
    victory: boolean,
  ): void {
    this.healthText.setText(`生命 ${snapshot.health} / ${snapshot.maximumHealth}`);
    this.stateText.setText(
      snapshot.defeated
        ? "无法行动"
        : ability.ultimateInvulnerable
          ? ability.ultimateState === "recovery"
            ? "大招安全恢复中"
            : "大招无敌"
          : snapshot.invulnerable
        ? `受伤无敌 ${snapshot.invulnerabilityRemaining.toFixed(1)} 秒`
        : "正常",
    );
    this.parryText.setText(
      parry.state === "active"
        ? `反弹窗口 ${(parry.activeRemaining * 1000).toFixed(0)} ms`
        : parry.state === "recovery"
          ? `反弹恢复 ${(parry.recoveryRemaining * 1000).toFixed(0)} ms`
          : parry.feedback === "success"
            ? "特殊弹反弹成功"
            : parry.feedback === "miss"
              ? "反弹落空"
            : "反弹就绪",
    );
    const filled = "●".repeat(ability.energy);
    const empty = "○".repeat(ability.maximumEnergy - ability.energy);
    this.energyText.setText(`能量 ${ability.energy} / ${ability.maximumEnergy}  ${filled}${empty}`);
    this.boostText.setText(
      ability.ultimateState === "charging"
        ? `大招蓄力 ${(ability.ultimateChargeProgress * 100).toFixed(0)}% · 松开改为2点强化`
        : ability.ultimateState === "absorbing"
          ? `大招吸收中 ${ability.ultimateRemaining.toFixed(1)} 秒`
          : ability.ultimateState === "firing"
            ? "大招弹幕齐射 · 近水平轻微散射"
            : ability.ultimateState === "recovery"
              ? `安全恢复 ${ability.ultimateRemaining.toFixed(1)} 秒`
              : ability.boosted
        ? `强化中 ${ability.boostRemaining.toFixed(1)} 秒 · 全弹种零冷却反弹`
        : ability.feedback === "insufficient"
          ? `能量不足，需要 ${ability.boostCost} 点`
          : ability.feedback === "already-active"
            ? "强化已经生效"
            : ability.feedback === "activated"
              ? "强化启动"
              : ability.energy >= ability.maximumEnergy
                ? "X / K 短按强化 · 长按蓄力大招"
                : `X / K 消耗 ${ability.boostCost} 点强化`,
    );
    const outcomeVisible = snapshot.defeated || victory;
    this.defeatTitle.setText(victory ? "挑战成功" : "挑战失败");
    this.restartPrompt.setText(victory ? "按 Enter 再来一局" : "按 Enter 立即重开");
    this.defeatBackdrop.setVisible(outcomeVisible);
    this.defeatTitle.setVisible(outcomeVisible);
    this.restartPrompt.setVisible(outcomeVisible);
  }
}
