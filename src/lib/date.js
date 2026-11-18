export function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

export function toISODate(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function todayISO() {
  return toISODate(new Date());
}

export function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return "c" + Date.now() + Math.random().toString(16).slice(2);
  }
}

export function formatShort(iso) {
  const parts = iso.split("-");
  return parseInt(parts[1], 10) + "월 " + parseInt(parts[2], 10) + "일";
}

export function dueMeta(due, columnId) {
  if (!due) return null;
  if (columnId === "done") return { label: formatShort(due), cls: "done" };
  const diff = Math.round(
    (new Date(due + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 86400000
  );
  if (diff < 0) return { label: Math.abs(diff) + "일 지남", cls: "overdue" };
  if (diff === 0) return { label: "오늘 마감", cls: "soon" };
  if (diff === 1) return { label: "내일 마감", cls: "soon" };
  return { label: "D-" + diff, cls: "normal" };
}
