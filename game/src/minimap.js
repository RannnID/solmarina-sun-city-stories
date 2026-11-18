// The minimap: a 2D top-down canvas in the HUD corner. Roads and the beach are drawn as a
// static backdrop once; each frame the player, police, waypoint, enemies and collectibles are
// plotted as blips, with the waypoint blinking.
import { CITY } from './config.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (CITY.half * 2 + 120);
  const cx = size / 2;
  const cz = size / 2;

  function toMap(x, z) {
    return { x: cx + x * scale, y: cz + z * scale };
  }

  // Static backdrop: ocean, sand, roads, tower and lighthouse dots.
  ctx.fillStyle = '#12303f';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(0, toMap(0, 370).y, size, size);
  ctx.fillStyle = '#e8cf9e';
  ctx.fillRect(0, toMap(0, 300).y, size, 12);
  ctx.fillStyle = '#5a5148';
  for (let i = 0; i < CITY.blocks; i += 1) {
    const c = CITY.roadAt(i);
    const p = toMap(c, 0);
    ctx.fillRect(p.x - 3, 0, 6, size);
    ctx.fillRect(0, p.y - 3, size, 6);
  }
  ctx.fillStyle = '#e8a34c';
  const tower = toMap(0, -240);
  ctx.fillRect(tower.x - 3, tower.y - 3, 6, 6);

  return {
    draw(state) {
      // Redraw the backdrop cheaply by stamping the static layer is complex; instead clear and
      // repaint the roads each frame — the canvas is small and this stays fast.
      ctx.fillStyle = '#12303f';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#2e7fa8';
      ctx.fillRect(0, toMap(0, 370).y, size, size);
      ctx.fillStyle = '#e8cf9e';
      ctx.fillRect(0, toMap(0, 300).y, size, 12);
      ctx.strokeStyle = '#7d7468';
      ctx.lineWidth = 5;
      for (let i = 0; i < CITY.blocks; i += 1) {
        const c = CITY.roadAt(i);
        const p = toMap(c, 0);
        ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(size, p.y); ctx.stroke();
      }
      const tower = toMap(0, -240);
      ctx.fillStyle = '#e8a34c';
      ctx.fillRect(tower.x - 3, tower.y - 3, 6, 6);
      // Collectible packages.
      ctx.fillStyle = '#ffd23f';
      for (const pkg of state.packages) {
        if (pkg.taken) continue;
        const p = toMap(pkg.x, pkg.z);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      // Enemies.
      ctx.fillStyle = '#ff4d4d';
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const p = toMap(e.x, e.z);
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      // Police blips.
      ctx.fillStyle = '#3f8cff';
      for (const c of state.police) {
        const p = toMap(c.x, c.z);
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      // Mission waypoint, blinking.
      if (state.waypoint && Math.floor(performance.now() / 350) % 2 === 0) {
        const p = toMap(state.waypoint.x, state.waypoint.z);
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8.5, 0, Math.PI * 2); ctx.stroke();
      }
      // Player arrow.
      const pp = toMap(state.player.x, state.player.z);
      ctx.save();
      ctx.translate(pp.x, pp.y);
      ctx.rotate(Math.atan2(Math.sin(state.player.heading), Math.cos(state.player.heading)));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}
