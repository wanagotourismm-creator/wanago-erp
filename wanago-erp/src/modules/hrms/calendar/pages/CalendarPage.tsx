"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHrCalendar } from "@/modules/hrms/calendar/hooks/useHrCalendar";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils/helpers";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MAX_DOTS = 3;

function formatKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function CalendarPage() {
  const { loading, eventsByDate } = useHrCalendar();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { firstDayOfWeek, daysInMonth } = useMemo(() => ({
    firstDayOfWeek: new Date(year, month, 1).getDay(),
    daysInMonth:    new Date(year, month + 1, 0).getDate(),
  }), [year, month]);

  function goToPrevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" description="Leaves and reviews at a glance" />

      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={goToPrevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-foreground">
                {MONTH_NAMES[month]} {year}
              </p>
              <button
                onClick={goToNextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1 text-center text-xs font-medium text-muted-foreground">
                  {wd}
                </div>
              ))}

              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = formatKey(year, month, day);
                const dayEvents = eventsByDate.get(key);
                const isSelected = selectedDate === key;
                const dots = dayEvents
                  ? [
                      ...dayEvents.leaves.map(() => "leave" as const),
                      ...dayEvents.reviews.map(() => "review" as const),
                    ]
                  : [];

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "flex min-h-[64px] flex-col items-center rounded-xl border border-border bg-card px-1 py-1.5 text-left transition-all hover:border-primary/40",
                      isSelected && "border-primary/60 bg-primary/5"
                    )}
                  >
                    <span className="text-xs font-medium text-foreground">{day}</span>
                    {dots.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
                        {dots.slice(0, MAX_DOTS).map((type, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              type === "leave" ? "bg-blue-500" : "bg-violet-500"
                            )}
                          />
                        ))}
                        {dots.length > MAX_DOTS && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dots.length - MAX_DOTS}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-2 text-sm font-semibold text-foreground">
                {selectedDate ?? "No date selected"}
              </p>
              {!selectedDate || (!selectedEvents?.leaves.length && !selectedEvents?.reviews.length) ? (
                <p className="text-sm text-muted-foreground">No events</p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedEvents?.leaves.map((leave) => (
                    <li key={leave.id} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      {leave.employeeName} — {leave.leaveType} leave
                    </li>
                  ))}
                  {selectedEvents?.reviews.map((review) => (
                    <li key={review.id} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />
                      {review.employeeName} — {review.reviewType} review
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
