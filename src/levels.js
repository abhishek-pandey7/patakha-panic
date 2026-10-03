/** The skyline is deliberately built from independent bodies: remove a leg and gravity does the rest. */
export const CRACKERS = {
  rocket: { name: 'Rocket', color: '#ff586d', description: 'A precise little powerhouse. Tap in flight to boost through weak supports.', unlockLevel: 1 },
  sutli: { name: 'Sutli Bomb', color: '#64dba7', description: 'Big boom, big radius. Land beside a heavy building and let the blast do the work.', unlockLevel: 3 },
  chakri: { name: 'Chakri', color: '#39c8ef', description: 'A spinning spark storm. Roll along the street to sweep out ground-floor supports.', unlockLevel: 5 },
  ladi: { name: 'Ladi', color: '#ff7196', description: 'Seven little dhamakas in a row. Chain them through closely packed shopfronts.', unlockLevel: 6 },
};

const palettes = ['#f58ab6', '#68cbbd', '#eeb668', '#9485e3', '#75b6e5'];

function building({ x, width = 184, floors = 2, group = 0, color = palettes[group % palettes.length], support = 'wood', heavy = false, tank = false, baseHeight = 78 }) {
  const pieces = [];
  const legX = width / 2 - 17;
  const baseY = 650 - baseHeight / 2;
  const slabY = 650 - baseHeight - 7;
  const add = (values) => pieces.push({ group, color, weak: false, ...values });
  add({ x: x - legX, y: baseY, w: 22, h: baseHeight, material: support, kind: 'support', weak: true });
  add({ x: x + legX, y: baseY, w: 22, h: baseHeight, material: support, kind: 'support', weak: !heavy });
  add({ x, y: slabY, w: width + 12, h: 14, material: heavy ? 'concrete' : 'wood', kind: 'slab' });
  const wallH = 46;
  let lastTop = slabY - 7;
  for (let floor = 0; floor < floors; floor++) {
    const centerY = lastTop - wallH / 2;
    const wallW = (width - 7) / 2;
    add({ x: x - (wallW + 1) / 2, y: centerY, w: wallW, h: wallH, material: heavy && floor === 0 ? 'concrete' : 'brick', kind: 'wall' });
    add({ x: x + (wallW + 1) / 2, y: centerY, w: wallW, h: wallH, material: 'brick', kind: 'wall' });
    lastTop -= wallH;
    if (floor < floors - 1) {
      add({ x, y: lastTop - 5, w: width + 8, h: 10, material: heavy ? 'concrete' : 'wood', kind: 'slab' });
      lastTop -= 10;
    }
  }
  add({ x, y: lastTop - 7, w: width + 20, h: 14, material: heavy ? 'concrete' : 'wood', kind: 'roof' });
  if (tank) {
    add({ x: x + width * .19, y: lastTop - 41, w: 57, h: 54, material: 'metal', kind: 'tank', color: '#547b97' });
  }
  return pieces;
}

const level = (id, name, location, hint, shots, par, types, pieces) => ({ id, name, location, hint, shots, par, unlockedTypes: types, pieces });
const R = ['rocket'];
const RS = ['rocket', 'sutli'];
const RSC = ['rocket', 'sutli', 'chakri'];
const ALL = ['rocket', 'sutli', 'chakri', 'ladi'];

export const LEVELS = [
  level(1, 'First Spark', 'Gully Warm-Up', 'That striped wooden leg is carrying the whole house. Aim low, then tap to boost!', 3, 1, R,
    building({ x: 962, width: 190, floors: 2, group: 0 })),
  level(2, 'Good Neighbours', 'Gully Warm-Up', 'Catch the left support. Falling roofs make excellent neighbours.', 3, 2, R, [
    ...building({ x: 854, width: 142, floors: 2, group: 1, baseHeight: 72 }),
    ...building({ x: 1060, width: 170, floors: 2, group: 2, baseHeight: 82 }),
  ]),
  level(3, 'Tank You Very Much', 'Terrace Trouble', 'The water tank adds weight up top. A Sutli Bomb beside the base makes gravity your teammate.', 3, 1, RS,
    building({ x: 1012, width: 220, floors: 4, group: 3, tank: true, heavy: true, baseHeight: 82 })),
  level(4, 'Balcony Dominoes', 'Terrace Trouble', 'Drop the tall terrace toward the little house. Two buildings, one glorious collapse.', 4, 2, RS, [
    ...building({ x: 903, width: 174, floors: 4, group: 0, tank: true, baseHeight: 88 }),
    ...building({ x: 1135, width: 160, floors: 2, group: 1, heavy: true }),
  ]),
  level(5, 'Shop, Drop & Roll', 'Bazaar Blast', 'Try a low Chakri shot. The open shopfronts share a very flammable weak point.', 4, 2, RSC, [
    ...building({ x: 818, width: 132, floors: 2, group: 2, baseHeight: 68 }),
    ...building({ x: 996, width: 140, floors: 2, group: 0, baseHeight: 68 }),
    ...building({ x: 1178, width: 146, floors: 2, group: 1, baseHeight: 68 }),
  ]),
  level(6, 'Chain Reaction', 'Bazaar Blast', 'Send a Ladi into the first shop. Its seven pops move right through the bazaar.', 4, 2, ALL, [
    ...building({ x: 827, width: 144, floors: 3, group: 0, baseHeight: 70 }),
    ...building({ x: 1006, width: 144, floors: 2, group: 4, baseHeight: 70 }),
    ...building({ x: 1185, width: 144, floors: 3, group: 2, tank: true, baseHeight: 70 }),
  ]),
  { ...level(7, 'Bridge over Boom', 'Skyline Showdown', 'Lob over the stone gateway, then break the timber legs. The shared terrace carries the chain reaction.', 5, 3, ALL, [
    ...building({ x: 886, width: 176, floors: 4, group: 1, tank: true, heavy: true, baseHeight: 88 }),
    ...building({ x: 1165, width: 182, floors: 4, group: 3, tank: true, heavy: true, baseHeight: 88 }),
    { x: 1024, y: 313, w: 126, h: 14, material: 'wood', kind: 'slab', group: 1, color: palettes[1], weak: true },
  ]), obstacles: [{ x: 660, y: 560, w: 44, h: 180, material: 'concrete', kind: 'obstacle', color: '#d7a779' }] },
  { ...level(8, 'The Grand Dhamaka', 'Skyline Showdown', 'Clear the high gateway, choose your cracker, and turn three towers into one glorious Diwali finale.', 5, 3, ALL, [
    ...building({ x: 814, width: 128, floors: 3, group: 2, tank: true, baseHeight: 82 }),
    ...building({ x: 1007, width: 196, floors: 5, group: 0, tank: true, heavy: true, baseHeight: 86 }),
    ...building({ x: 1230, width: 150, floors: 4, group: 4, tank: true, heavy: true, baseHeight: 82 }),
  ]), obstacles: [{ x: 700, y: 548, w: 52, h: 204, material: 'concrete', kind: 'obstacle', color: '#d7a779' }] },
];
