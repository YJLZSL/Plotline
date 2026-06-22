import type { Character, Event, Location } from '@/types';

export interface FootprintPoint {
  locationId: string;
  posX: number;
  posY: number;
  sortAt: string;
}

export interface CharacterFootprint {
  characterId: string;
  characterName: string;
  color: string;
  points: FootprintPoint[];
}

/**
 * 根据地点与角色的直接关联、以及角色出场事件的关联地点，
 * 为每个角色生成按时间排序的足迹路径。
 */
export function buildCharacterFootprints(
  locations: Location[],
  events: Event[],
  characters: Character[],
): CharacterFootprint[] {
  return characters
    .map((character) => {
      const pointMap = new Map<string, FootprintPoint>();

      // 1. 地点直接关联的角色
      for (const location of locations) {
        if (location.characterIds.includes(character.id)) {
          pointMap.set(location.id, {
            locationId: location.id,
            posX: location.posX,
            posY: location.posY,
            sortAt: location.createdAt,
          });
        }
      }

      // 2. 角色出场事件所关联的地点
      for (const event of events) {
        if (!event.characterIds.includes(character.id)) continue;
        const location = locations.find((l) => l.linkedEventId === event.id);
        if (!location) continue;
        if (!pointMap.has(location.id)) {
          pointMap.set(location.id, {
            locationId: location.id,
            posX: location.posX,
            posY: location.posY,
            sortAt: event.createdAt,
          });
        }
      }

      const points = Array.from(pointMap.values()).sort((a, b) =>
        a.sortAt.localeCompare(b.sortAt),
      );

      return {
        characterId: character.id,
        characterName: character.name,
        color: character.color,
        points,
      };
    })
    .filter((fp) => fp.points.length >= 2);
}

/**
 * 将有序点列转换为平滑贝塞尔曲线路径。
 * 点数为 2 时退化为直线。
 */
export function bezierPath(points: { posX: number; posY: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    const [a, b] = points;
    if (!a || !b) return '';
    return `M ${a.posX} ${a.posY} L ${b.posX} ${b.posY}`;
  }

  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M ${first.posX} ${first.posY}`;
  for (let i = 1; i < rest.length + 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;
    const deltaX = curr.posX - prev.posX;
    const cpx1 = prev.posX + deltaX * 0.4;
    const cpy1 = prev.posY;
    const cpx2 = prev.posX + deltaX * 0.6;
    const cpy2 = curr.posY;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.posX} ${curr.posY}`;
  }
  return d;
}
