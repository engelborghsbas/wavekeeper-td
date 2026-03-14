/**
 * Centrale mapconfiguratie voor alle speelkaarten.
 * Coördinaten worden als ratios opgeslagen zodat ze correct schalen
 * binnen het speelveld van 75% van de canvasbreedte.
 */
export const MAP_CONFIGS = [
  {
    id: 'forest',
    name: 'Forest',
    backgroundColor: '#1a3d1a',
    pathColor: '#5c3d1e',
    pathPoints: [
      { x: 0.06, y: 0.62 },
      { x: 0.18, y: 0.62 },
      { x: 0.18, y: 0.24 },
      { x: 0.36, y: 0.24 },
      { x: 0.36, y: 0.78 },
      { x: 0.58, y: 0.78 },
      { x: 0.58, y: 0.38 },
      { x: 0.92, y: 0.38 },
    ],
    towerSpots: [
      { x: 0.12, y: 0.42 },
      { x: 0.28, y: 0.66 },
      { x: 0.28, y: 0.12 },
      { x: 0.46, y: 0.50 },
      { x: 0.48, y: 0.88 },
      { x: 0.66, y: 0.64 },
      { x: 0.70, y: 0.22 },
      { x: 0.84, y: 0.56 },
    ],
    unlocksAfterLevel: 0,
    mapBonus: null,
  },
  {
    id: 'desert',
    name: 'Desert',
    backgroundColor: '#c2a05a',
    pathColor: '#8b5e1a',
    pathPoints: [
      { x: 0.10, y: 0.16 },
      { x: 0.10, y: 0.80 },
      { x: 0.38, y: 0.80 },
      { x: 0.38, y: 0.28 },
      { x: 0.76, y: 0.28 },
      { x: 0.76, y: 0.72 },
    ],
    towerSpots: [
      { x: 0.20, y: 0.14 },
      { x: 0.22, y: 0.40 },
      { x: 0.22, y: 0.66 },
      { x: 0.28, y: 0.90 },
      { x: 0.48, y: 0.68 },
      { x: 0.50, y: 0.14 },
      { x: 0.62, y: 0.46 },
      { x: 0.72, y: 0.12 },
      { x: 0.86, y: 0.42 },
      { x: 0.86, y: 0.82 },
    ],
    unlocksAfterLevel: 5,
    mapBonus: {
      type: 'speedMultiplier',
      value: 1.1,
      label: '⚡ Enemies +10% snelheid',
    },
  },
  {
    id: 'volcano',
    name: 'Volcano',
    backgroundColor: '#1a0a00',
    pathColor: '#cc3300',
    pathPoints: [
      { x: 0.08, y: 0.12 },
      { x: 0.88, y: 0.12 },
      { x: 0.88, y: 0.84 },
      { x: 0.18, y: 0.84 },
      { x: 0.18, y: 0.24 },
      { x: 0.74, y: 0.24 },
      { x: 0.74, y: 0.70 },
      { x: 0.32, y: 0.70 },
      { x: 0.32, y: 0.38 },
      { x: 0.56, y: 0.38 },
    ],
    towerSpots: [
      { x: 0.14, y: 0.28 },
      { x: 0.28, y: 0.08 },
      { x: 0.52, y: 0.18 },
      { x: 0.82, y: 0.26 },
      { x: 0.82, y: 0.62 },
      { x: 0.42, y: 0.80 },
      { x: 0.42, y: 0.54 },
    ],
    unlocksAfterLevel: 10,
    mapBonus: {
      type: 'healthBonus',
      value: 20,
      label: '🔥 Enemies +20 HP',
    },
  },
];

/**
 * Geeft een mapconfig terug op basis van id.
 * @param {string} mapId - Interne map id.
 * @returns {object} Matchende mapconfig.
 */
export function getMapConfigById(mapId) {
  return MAP_CONFIGS.find((map) => map.id === mapId) ?? MAP_CONFIGS[0];
}

/**
 * Bepaalt welke map actief hoort te zijn voor een level.
 * Level 1-5 = forest, 6-10 = desert, 11+ = volcano.
 * @param {number} level - Huidig level.
 * @returns {string} Actieve map id.
 */
export function getMapIdForLevel(level) {
  if (level >= 11) {
    return 'volcano';
  }

  if (level >= 6) {
    return 'desert';
  }

  return 'forest';
}

/**
 * Zet ratio-based mapcoördinaten om naar echte pixels
 * voor het actuele speelveldformaat.
 * @param {string} mapId - Interne map id.
 * @param {number} fieldWidth - Breedte van het speelveld.
 * @param {number} fieldHeight - Hoogte van het speelveld.
 * @returns {object} Runtime mapconfig met pixelcoördinaten.
 */
export function buildRuntimeMapConfig(mapId, fieldWidth, fieldHeight) {
  const baseConfig = getMapConfigById(mapId);

  return {
    ...baseConfig,
    pathPoints: baseConfig.pathPoints.map((point) => ({
      x: Math.round(point.x * fieldWidth),
      y: Math.round(point.y * fieldHeight),
    })),
    towerSpots: baseConfig.towerSpots.map((spot) => ({
      x: Math.round(spot.x * fieldWidth),
      y: Math.round(spot.y * fieldHeight),
      occupied: false,
      marker: null,
      inner: null,
      hitArea: null,
    })),
  };
}