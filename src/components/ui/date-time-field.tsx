"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}
function localValue(day: Date, hour: number, minute: number) {
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:${pad(minute)}`;
}

export function DateTimeField({
  id,
  label,
  value,
  onValueChange,
  min,
  required,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  required?: boolean;
  className?: string;
}) {
  const initial = value ? new Date(value) : new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const [day, setDay] = useState(
    () =>
      new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()),
  );
  const [hour, setHour] = useState(() => (value ? initial.getHours() : 9));
  const [minute, setMinute] = useState(() =>
    value ? initial.getMinutes() : 0,
  );
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(month.getFullYear(), month.getMonth(), index - offset + 1),
  );
  function apply() {
    const next = localValue(day, hour, minute);
    if (min && next < min) {
      setError("Choose a time after the borrow date.");
      return;
    }
    setError("");
    onValueChange(next);
    setOpen(false);
  }
  return (
    <div ref={root} className="relative">
      <input
        id={id}
        aria-label={label}
        type="datetime-local"
        required={required}
        min={min}
        className={`ui-input date-time-input pr-12 ${className}`}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={`Choose ${label.toLowerCase()}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (value) {
            const selected = new Date(value);
            setDay(selected);
            setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
            setHour(selected.getHours());
            setMinute(selected.getMinutes());
          }
          setOpen((current) => !current);
        }}
        className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-[#426047] hover:bg-[#edf4e9]"
      >
        <CalendarDays size={19} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(330px,calc(100vw-48px))] rounded-[15px] border border-[#d7e4d4] bg-[#fffef9] p-4 shadow-[0_18px_50px_rgba(28,55,32,.17)]"
        >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm text-[#243e2a]">
              {month.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous month"
                className="grid size-9 place-items-center rounded-lg hover:bg-[#edf4e9]"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                className="grid size-9 place-items-center rounded-lg hover:bg-[#edf4e9]"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-[#607262]">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((name) => (
              <span key={name} className="py-1">
                {name}
              </span>
            ))}
            {days.map((date) => {
              const selected = date.toDateString() === day.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  aria-label={date.toLocaleDateString(undefined, {
                    dateStyle: "full",
                  })}
                  aria-pressed={selected}
                  onClick={() => {
                    setDay(date);
                    if (date.getMonth() !== month.getMonth())
                      setMonth(
                        new Date(date.getFullYear(), date.getMonth(), 1),
                      );
                  }}
                  className={`grid size-9 place-items-center rounded-lg text-sm ${selected ? "bg-[#2e4027] text-white" : date.getMonth() === month.getMonth() ? "text-[#263d2c] hover:bg-[#edf4e9]" : "text-[#89988a] hover:bg-[#edf4e9]"}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-[#e5ece4] pt-4">
            <label
              className="text-xs font-semibold text-[#526b59]"
              htmlFor={`${id}-hour`}
            >
              Time
            </label>
            <input
              id={`${id}-hour`}
              aria-label={`${label} hour`}
              className="ui-input w-16 text-center"
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(event) =>
                setHour(Math.min(23, Math.max(0, Number(event.target.value))))
              }
            />
            <span>:</span>
            <input
              aria-label={`${label} minute`}
              className="ui-input w-16 text-center"
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(event) =>
                setMinute(Math.min(59, Math.max(0, Number(event.target.value))))
              }
            />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            className="ui-button-primary mt-4 w-full"
            onClick={apply}
          >
            Set date and time
          </button>
        </div>
      )}
    </div>
  );
}
