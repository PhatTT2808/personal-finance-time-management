export function isPlanningScopedMessage(message: string) {
  const normalized = normalizeVietnamese(message);
  const blockedPattern =
    /(code|coding|javascript|typescript|python|api|debug|bug|lap trinh|loi code|chinh tri|bau cu|thoi tiet|weather|the thao|bong da|trivia|random|joke|viet bai|lam van|giai bai tap|dịch|dich)/iu;
  const allowedPattern =
    /(todo|nhac|viec|deadline|han|lich|khoi thoi gian|thoi gian|tu\s+.+\s+den|den\s+\d|hom nay|ngay mai|toi nay|thu\s*[2-7]|chu nhat|hoc|lam viec|lam project|code project|gym|tap gym|truong|nghi|ngu)/iu;

  return allowedPattern.test(normalized) && !blockedPattern.test(normalized);
}

function normalizeVietnamese(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d");
}