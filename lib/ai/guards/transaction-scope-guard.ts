const ALLOWED_TRANSACTION_PATTERN =
  /(\b|^)(chi|tiêu|mua|ăn|uống|trả|đóng|thanh toán|thu|nhận|lương|shipper|freelance|học bổng|phụ cấp|k|nghìn|ngàn|triệu|tr)(\b|$)|[+-]\s*\d|\d+([.,]\d+)?\s*(k|nghìn|ngàn|triệu|tr)\b/iu;

const BLOCKED_TOPIC_PATTERN =
  /(code|coding|javascript|typescript|python|sql|api|bug|lỗi code|thời tiết|weather|chính trị|bầu cử|tin tức|viết bài|dịch|random|joke|truyện|phim)/iu;

export function isTransactionScopedMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  return (
    ALLOWED_TRANSACTION_PATTERN.test(normalized) &&
    !BLOCKED_TOPIC_PATTERN.test(normalized)
  );
}
