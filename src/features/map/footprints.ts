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

const SORT_ORDER_PREFIX = 'order:';
const SORT_ORDER_PAD_LENGTH = 10;

function padSortOrder(sortOrder: number): string {
  return `${SORT_ORDER_PREFIX}${String(sortOrder).padStart(SORT_ORDER_PAD_LENGTH, '0')}`;
}

/**
 * 事件排序键：绝对事件优先用 dateValue（纯字符串可字典序比较），
 * 相对事件或空日期回退为 `order:` + 零填充 sortOrder。
 * 与地点直接关联使用的 createdAt（ISO 字符串）保持同一种可比较键体系。
 */
function getEventSortAt(event: Event): string {
  const dateValue = event.dateValue.trim();
  if (event.dateType === 'absolute' && dateValue !== '') {
    return dateValue;
  }
  return padSortOrder(event.sortOrder);
}

function toFootprintPoint(location: Location, sortAt: string): FootprintPoint {
  return {
    locationId: location.id,
    posX: location.posX,
    posY: location.posY,
    sortAt,
  };
}

function upsertPoint(
  pointMap: Map<string, FootprintPoint>,
  location: Location,
  sortAt: string,
): void {
  const existing = pointMap.get(location.id);
  if (!existing || sortAt < existing.sortAt) {
    pointMap.set(location.id, toFootprintPoint(location, sortAt));
  }
}

function findLocationById(locations: Location[], id: string | null): Location | undefined {
  if (!id) return undefined;
  return locations.find((location) => location.id === id);
}

/**
 * 根据地点与角色的直接关联、以及角色出场事件的关联地点，
 * 为每个角色生成按时间排序的足迹路径。
 *
 * 事件关联地点时优先使用 `event.locationId` 直接命中地点；
 * 未命中时回退到 `location.linkedEventId === event.id` 的旧逻辑。
 * 同一地点若被多个来源命中，保留更早的排序键。
 */
export function buildCharacterFootprints(
  locations: Location[],
  events: Event[],
  characters: Character[],
): CharacterFootprint[] {
  return characters
    .map((character) => {
      const pointMap = new Map<string, FootprintPoint>();

      // 1. 地点直接关联的角色，排序键使用地点 createdAt
      for (const location of locations) {
        if (location.characterIds.includes(character.id)) {
          upsertPoint(pointMap, location, location.createdAt);
        }
      }

      // 2. 角色出场事件所关联的地点
      for (const event of events) {
        if (!event.characterIds.includes(character.id)) continue;
        const sortAt = getEventSortAt(event);

        const directLocation = findLocationById(locations, event.locationId);
        if (directLocation) {
          upsertPoint(pointMap, directLocation, sortAt);
          continue;
        }

        const linkedLocation = locations.find((location) => location.linkedEventId === event.id);
        if (linkedLocation) {
          upsertPoint(pointMap, linkedLocation, sortAt);
        }
      }

      const points = Array.from(pointMap.values()).sort((a, b) => {
        if (a.sortAt < b.sortAt) return -1;
        if (a.sortAt > b.sortAt) return 1;
        return 0;
      });

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
