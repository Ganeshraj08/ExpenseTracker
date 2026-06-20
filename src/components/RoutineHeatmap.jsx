import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export function RoutineHeatmap({ routines }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set();
    years.add(new Date().getFullYear()); // always include current year
    
    if (routines) {
      routines.forEach((routine) => {
        if (routine.createdAt) {
          years.add(new Date(routine.createdAt).getFullYear());
        }
        if (routine.lastExecuted) {
          years.add(new Date(routine.lastExecuted).getFullYear());
        }
        if (routine.history) {
          routine.history.forEach((dateStr) => {
            const y = parseInt(dateStr.split("-")[0]);
            if (!isNaN(y)) years.add(y);
          });
        }
      });
    }
    
    return Array.from(years).sort((a, b) => b - a); // descending order
  }, [routines]);

  const heatmapData = useMemo(() => {
    // Build a map of dates to routine log counts
    const dateMap = {};

    if (routines) {
      routines.forEach((routine) => {
        const logs = routine.history || [];
        const uniqueLogs = new Set(logs);
        if (routine.lastExecuted) {
          uniqueLogs.add(routine.lastExecuted);
        }
        uniqueLogs.forEach((dateStr) => {
          dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
        });
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);

    // Generate weeks starting from Sunday of the first week of the year
    const weeks = [];
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      if (currentDate > endDate && currentDate.getDay() === 0) {
        break;
      }

      const week = [];
      for (let d = 0; d < 7; d++) {
        const inYear = currentDate.getFullYear() === selectedYear;
        const dateStr = currentDate.toLocaleDateString("en-CA");
        const count = inYear ? (dateMap[dateStr] || 0) : 0;
        week.push({
          date: new Date(currentDate),
          dateStr,
          count,
          inYear,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }

    // Calculate stats in the selected year
    const loggedDatesInYear = Object.keys(dateMap).filter((dateStr) => {
      const year = parseInt(dateStr.split("-")[0]);
      return year === selectedYear;
    });

    const maxCount = Math.max(
      ...Object.entries(dateMap)
        .filter(([dateStr]) => parseInt(dateStr.split("-")[0]) === selectedYear)
        .map(([, count]) => count),
      0
    );

    // Calculate current streak in selected year
    let currentStreak = 0;
    let checkDate;
    if (selectedYear === today.getFullYear()) {
      checkDate = new Date(today);
    } else {
      checkDate = new Date(selectedYear, 11, 31);
    }

    // Streak is active if logged today OR logged yesterday (since today is not over yet)
    let isStreakActive = false;
    const todayStr = today.toLocaleDateString("en-CA");
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA");

    if (selectedYear === today.getFullYear()) {
      if (dateMap[todayStr] || dateMap[yesterdayStr]) {
        isStreakActive = true;
      }
    } else {
      const lastDayStr = new Date(selectedYear, 11, 31).toLocaleDateString("en-CA");
      if (dateMap[lastDayStr]) {
        isStreakActive = true;
      }
    }

    if (isStreakActive) {
      if (selectedYear === today.getFullYear() && !dateMap[todayStr]) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (checkDate.getFullYear() === selectedYear) {
        const dateStr = checkDate.toLocaleDateString("en-CA");
        if (dateMap[dateStr]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate best streak in selected year
    let bestStreak = 0;
    let tempStreak = 0;
    checkDate = new Date(selectedYear, 0, 1);
    while (checkDate.getFullYear() === selectedYear) {
      const dateStr = checkDate.toLocaleDateString("en-CA");
      if (dateMap[dateStr]) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthLabels = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIdx) => {
      const dayInYear = week.find((d) => d.inYear);
      if (dayInYear) {
        const m = dayInYear.date.getMonth();
        if (m !== lastMonth) {
          monthLabels.push({
            index: weekIdx,
            name: monthNames[m],
          });
          lastMonth = m;
        }
      }
    });

    return {
      weeks,
      monthLabels,
      maxCount,
      allDates: loggedDatesInYear,
      currentStreak,
      bestStreak,
      totalLogged: loggedDatesInYear.length,
    };
  }, [routines, selectedYear]);

  const getIntensityColor = (count, maxCount) => {
    if (count === 0) return "bg-slate-200 dark:bg-slate-800";
    if (maxCount === 0) return "bg-slate-200 dark:bg-slate-800";

    const intensity = count / maxCount;
    if (intensity < 0.25) return "bg-indigo-300 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-100";
    if (intensity < 0.5) return "bg-indigo-400 dark:bg-indigo-800 text-white";
    if (intensity < 0.75) return "bg-indigo-500 dark:bg-indigo-600 text-white";
    return "bg-indigo-700 dark:bg-indigo-400 text-white";
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Routines
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {heatmapData.totalLogged}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              logged days ({selectedYear})
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Streak
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {heatmapData.currentStreak}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              days ({selectedYear})
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Best Streak
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {heatmapData.bestStreak}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              days ({selectedYear})
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Max Routines
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {heatmapData.maxCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              per day ({selectedYear})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Routine Activity Heatmap</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-6">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "fit-content" }}>
            
            {/* Grid */}
            <div style={{ display: "flex", gap: "4px" }}>
              {/* Day labels column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  paddingTop: "20px", // Align with grid starting below month labels (20px)
                  marginRight: "4px",
                }}
              >
                {dayLabels.map((day, idx) => (
                  <div
                    key={`day-${idx}`}
                    style={{
                      width: "12px",
                      height: "12px",
                      fontSize: "9px",
                      fontWeight: "500",
                      color: "rgb(148, 163, 184)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: "12px",
                    }}
                  >
                    {idx % 2 === 1 ? day : ""}
                  </div>
                ))}
              </div>

              {/* Month labels + Week columns container */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {/* Month labels row */}
                <div style={{ position: "relative", height: "20px" }}>
                  {heatmapData.monthLabels.map((lbl, idx) => (
                    <div
                      key={`lbl-${idx}`}
                      style={{
                        position: "absolute",
                        left: `${lbl.index * 16}px`, // 12px cell + 4px gap
                        fontSize: "11px",
                        fontWeight: "500",
                        color: "rgb(148, 163, 184)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lbl.name}
                    </div>
                  ))}
                </div>

                {/* Week columns container */}
                <div style={{ display: "flex", gap: "4px" }}>
                  {heatmapData.weeks.map((week, weekIdx) => (
                    <div
                      key={`week-${weekIdx}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {week.map((day, dayIdx) => (
                        <div
                          key={`cell-${weekIdx}-${dayIdx}`}
                          className={`rounded transition-all ${
                            day.inYear
                              ? `cursor-pointer hover:ring-1 hover:ring-indigo-300 dark:hover:ring-indigo-500 ${getIntensityColor(
                                  day.count,
                                  heatmapData.maxCount
                                )}`
                              : "bg-transparent pointer-events-none"
                          }`}
                          style={{
                            width: "12px",
                            height: "12px",
                            visibility: day.inYear ? "visible" : "hidden",
                          }}
                          title={day.inYear ? `${day.dateStr}: ${day.count} routine${day.count !== 1 ? "s" : ""}` : ""}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "6px",
                marginTop: "8px",
                alignItems: "center",
                fontSize: "11px",
                paddingRight: "16px",
              }}
            >
              <span style={{ color: "rgb(148, 163, 184)" }}>Less</span>
              <div
                className="bg-slate-200 dark:bg-slate-800"
                style={{ width: "12px", height: "12px", borderRadius: "2px" }}
              />
              <div
                className="bg-indigo-300 dark:bg-indigo-950"
                style={{ width: "12px", height: "12px", borderRadius: "2px" }}
              />
              <div
                className="bg-indigo-500 dark:bg-indigo-600"
                style={{ width: "12px", height: "12px", borderRadius: "2px" }}
              />
              <div
                className="bg-indigo-700 dark:bg-indigo-400"
                style={{ width: "12px", height: "12px", borderRadius: "2px" }}
              />
              <span style={{ color: "rgb(148, 163, 184)" }}>More</span>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
