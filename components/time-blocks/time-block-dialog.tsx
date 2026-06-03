"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { TIME_BLOCK_TYPES, TIME_BLOCK_TYPE_LABELS } from "@/lib/constants";
import { todayISO, hoursBetween } from "@/lib/format";
import type { TimeBlock, TimeBlockType } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  timeBlock?: TimeBlock;
  trigger: React.ReactElement;
  onSaved?: (timeBlock: TimeBlock) => void;
  initialDate?: string;
};

const TIME_BLOCK_COLUMNS =
  "id, user_id, title, type, custom_type, start_time, end_time, block_date, note, created_at, updated_at";

export function TimeBlockDialog({
  timeBlock,
  trigger,
  onSaved,
  initialDate,
}: Props) {
  const isEdit = Boolean(timeBlock);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(timeBlock?.title ?? "");
  const [type, setType] = useState<TimeBlockType>(timeBlock?.type ?? "study");
  const [customType, setCustomType] = useState(timeBlock?.custom_type ?? "");
  const [startTime, setStartTime] = useState(
    timeBlock?.start_time?.slice(0, 5) ?? "08:00"
  );
  const [endTime, setEndTime] = useState(
    timeBlock?.end_time?.slice(0, 5) ?? "09:00"
  );
  const [blockDate, setBlockDate] = useState(
    timeBlock?.block_date ?? initialDate ?? todayISO()
  );
  const [note, setNote] = useState(timeBlock?.note ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề.");
      return;
    }
    if (hoursBetween(startTime, endTime) <= 0) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    if (type === "other" && !customType.trim()) {
      toast.error("Vui lòng nhập tên loại khác.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      title: title.trim(),
      type,
      custom_type: type === "other" ? customType.trim() : null,
      start_time: startTime,
      end_time: endTime,
      block_date: blockDate,
      note: note.trim() || null,
    };

    let savedBlock: TimeBlock | null = null;
    let error;
    if (isEdit && timeBlock) {
      const result = await supabase
        .from("time_blocks")
        .update(payload)
        .eq("id", timeBlock.id)
        .select(TIME_BLOCK_COLUMNS)
        .single();
      error = result.error;
      savedBlock = result.data as TimeBlock | null;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await supabase
        .from("time_blocks")
        .insert({ ...payload, user_id: user?.id })
        .select(TIME_BLOCK_COLUMNS)
        .single();
      error = result.error;
      savedBlock = result.data as TimeBlock | null;
    }

    setLoading(false);

    if (error) {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      return;
    }

    toast.success(isEdit ? "Đã cập nhật khối thời gian." : "Đã thêm khối thời gian.");
    if (savedBlock) {
      onSaved?.(savedBlock);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa khối thời gian" : "Thêm khối thời gian"}
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin khoảng thời gian của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Loại</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v as TimeBlockType) ?? "study")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIME_BLOCK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-type">Tên loại khác</Label>
              <Input
                id="custom-type"
                placeholder="Ví dụ: Đọc sách, Đi chợ, Làm project..."
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="block-date">Ngày</Label>
            <Input
              id="block-date"
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">Giờ bắt đầu</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Giờ kết thúc</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Tùy chọn"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
