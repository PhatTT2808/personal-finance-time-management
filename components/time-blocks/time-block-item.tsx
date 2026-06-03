"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TIME_BLOCK_TYPE_LABELS } from "@/lib/constants";
import { formatTime, hoursBetween, formatHours } from "@/lib/format";
import type { TimeBlock } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeBlockDialog } from "@/components/time-blocks/time-block-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";

type Props = {
  block: TimeBlock;
  onSaved?: (block: TimeBlock) => void;
  onDeleted?: (id: string) => void;
};

export function TimeBlockItem({ block, onSaved, onDeleted }: Props) {
  const hours = hoursBetween(
    formatTime(block.start_time),
    formatTime(block.end_time)
  );
  const typeLabel =
    block.type === "other" && block.custom_type?.trim()
      ? block.custom_type.trim()
      : TIME_BLOCK_TYPE_LABELS[block.type];

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 shadow-lg shadow-black/10 transition hover:border-sky-300/20 hover:bg-white/[0.055]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-100">{block.title}</p>
          <Badge variant="secondary" className="border border-sky-300/20 bg-sky-400/10 text-sky-300">
            {typeLabel}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {formatTime(block.start_time)} - {formatTime(block.end_time)} (
          {formatHours(hours)} giờ)
        </p>
        {block.note && (
          <p className="truncate text-sm text-slate-500">{block.note}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <TimeBlockDialog
          timeBlock={block}
          onSaved={onSaved}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Sửa" className="text-slate-400 hover:bg-white/10 hover:text-sky-200">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
        <ConfirmDelete
          table="time_blocks"
          id={block.id}
          onDeleted={() => onDeleted?.(block.id)}
          description="Bạn có chắc chắn muốn xóa khối thời gian này không?"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Xóa"
              className="text-red-300 hover:bg-red-400/10 hover:text-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
