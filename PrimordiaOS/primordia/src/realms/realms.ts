// PrimordiaOS Realm Definitions

export type RealmName =
  | "vision"
  | "compute"
  | "memory"
  | "signal";

export interface RealmRoute {
  realm: RealmName;
  weight: number;
}

export function getRealmRoutes(revenue: number) {
  return [
    { realm: "vision", weight: revenue * 0.15 },
    { realm: "compute", weight: revenue * 0.25 },
    { realm: "memory", weight: revenue * 0.35 },
    { realm: "signal", weight: revenue * 0.25 }
  ];
}
