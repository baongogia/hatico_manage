"use client";

import { useEffect, useMemo, useState } from "react";

interface DatePickerModalProps {
  open: boolean;
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
  title?: string;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function parseDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month: month - 1, day };
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplay(dateStr: string) {
  const { year, month, day } = parseDate(dateStr);
  return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
}

export function formatDateButtonLabel(dateStr: string) {
  return formatDisplay(dateStr);
}

export default function DatePickerModal({
  open,
  value,
  onClose,
  onSelect,
  title = "Chọn ngày báo cáo",
}: DatePickerModalProps) {
  const initial = parseDate(value);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [pendingDate, setPendingDate] = useState(value);

  useEffect(() => {
    if (!open) return;
    const parsed = parseDate(value);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setPendingDate(value);
  }, [open, value]);

  const todayStr = new Date().toISOString().split("T")[0];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { day: number; month: number; year: number; currentMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const month = viewMonth - 1;
      const year = month < 0 ? viewYear - 1 : viewYear;
      cells.push({ day, month: (month + 12) % 12, year, currentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, month: viewMonth, year: viewYear, currentMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const day = cells.length - startOffset - daysInMonth + 1;
      const month = viewMonth + 1;
      const year = month > 11 ? viewYear + 1 : viewYear;
      cells.push({ day, month: month % 12, year, currentMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleConfirm = () => {
    onSelect(pendingDate);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-5 animate-slide-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            <p className="text-slate-400 text-xs mt-1">Chọn ngày để xem báo cáo công việc</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goPrevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
              aria-label="Tháng trước"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">{MONTHS[viewMonth]}</p>
              <p className="text-xs text-slate-400">{viewYear}</p>
            </div>

            <button
              onClick={goNextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
              aria-label="Tháng sau"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-[10px] font-bold text-slate-400 text-center py-1">
                {day}
              </div>
            ))}

            {calendarDays.map((cell, idx) => {
              const dateStr = toDateString(cell.year, cell.month, cell.day);
              const isSelected = pendingDate === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={`${dateStr}-${idx}`}
                  onClick={() => setPendingDate(dateStr)}
                  className={`aspect-square rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white shadow-md scale-105"
                      : isToday
                        ? "bg-white text-primary ring-2 ring-primary/20"
                        : cell.currentMonth
                          ? "bg-white text-slate-700 hover:bg-slate-100"
                          : "bg-transparent text-slate-300 hover:bg-white/60"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setPendingDate(todayStr);
              const parsed = parseDate(todayStr);
              setViewYear(parsed.year);
              setViewMonth(parsed.month);
            }}
            className="text-primary hover:text-primary-hover font-bold text-xs px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
          >
            Hôm nay
          </button>

          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Ngày đã chọn</p>
            <p className="text-sm font-bold text-slate-800">{formatDisplay(pendingDate)}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3 rounded-lg transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold text-sm py-3 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
