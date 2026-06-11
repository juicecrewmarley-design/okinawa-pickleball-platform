import type { TournamentCategoryConfig } from "@/types/domain";

export const doublesDivisions = ["男子ダブルス", "女子ダブルス", "ミックスダブルス"];

export const doublesClasses = ["オープン初中級者", "オープン中上級者", "35+", "50+", "65+"];

export const teamAgeCategories = ["合計年齢100+", "150+", "180+", "200+"];

export const defaultTournamentCategoryConfig: TournamentCategoryConfig = {
  doubles: {
    divisions: doublesDivisions,
    classes: doublesClasses
  },
  team: {
    enabled: true,
    ageCategories: teamAgeCategories
  }
};

export function buildTournamentCategories(config: TournamentCategoryConfig) {
  const doublesCategories = config.doubles.divisions.flatMap((division) =>
    config.doubles.classes.map((className) => `${division} / ${className}`)
  );
  const teamCategories = config.team.enabled ? config.team.ageCategories.map((category) => `チーム戦 / ${category}`) : [];
  return [...doublesCategories, ...teamCategories];
}

export function buildCategoryCapacities(
  categories: string[],
  values: Record<string, FormDataEntryValue | null>,
  fallbackCapacity = 16
) {
  return categories.reduce<Record<string, number>>((capacities, category) => {
    const value = Number(values[category]);
    capacities[category] = Number.isFinite(value) && value > 0 ? value : fallbackCapacity;
    return capacities;
  }, {});
}

export function sumCategoryCapacities(categoryCapacities?: Record<string, number>) {
  if (!categoryCapacities) return 0;
  return Object.values(categoryCapacities).reduce((total, capacity) => total + capacity, 0);
}

export function getCategoryCapacity(categoryCapacities: Record<string, number> | undefined, category: string) {
  return categoryCapacities?.[category];
}
