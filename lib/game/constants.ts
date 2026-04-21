import type { ShipDefinition } from "@/lib/game/types";

export const BOARD_SIZE = 10;

export const FLEET: ShipDefinition[] = [
  { key: "carrier", label: "Traeger", length: 5 },
  { key: "battleship", label: "Schlachtschiff", length: 4 },
  { key: "cruiser", label: "Kreuzer", length: 3 },
  { key: "submarine", label: "U-Boot", length: 3 },
  { key: "destroyer", label: "Zerstoerer", length: 2 },
];
