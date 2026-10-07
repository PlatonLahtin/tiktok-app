/* Треугольник со скруглёнными углами: у каждой вершины отходим
   на радиус вдоль обеих сторон и соединяем их дугой.
   Используется для значка «просмотры» на плитке и на экране видео. */
export function roundedTriangle(pts: number[][], r: number) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const step = (from: number[], to: number[]) => {
      const dx = to[0] - from[0], dy = to[1] - from[1];
      const len = Math.hypot(dx, dy) || 1;
      return [from[0] + (dx / len) * r, from[1] + (dy / len) * r];
    };
    const a = step(cur, prev);
    const b = step(cur, next);
    d += (i === 0 ? `M ${a[0]} ${a[1]}` : ` L ${a[0]} ${a[1]}`);
    d += ` Q ${cur[0]} ${cur[1]} ${b[0]} ${b[1]}`;
  }
  return d + ' Z';
}
