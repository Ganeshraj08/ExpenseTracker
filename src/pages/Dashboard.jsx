import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { formatCurrency, formatDate } from "../utils/helpers";
import { ArrowUpRight, ArrowDownRight, IndianRupee, Wallet } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useAuth } from "../hooks/useAuth";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
  "#10b981",
];

const renderActiveShape = (props) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;

  return (
    <g className="transition-all duration-300">
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        className="text-sm font-bold fill-slate-900 dark:fill-slate-100"
      >
        {payload.name?.substring(0, 14)}
        {payload.name?.length > 14 ? "..." : ""}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        className="text-xs font-semibold fill-slate-600 dark:fill-slate-300"
      >
        {formatCurrency(value)}
      </text>
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
      >
        ({(percent * 100).toFixed(1)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        fill={fill}
      />
    </g>
  );
};

export function Dashboard() {
  const { expenses, loading } = useExpenses();
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading Dashboard...
      </div>
    );
  if (!user)
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Welcome! Please sign in to view your dashboard.
      </div>
    );

  const totalIncome = expenses
    .filter((e) => e.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses
    .filter((e) => e.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const recentTransactions = expenses.slice(0, 4);

  // Group by category for the pie chart
  const categoryMap = expenses
    .filter((e) => e.type === "expense")
    .reduce((acc, curr) => {
      // use primary parent group
      const parent = curr.category?.split(":")[0]?.trim() || "General";
      acc[parent] = (acc[parent] || 0) + curr.amount;
      return acc;
    }, {});

  const pieData = Object.keys(categoryMap)
    .map((key) => ({
      name: key,
      value: categoryMap[key],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-primary text-white border-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-100 mb-1">
                  Total Balance
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold">
                  {formatCurrency(totalBalance)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Total Income
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalIncome)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Total Expenses
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalExpense)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="col-span-1 lg:col-span-2 flex flex-col">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No recent transactions.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex gap-3 sm:gap-4 items-center">
                      <div
                        className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${tx.type === "expense" ? "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400" : "bg-green-50 dark:bg-green-500/10 text-green-500 dark:text-green-400"}`}
                      >
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
                          {tx.description}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(tx.date)} •{" "}
                          <span className="truncate inline-block max-w-[80px] sm:max-w-none align-bottom">
                            {tx.category}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm sm:text-base font-semibold shrink-0 ${tx.type === "expense" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                    >
                      {tx.type === "expense" ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              Expense Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
            {pieData.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-slate-300 mb-2" />
                <p className="text-xs sm:text-sm">No expense data</p>
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mb-2 text-xs text-slate-500 pb-2">
                  Hover to view values
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
