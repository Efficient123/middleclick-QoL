import { system, world } from "@minecraft/server";

const prefixes = ["netherite", "diamond", "iron", "stone", "wooden"];

const DOUBLE_SNEAK_WINDOW = 10;

const lastSneak = new Map();
const sneaking = new Map();

const TIER_REQUIREMENTS = [
  ["minecraft:diamond_tier_destructible", 1],
  ["minecraft:iron_tier_destructible", 2],
  ["minecraft:stone_tier_destructible", 3],
];

function minimumTier(block) {
  for (const [tag, tier] of TIER_REQUIREMENTS) {
    if (block.hasTag?.(tag) || block.permutation?.hasTag?.(tag)) {
      return tier;
    }
  }

  return 4;
}

const TOOL_FAMILIES = [
  {
    kind: "pickaxe",
    blockTags: ["minecraft:is_pickaxe_item_destructible"],
  },
  {
    kind: "shovel",
    blockTags: ["minecraft:is_shovel_item_destructible"],
  },
  {
    kind: "axe",
    blockTags: ["minecraft:is_axe_item_destructible"],
  },
  {
    kind: "hoe",
    blockTags: ["minecraft:is_hoe_item_destructible"],
  },
  {
    kind: "shears",
    blockTags: ["minecraft:is_shears_item_destructible"],
  },
];

function getItemFamily(itemId) {
  const name = itemId.split(":")[1];

  if (name === "shears") return "shears";

  const parts = name.split("_");
  return parts.slice(1).join("_");
}

function level(toolId) {
  const name = toolId.split(":")[1];

  if (name === "shears") return 0;

  return prefixes.indexOf(name.split("_")[0]);
}

function getFamilyFromBlock(block) {
  if (!block) return null;
  if (block.typeId.endsWith("leaves")) return "shears";
  for (const family of TOOL_FAMILIES) {
    for (const tag of family.blockTags) {
      if (block.hasTag?.(tag) || block.permutation?.hasTag?.(tag)) {
        return family.kind;
      }
    }
  }
  return null;
}

system.runInterval(() => {
  const tick = system.currentTick;
  for (const player of world.getPlayers()) {
    const id = player.id;

    const isSneaking = player.isSneaking;
    const wasSneaking = sneaking.get(id) ?? false;

    if (isSneaking && !wasSneaking) {
      const previous = lastSneak.get(id);

      if (previous !== undefined && tick - previous <= DOUBLE_SNEAK_WINDOW) {
        const blockLookingAt = player.getBlockFromViewDirection({ maxDistance: 5, includePassableBlocks: true, });
        const block = blockLookingAt?.block;
        if (!block) return;
        const family = getFamilyFromBlock(block);

        if (!family) {
          lastSneak.set(id, tick);
          sneaking.set(id, isSneaking);
          continue;
        }
        const inven = player.getComponent("minecraft:inventory");
        const container = inven?.container;

        if (!container) {
          lastSneak.set(id, tick);
          sneaking.set(id, isSneaking);
          continue;
        }
        const best = {
          level: Infinity,
          slot: undefined,
        };

        const requiredTier = minimumTier(block);

        for (let i = 0; i < container.size; i++) {
          const itemId = container.getItem(i)?.typeId;
          if (!itemId) continue;

          if (getItemFamily(itemId) !== family) continue;

          const itemLevel = level(itemId);
          if (itemLevel < 0) continue;

          if (itemLevel > requiredTier) continue;

          if (itemLevel < best.level) {
            best.level = itemLevel;
            best.slot = i;
          }
        }

        if (
          best.slot !== undefined &&
          best.slot !== player.selectedSlotIndex
        ) {
          container.swapItems(best.slot, player.selectedSlotIndex, container);
        }
      }

      lastSneak.set(id, tick);
    }
    sneaking.set(id, isSneaking);
  }
}, 1);
