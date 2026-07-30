import { system, world } from "@minecraft/server";
import { blockTools } from "./blocks";

const prefixes = ["netherite", "diamond", "iron", "stone", "wooden"];

const level = (tool) => {
  return prefixes.indexOf(tool.split(":")[1].split("_")[0]);
}

const lastSneak = new Map();
const sneaking = new Map();

const DOUBLE_SNEAK_WINDOW = 10;

system.runInterval(() => {
  const tick = system.currentTick;

  for (const player of world.getPlayers()) {

    const id = player.id;

    const isSneaking = player.isSneaking;
    const wasSneaking = sneaking.get(id) ?? false;

    if (isSneaking && !wasSneaking) {
      const previous = lastSneak.get(id);

      if (previous !== undefined && tick - previous <= DOUBLE_SNEAK_WINDOW) {

        const id = player.id;

        const block_looking_at = player.getBlockFromViewDirection({ maxDistance: 5 });
        const blockId = block_looking_at?.block?.typeId;
        const tool = blockTools[blockId];

        if (!tool || tool === "minecraft:any") return;

        const inven = player.getComponent("minecraft:inventory");
        const container = inven.container;

        let toolType = tool.split(":")[1].split("_");
        const minLevel = toolType[0];
        toolType = toolType[1];

        const baselineLevel = prefixes.indexOf(minLevel);

        const best = {
          level: Infinity,
          slot: undefined,
        }

        for (let i = 0; i < container.size; i++) {
          const item = container.getItem(i)?.typeId;
          if (!item || item.split(":")[1].split("_")[1] !== toolType) continue;
          const itemLevel = level(item);
          if (itemLevel < best.level && itemLevel <= baselineLevel) {
            best.level = itemLevel;
            best.slot = i;
          }
        }
        if (best.slot !== undefined) {
          container.swapItems(best.slot, player.selectedSlotIndex, container);
        }
      }
      lastSneak.set(id, tick);
    }
    sneaking.set(id, isSneaking);
  }
}, 1);
