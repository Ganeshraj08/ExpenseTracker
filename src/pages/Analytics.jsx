import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Sector } from 'recharts';
import { useExpenses } from "../context/ExpenseContext";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/helpers";
import { Clock, TrendingDown, Target, ArrowLeft, Zap, Award, Flame } from "lucide-react";

const COLORS = ['#2563eb', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#10b981', '#f43f5e', '#14b8a6', '#f97316'];

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g className="transition-all duration-300" style={{ outline: 'none' }}>
      <text x={cx} y={cy - 12} textAnchor="middle" className="text-sm font-bold fill-slate-900 dark:fill-slate-100 pointer-events-none">
        {payload.name?.substring(0, 14)}{payload.name?.length > 14 ? '...' : ''}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="text-xs font-semibold fill-slate-600 dark:fill-slate-300 pointer-events-none">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500 pointer-events-none">
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
        className="cursor-pointer"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        fill={fill}
        className="cursor-pointer"
      />
    </g>
  );
};

export function Analytics() {
  const { expenses, loading } = useExpenses();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredExpenses = useMemo(() => {
    if (timeframe === 'all') return expenses;
    const now = new Date();
    return expenses.filter(e => {
       const d = new Date(e.date);
       if (timeframe === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
       }
       if (timeframe === '7days') {
          const diffTime = Math.abs(now - d);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          return diffDays <= 7;
       }
       return true;
    });
  }, [expenses, timeframe]);

  const categoryFilteredExpenses = useMemo(() => {
     if (!selectedCategory) return filteredExpenses;
     return filteredExpenses.filter(e => {
        const parent = e.category.split(':')[0].trim();
        return parent === selectedCategory;
     });
  }, [filteredExpenses, selectedCategory]);

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Analytics...</div>;
  if (!user) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Sign in to view your analytics.</div>;

  const totalExpense = categoryFilteredExpenses.filter(e => e.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncome = categoryFilteredExpenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  
  let daysInPeriod = 1;
  if(timeframe === '7days') daysInPeriod = 7;
  else if (timeframe === 'month') daysInPeriod = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  else if (expenses.length > 0) {
     const earliest = new Date(expenses[expenses.length-1].date);
     const diff = new Date() - earliest;
     daysInPeriod = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  
  const avgDailySpend = totalExpense / daysInPeriod;
  const burnRate = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  // Insights
  const { pieData, topSpender, frequentSpender } = useMemo(() => {
     const map = {};
     const counts = {};
     
     categoryFilteredExpenses.filter(e => e.type === 'expense').forEach(e => {
         const parts = e.category.split(':');
         const parent = parts[0].trim();
         const child = parts.length > 1 ? parts[1].trim() : 'General';
         
         const key = selectedCategory ? child : parent;
         map[key] = (map[key] || 0) + e.amount;
         counts[key] = (counts[key] || 0) + 1;
     });
     
     const pData = Object.keys(map).map(k => ({ name: k, value: map[k] })).sort((a,b)=>b.value-a.value);
     const sortedByCount = Object.keys(counts).map(k => ({ name: k, count: counts[k] })).sort((a,b)=>b.count-a.count);
     
     return { 
        pieData: pData, 
        topSpender: pData.length > 0 ? pData[0] : null,
        frequentSpender: sortedByCount.length > 0 ? sortedByCount[0] : null,
     };
  }, [categoryFilteredExpenses, selectedCategory]);

  // Radar Chart Data (Top 5 Categories Profile)
  const radarData = useMemo(() => {
     if (pieData.length === 0) return [];
     const maxVal = pieData[0].value;
     return pieData.slice(0, 6).map(d => ({
         subject: d.name.length > 10 ? d.name.substring(0,8)+'..' : d.name,
         A: d.value,
         fullMark: maxVal,
     }));
  }, [pieData]);

  // Area Data Tracker (Cumulative Net Worth)
  const areaData = useMemo(() => {
     let runningBalance = 0;
     const chronological = [...categoryFilteredExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
     
     const grouped = {};
     chronological.forEach(e => {
        const dStr = new Date(e.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
        if (!grouped[dStr]) grouped[dStr] = { date: dStr, balance: 0, netChange: 0, expense: 0, income: 0 };
        
        if (e.type === 'income') {
           grouped[dStr].netChange += e.amount;
           grouped[dStr].income += e.amount;
        } else {
           grouped[dStr].netChange -= e.amount;
           grouped[dStr].expense += e.amount;
        }
     });
     
     return Object.values(grouped).map(g => {
        runningBalance += g.netChange;
        return {
           name: g.date,
           balance: runningBalance,
           income: g.income,
           expense: g.expense
        };
     });
  }, [categoryFilteredExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
         {selectedCategory && (
            <div className="flex items-center">
               <Button variant="ghost" onClick={() => { setSelectedCategory(null); setActiveIndex(0); }} className="h-8 gap-2 px-2 -ml-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Overview
               </Button>
            </div>
         )}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold dark:text-white">
               {selectedCategory ? `${selectedCategory} Intelligence` : 'Analytics & Habits'}
            </h2>
            <select 
               value={timeframe} 
               onChange={e => setTimeframe(e.target.value)}
               className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-colors cursor-pointer"
            >
               <option value="month">This Month</option>
               <option value="7days">Last 7 Days</option>
               <option value="all">All Time Aggregate</option>
            </select>
         </div>
      </div>

      {/* Habits & Insights Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden group">
            <CardContent className="p-6">
               <div className="flex justify-between items-start z-10 relative">
                  <div>
                     <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Top Spender</p>
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{topSpender ? topSpender.name : 'N/A'}</h3>
                     <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">{topSpender ? formatCurrency(topSpender.value) : '₹0'}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                     <Award className="w-6 h-6" />
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border-l-4 border-l-indigo-500 shadow-sm relative overflow-hidden group">
            <CardContent className="p-6">
               <div className="flex justify-between items-start z-10 relative">
                  <div>
                     <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Most Frequent</p>
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{frequentSpender ? frequentSpender.name : 'N/A'}</h3>
                     <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{frequentSpender ? `${frequentSpender.count} transactions` : '0 transactions'}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                     <Zap className="w-6 h-6" />
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-gradient-to-br from-red-50 to-white dark:from-slate-800 dark:to-slate-900 border-l-4 border-l-red-500 shadow-sm relative overflow-hidden group">
            <CardContent className="p-6">
               <div className="flex justify-between items-start z-10 relative">
                  <div>
                     <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Burn Rate</p>
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{burnRate.toFixed(1)}%</h3>
                     <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1">vs Income</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                     <Flame className="w-6 h-6" />
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col col-span-1 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle>{selectedCategory ? `Subcategory Distribution` : `Parent Distribution`}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center gap-4">
            {pieData.length === 0 ? (
               <div className="h-64 w-full flex items-center justify-center text-slate-500 dark:text-slate-400">No expense data to analyze</div>
            ) : (
               <div className="w-full flex-1 flex flex-col items-center w-full" onMouseLeave={() => setActiveIndex(0)}>
                 <div className="h-56 sm:h-80 w-full min-w-[200px] flex-shrink-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         activeIndex={activeIndex}
                         activeShape={renderActiveShape}
                         data={pieData}
                         cx="50%"
                         cy="50%"
                         innerRadius={70}
                         outerRadius={95}
                         paddingAngle={4}
                         dataKey="value"
                         onMouseEnter={(_, index) => setActiveIndex(index)}
                         onMouseLeave={() => {}}
                         onClick={(data, index) => {
                            const catName = pieData[index]?.name;
                            if (!selectedCategory && catName) {
                               setSelectedCategory(catName);
                               setActiveIndex(0);
                            } else if (typeof index === 'number') {
                               setActiveIndex(index);
                            }
                         }}
                         onTouchStart={(data, index) => {
                            const catName = pieData[index]?.name;
                            if (!selectedCategory && catName) {
                               setSelectedCategory(catName);
                               setActiveIndex(0);
                            } else if (typeof index === 'number') {
                               setActiveIndex(index);
                            }
                         }}
                         className={!selectedCategory ? "cursor-pointer focus:outline-none" : "focus:outline-none"}
                         style={{ outline: "none" }}
                         stroke="none"
                         isAnimationActive={false}
                       >
                         {pieData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
                 
                 <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 px-2 pb-2">
                    {pieData.slice(0, 6).map((entry, index) => (
                       <div 
                         key={entry.name} 
                         className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${activeIndex === index ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                         onMouseEnter={() => setActiveIndex(index)}
                         onClick={() => {
                            if (!selectedCategory && entry.name) {
                               setSelectedCategory(entry.name);
                               setActiveIndex(0);
                            } else {
                               setActiveIndex(index);
                            }
                         }}
                         onTouchStart={(e) => {
                            // prevent onMouseEnter from double firing on touch
                            e.stopPropagation();
                            if (!selectedCategory && entry.name) {
                               setSelectedCategory(entry.name);
                               setActiveIndex(0);
                            } else {
                               setActiveIndex(index);
                            }
                         }}
                       >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{entry.name}</span>
                       </div>
                    ))}
                 </div>
               </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
             <CardTitle>Category Profile (Habits)</CardTitle>
          </CardHeader>
          <CardContent>
             {radarData.length < 3 ? (
                <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                   Not enough distinct categories for profile radar. (Need at least 3)
                </div>
             ) : (
               <div className="h-[350px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                     <PolarGrid stroke="#334155" opacity={0.3} />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                     <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                     <Radar name="Spending Habits" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                     <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                   </RadarChart>
                 </ResponsiveContainer>
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col border-slate-200 dark:border-slate-800 shadow-sm">
         <CardHeader>
           <CardTitle>Cumulative Net Position</CardTitle>
         </CardHeader>
         <CardContent>
            {areaData.length === 0 ? (
               <div className="h-64 flex items-center justify-center text-slate-500">No time-series data to map.</div>
            ) : (
               <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} minTickGap={30} />
                     <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} tick={{ fill: '#64748b', fontSize: 12 }} />
                     <Tooltip cursor={{ fill: 'transparent', stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} formatter={(value) => formatCurrency(value)} />
                     <Area type="monotone" dataKey="balance" name="Net Worth" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            )}
         </CardContent>
      </Card>
      
    </div>
  );
}
