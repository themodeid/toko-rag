export interface OrderDateGroup<T = any> {
  dateKey: string;
  title: string;
  formattedDate: string;
  orders: T[];
  totalOrders: number;
  totalOmset: number;
}

export function groupOrdersByDate<T extends { created_at: string; total_bayar?: number; total_amount?: number }>(
  orders: T[]
): OrderDateGroup<T>[] {
  const groupsMap = new Map<string, { title: string; formattedDate: string; orders: T[]; totalOmset: number }>();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  for (const order of orders) {
    if (!order.created_at) continue;
    const d = new Date(order.created_at);
    if (isNaN(d.getTime())) continue;

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const amount = Number(order.total_amount ?? order.total_bayar ?? 0);

    if (!groupsMap.has(dateKey)) {
      let title = "";
      if (dateKey === todayStr) {
        title = "HARI INI";
      } else if (dateKey === yesterdayStr) {
        title = "KEMARIN";
      } else {
        title = new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(d);
      }

      const formattedDate = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);

      groupsMap.set(dateKey, {
        title,
        formattedDate,
        orders: [],
        totalOmset: 0,
      });
    }

    const group = groupsMap.get(dateKey)!;
    group.orders.push(order);
    group.totalOmset += amount;
  }

  // Sort descending by dateKey (newest date first)
  const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const grp = groupsMap.get(key)!;
    return {
      dateKey: key,
      title: grp.title,
      formattedDate: grp.formattedDate,
      orders: grp.orders,
      totalOrders: grp.orders.length,
      totalOmset: grp.totalOmset,
    };
  });
}
