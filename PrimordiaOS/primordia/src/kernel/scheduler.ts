import { realms } from "../realms";

export function scheduleRealms(cycle: number, revenue: number, depth: number) {
  const order = ["vision", "memory", "compute", "signal", "ubuntu"];

  order.forEach(realmName => {
    const realm = realms[realmName];

    if (realm.tick) {
      realm.tick(depth, revenue);
    }
  });

  return order;
}
