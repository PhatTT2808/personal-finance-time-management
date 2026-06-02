"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TIME_BLOCK_TYPE_LABELS } from "@/lib/constants";
import { formatTime, hoursBetween, formatHours } from "@/lib/format";
import type { TimeBlock } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeBlockDialog } from "@/components/time-blocks/time-block-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";

export function TimeBlockItem({ block }: { block: TimeBlock }) {
  const hours = hoursBetween(
    formatTime(block.start_time),
    formatTime(block.end_time)
  );

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{block.title}</p>
          <Badge variant="secondary">
            {TIME_BLOCK_TYPE_LABELS[block.type]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatTime(block.start_time)} - {formatTime(block.end_time)} (
          {formatHours(hours)} giờ)
        </p>
        {block.note && (
          <p className="truncate text-sm text-muted-foreground">{block.note}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <TimeBlockDialog
          timeBlock={block}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Sửa">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
        <ConfirmDelete
          table="time_blocks"
          id={block.id}
          description="Bạn có chắc chắn muốn xóa khối thời gian này không?"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Xóa"
              className="text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
