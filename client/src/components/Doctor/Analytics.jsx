import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  // Patients
  getPatientsByYear,
  getPatientsByYearMonth,
  getPatientsByYearGender,
  getPatientsByAgeGroup,
  // Visits
  getVisitsByYear,
  getVisitsByMonth,
  // Revenue
  getRevenueByMonth,
  getRevenueByYear,
  getCollectionsRateByMonth,
  getRevenueRolling12m,
} from "../../utils/api";

import {
  ResponsiveContainer,
  BarChart, Bar, LabelList,
  LineChart, Line,
  PieChart, Pie, Cell,
  Tooltip, Legend, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

import {
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
  FiDownload,
  FiHelpCircle,
  FiGlobe
} from "react-icons/fi";

/* ---------------------------- helpers ---------------------------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const toMonthName = (m) => MONTHS[(Number(m) || 1) - 1] || String(m || "");
const fmtInt = (n) => (Number.isFinite(+n) ? Number(n) : 0);
const fmtMoney = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v||0));
const fmtCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number(n || 0));
const todayISO = () => new Date().toISOString().slice(0,10);

const COLORS = {
  primary: { 200:"#bae6fd", 300:"#7dd3fc", 400:"#38bdf8", 500:"#0ea5e9", 600:"#0284c7" },
  secondary: { 200:"#e9d5ff", 300:"#d8b4fe", 400:"#a855f7", 500:"#9333ea", 600:"#7c3aed" },
  gray: { 200:"#e5e7eb", 300:"#d1d5db", 600:"#4b5563" },
};

// Medium bright palette
const MEDIUM_BRIGHT_PALETTE = [
  "#4ECDC4", "#FF6B6B", "#FFD166", "#06D6A0", "#118AB2",
  "#073B4C", "#EF476F", "#7209B7", "#F72585", "#4361EE",
  "#4CC9F0", "#560BAD"
];

// Base year colors for known years
const YEAR_COLORS = {
  "2020": "#4ECDC4",
  "2021": "#FF6B6B", 
  "2022": "#FFD166",
  "2023": "#06D6A0",
  "2024": "#118AB2",
  "2025": "#073B4C"
};

// Function to get color for any year (including future years)
const getYearColor = (year) => {
  // If we have a predefined color for this year, use it
  if (YEAR_COLORS[year]) {
    return YEAR_COLORS[year];
  }
  
  // For years beyond our predefined ones, generate a color
  // Use a base set of colors to cycle through
  const baseColors = [
    "#4ECDC4", "#FF6B6B", "#FFD166", "#06D6A0", "#118AB2",
    "#073B4C", "#EF476F", "#7209B7", "#F72585", "#4361EE"
  ];
  
  // Convert year to number and get a consistent index
  const yearNum = parseInt(year, 10);
  const colorIndex = (yearNum - 2020) % baseColors.length;
  
  return baseColors[colorIndex >= 0 ? colorIndex : 0];
};

// Month colors
const MONTH_COLORS = {
  "Jan": "#4ECDC4", "Feb": "#FF6B6B", "Mar": "#FFD166", 
  "Apr": "#06D6A0", "May": "#118AB2", "Jun": "#073B4C",
  "Jul": "#EF476F", "Aug": "#7209B7", "Sep": "#F72585",
  "Oct": "#4361EE", "Nov": "#4CC9F0", "Dec": "#560BAD"
};

const selectStyles = {
  control: (base, state) => ({
    ...base, minHeight: 36, borderRadius: 8,
    borderColor: state.isFocused ? COLORS.primary[400] : COLORS.gray[300],
    boxShadow: state.isFocused ? "0 0 0 3px rgba(14,165,233,0.12)" : "none",
    ":hover": { borderColor: COLORS.primary[400] }, fontSize: 14, backgroundColor: "white"
  }),
  valueContainer: (b) => ({ ...b, padding: "4px 12px" }),
  indicatorsContainer: (b) => ({ ...b, padding: "4px 6px" }),
  menu: (b) => ({ ...b, zIndex: 40, fontSize: 14, borderRadius: 8 }),
};

const Note = ({ tone = "info", children }) => {
  const tones = {
    info: `bg-blue-50 text-blue-700 border border-blue-200`,
    warn: `bg-amber-50 text-amber-800 border border-amber-200`,
    error:`bg-red-50 text-red-700 border border-red-200`,
    success:`bg-green-50 text-green-700 border border-green-200`,
  };
  return (
    <div className={`rounded-lg px-4 py-3 flex items-start gap-2 ${tones[tone]}`}>
      <FiHelpCircle className="mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
};

const Segmented = ({ value, onChange, options, size = "sm" }) => {
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-3 py-1.5 text-sm", lg: "px-4 py-2 text-base" };
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${sizes[size]} rounded-md transition-colors font-medium ${
              active ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const chartTypeOptions = [
  { label: "Bar", value: "bar" },
  { label: "Line", value: "line" },
  { label: "Area", value: "area" },
  { label: "Pie", value: "pie" },
];
const chartTypeOptionsNoLine = [
  { label: "Bar", value: "bar" },
  { label: "Pie", value: "pie" },
];

// plain-number tooltip (no "%")
const CustomTooltip = ({ active, payload, label, money = false }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-md">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name || entry.dataKey}: {money ? fmtMoney(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Card = ({ title, subtitle, right, children, className = "", loading = false }) => (
  <div className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-gray-100">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
    <div className="p-6">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const KPI = ({ title, value, change, changeType = "neutral", icon, money = false, loading = false }) => {
  const changeColors = {
    positive: "text-green-600 bg-green-50",
    negative: "text-red-600 bg-red-50",
    neutral: "text-gray-600 bg-gray-50"
  };
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {icon && <div className="p-2 rounded-lg bg-blue-50 text-blue-600">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{money ? fmtMoney(value) : value}</p>
      {typeof change === "number" && (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
          {changeType !== "negative" ? <FiTrendingUp className="mr-1" /> : <FiTrendingUp className="mr-1 rotate-180" />}
          {change}
        </div>
      )}
    </div>
  );
};

/* ----------------------- generic single-series chart ---------------------- */
const Chart = ({
  type,
  data,
  valueKey = "value",
  height = 280,
  itemColors,
  money = false,
  showGrid = true,
  strokeWidth = 2,
  showBarLabels = true,
  isYearData = false,
  isMonthData = false
}) => {
  if (!Array.isArray(data) || data.length === 0) return <Note tone="info">No data available</Note>;
  const normalized = data.map((d) => ({ ...d, [valueKey]: fmtInt(d[valueKey]) }));
  const maxVal = Math.max(0, ...normalized.map(d => Number(d[valueKey]) || 0));

  // Determine colors based on data type
  let colorsToUse = itemColors;
  if (!colorsToUse) {
    if (isYearData) {
      // For year data, use the getYearColor function
      colorsToUse = normalized.map(item => getYearColor(item.label));
    } else if (isMonthData) {
      // For month data, use MONTH_COLORS
      colorsToUse = normalized.map(item => MONTH_COLORS[item.label] || MEDIUM_BRIGHT_PALETTE[0]);
    } else {
      // For other data, use the medium bright palette
      colorsToUse = MEDIUM_BRIGHT_PALETTE;
    }
  }

  if (type === "pie") {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={normalized}
              dataKey={valueKey}
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              // numbers instead of percentages
              label={(entry) => `${entry.name}: ${money ? fmtMoney(entry.value) : entry.value}`}
              labelLine={false}
            >
              {normalized.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorsToUse[index % colorsToUse.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip money={money} />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line" || type === "area") {
    const ChartComponent = type === "line" ? LineChart : AreaChart;
    const DataComponent = type === "line" ? Line : Area;
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer>
          <ChartComponent data={normalized} margin={{ top: 20, right: 24, bottom: 10, left: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[200]} />}
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.gray[600] }} tickLine={false} axisLine={{ stroke: COLORS.gray[300] }} />
            <YAxis
              allowDecimals={false}
              domain={[0, (dataMax) => Math.ceil((dataMax || 0) * 1.08)]}
              tick={{ fontSize: 12, fill: COLORS.gray[600] }}
              tickLine={false}
              axisLine={{ stroke: COLORS.gray[300] }}
            />
            <Tooltip content={<CustomTooltip money={money} />} />
            <DataComponent
              type="monotone"
              dataKey={valueKey}
              stroke={isYearData ? getYearColor(normalized[0]?.label) : COLORS.primary[500]}
              strokeWidth={strokeWidth}
              fill={type === "area" ? "url(#colorGradient)" : undefined}
              dot={{ fill: isYearData ? getYearColor(normalized[0]?.label) : COLORS.primary[500], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: isYearData ? getYearColor(normalized[0]?.label) : COLORS.primary[600] }}
            />
            {type === "area" && (
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isYearData ? getYearColor(normalized[0]?.label) : COLORS.primary[500]} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={isYearData ? getYearColor(normalized[0]?.label) : COLORS.primary[500]} stopOpacity={0}/>
                </linearGradient>
              </defs>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  }

  // default: bar
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={normalized} margin={{ top: 34, right: 24, bottom: 10, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[200]} />}
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.gray[600] }} tickLine={false} axisLine={{ stroke: COLORS.gray[300] }} />
          <YAxis
            allowDecimals={false}
            // *** Headroom so top labels don't get clipped ***
            domain={[0, (dataMax) => Math.ceil((dataMax || 0) * 1.18)]}
            tick={{ fontSize: 12, fill: COLORS.gray[600] }}
            tickLine={false}
            axisLine={{ stroke: COLORS.gray[300] }}
            tickFormatter={v => maxVal >= 100000 ? fmtCompact(v) : v}
          />
          <Tooltip content={<CustomTooltip money={money} />} />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {normalized.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colorsToUse[index % colorsToUse.length]}
              />
            ))}
            {showBarLabels && (
              <LabelList
                dataKey={valueKey}
                position="top"
                formatter={(v) => (money ? fmtMoney(v) : v)}
                offset={6}
                style={{ fontSize: 12, fill: "#374151" }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ----------------------- Biaxial revenue bars (Total/Paid/Due) ------------ */
const BiaxialRevenueBars = ({ data, height = 300 }) => {
  if (!Array.isArray(data) || data.length === 0) return <Note tone="info">No data available</Note>;
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 34, right: 24, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[200]} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: COLORS.gray[600] }}
            tickLine={false}
            axisLine={{ stroke: COLORS.gray[300] }}
          />
          {/* Left axis for Total & Paid */}
          <YAxis
            yAxisId="left"
            tickFormatter={fmtCompact}
            domain={[0, (dataMax) => Math.ceil((dataMax || 0) * 1.18)]}
            tick={{ fontSize: 12, fill: COLORS.gray[600] }}
            tickLine={false}
            axisLine={{ stroke: COLORS.gray[300] }}
          />
          {/* Right axis for Due (often smaller scale) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={fmtCompact}
            domain={[0, (dataMax) => Math.ceil((dataMax || 0) * 1.18)]}
            tick={{ fontSize: 12, fill: COLORS.gray[600] }}
            tickLine={false}
            axisLine={{ stroke: COLORS.gray[300] }}
          />
          <Tooltip content={<CustomTooltip money />} />
          <Legend />
          <Bar yAxisId="left" dataKey="total" name="Total" fill="#4ECDC4" radius={[4,4,0,0]}>
            <LabelList dataKey="total" position="top" formatter={(v)=>fmtMoney(v)} offset={6} style={{ fontSize: 12, fill: "#374151" }} />
          </Bar>
          <Bar yAxisId="left" dataKey="paid" name="Paid" fill="#06D6A0" radius={[4,4,0,0]}>
            <LabelList dataKey="paid" position="top" formatter={(v)=>fmtMoney(v)} offset={6} style={{ fontSize: 12, fill: "#374151" }} />
          </Bar>
          <Bar yAxisId="right" dataKey="due" name="Due" fill="#FF6B6B" radius={[4,4,0,0]}>
            <LabelList dataKey="due" position="top" formatter={(v)=>fmtMoney(v)} offset={6} style={{ fontSize: 12, fill: "#374151" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------------------- main page ---------------------------- */
const Analytics = () => {
  // Defaults: timezone Asia/Kolkata
  const [tz, setTz] = useState("Asia/Kolkata");

  // Global Year selector (controls all year-scoped charts)
  const [globalYear, setGlobalYear] = useState("");

  // Chart types
  const [typePYear, setTypePYear] = useState("bar");
  const [typePMonth, setTypePMonth] = useState("bar");
  const [typePGender, setTypePGender] = useState("pie");
  const [typePAge, setTypePAge] = useState("bar");

  const [typeVYear, setTypeVYear] = useState("bar");
  const [typeVMonth, setTypeVMonth] = useState("line");

  const [typeRevYear, setTypeRevYear] = useState("bar");
  const [typeRevMonth, setTypeRevMonth] = useState("bar");
  const [typeCollect, setTypeCollect] = useState("bar");
  const [typeRoll12, setTypeRoll12] = useState("area");

  // Data
  const [patientsYear, setPatientsYear] = useState([]);
  const [patientsAge, setPatientsAge] = useState([]);
  const [visitsYear, setVisitsYear] = useState([]);

  const [pYearMonth, setPYearMonth] = useState([]);
  const [pYearGender, setPYearGender] = useState([]);

  const [visitsMonth, setVisitsMonth] = useState([]);
  const [revMonth, setRevMonth] = useState([]);
  const [revYear, setRevYear] = useState([]);
  const [collectMonth, setCollectMonth] = useState([]);
  const [roll12, setRoll12] = useState([]);

  // Per-chart year state (driven by globalYear)
  const [yearPMonth, setYearPMonth] = useState("");
  const [yearPGender, setYearPGender] = useState("");
  const [yearVMonth, setYearVMonth] = useState("");
  const [yearRevenue, setYearRevenue] = useState("");
  const [rollEnd, setRollEnd] = useState(todayISO());

  // Loading / error
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPMonth, setLoadingPMonth] = useState(false);
  const [loadingPGender, setLoadingPGender] = useState(false);
  const [loadingVMonth, setLoadingVMonth] = useState(false);
  const [loadingRevMonth, setLoadingRevMonth] = useState(false);
  const [loadingRevYear, setLoadingRevYear] = useState(false);
  const [loadingCollect, setLoadingCollect] = useState(false);
  const [loadingRoll12, setLoadingRoll12] = useState(false);
  const [err, setErr] = useState("");

  /* ----------------------------- Load base ----------------------------- */
  useEffect(() => {
    let live = true;
    (async () => {
      setErr("");
      setLoadingBase(true);
      try {
        const [pYear, pAge, vYear, rYear] = await Promise.all([
          getPatientsByYear(),
          getPatientsByAgeGroup(),
          getVisitsByYear({ tz }),
          getRevenueByYear({ tz }),
        ]);
        if (!live) return;

        setPatientsYear(Array.isArray(pYear) ? pYear : []);
        setPatientsAge(Array.isArray(pAge) ? pAge : []);
        setVisitsYear(Array.isArray(vYear) ? vYear : []);
        setRevYear(Array.isArray(rYear) ? rYear : []);

        const candidateYears = [
          ...new Set([
            ...((pYear || []).map(r => r.year)),
            ...((vYear || []).map(r => r.year)),
          ]),
        ].filter(Boolean).sort((a,b) => Number(b) - Number(a));
        const latest = String(candidateYears[0] || new Date().getFullYear());

        // initialize global year + per-chart years
        setGlobalYear(latest);
        setYearPMonth(latest);
        setYearPGender(latest);
        setYearVMonth(latest);
        setYearRevenue(latest);
      } catch (e) {
        setErr(e?.message || "Failed to load analytics");
      } finally {
        setLoadingBase(false);
      }
    })();
    return () => { live = false; };
  }, [tz]);

  // keep per-chart years in sync with global
  useEffect(() => {
    if (!globalYear) return;
    setYearPMonth(globalYear);
    setYearPGender(globalYear);
    setYearVMonth(globalYear);
    setYearRevenue(globalYear);
  }, [globalYear]);

  /* -------------------- Year-scoped fetchers --------------------- */
  useEffect(() => {
    if (!yearPMonth) return;
    let live = true;
    (async () => {
      setLoadingPMonth(true);
      try {
        const rows = await getPatientsByYearMonth(yearPMonth);
        if (!live) return;
        setPYearMonth(Array.isArray(rows) ? rows : []);
      } catch (e) { setErr(prev => prev || e?.message || "Failed monthly patients"); }
      finally { setLoadingPMonth(false); }
    })();
    return () => { live = false; };
  }, [yearPMonth]);

  useEffect(() => {
    if (!yearPGender) return;
    let live = true;
    (async () => {
      setLoadingPGender(true);
      try {
        const rows = await getPatientsByYearGender(yearPGender);
        if (!live) return;
        setPYearGender(Array.isArray(rows) ? rows : []);
      } catch (e) { setErr(prev => prev || e?.message || "Failed gender"); }
      finally { setLoadingPGender(false); }
    })();
    return () => { live = false; };
  }, [yearPGender]);

  useEffect(() => {
    if (!yearVMonth) return;
    let live = true;
    (async () => {
      setLoadingVMonth(true);
      try {
        const rows = await getVisitsByMonth({ year: yearVMonth, tz });
        if (!live) return;
        setVisitsMonth(Array.isArray(rows) ? rows : []);
      } catch (e) { setErr(prev => prev || e?.message || "Failed monthly visits"); }
      finally { setLoadingVMonth(false); }
    })();
    return () => { live = false; };
  }, [yearVMonth, tz]);

  useEffect(() => {
    if (!yearRevenue) return;
    let live = true;
    (async () => {
      setLoadingRevMonth(true);
      setLoadingCollect(true);
      try {
        const [rm, cr] = await Promise.all([
          getRevenueByMonth({ year: yearRevenue, tz }),
          getCollectionsRateByMonth({ year: yearRevenue, tz }),
        ]);
        if (!live) return;
        setRevMonth(Array.isArray(rm) ? rm : []);
        setCollectMonth(Array.isArray(cr) ? cr : []);
      } catch (e) { setErr(prev => prev || e?.message || "Failed revenue metrics"); }
      finally { setLoadingRevMonth(false); setLoadingCollect(false); }
    })();
    return () => { live = false; };
  }, [yearRevenue, tz]);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoadingRoll12(true);
      try {
        const rows = await getRevenueRolling12m({ end: rollEnd, tz });
        if (!live) return;
        setRoll12(Array.isArray(rows) ? rows : []);
      } catch (e) { setErr(prev => prev || e?.message || "Failed rolling 12m revenue"); }
      finally { setLoadingRoll12(false); }
    })();
    return () => { live = false; };
  }, [rollEnd, tz]);

  /* --------------------------- Select options --------------------------- */
  const yearOptions = useMemo(() => {
    const ys = new Set([
      ...patientsYear.map((r) => String(r.year)),
      ...visitsYear.map((r) => String(r.year)),
    ]);
    return Array.from(ys).filter(Boolean).sort((a,b) => Number(b)-Number(a)).map((y) => ({ value: y, label: y }));
  }, [patientsYear, visitsYear]);

  const tzOptions = [
    { value: "Asia/Kolkata", label: "Asia/Kolkata" },
    { value: "UTC", label: "UTC" },
    { value: "Asia/Dubai", label: "Asia/Dubai" },
    { value: "Asia/Singapore", label: "Asia/Singapore" },
    { value: "America/New_York", label: "America/New_York" },
    { value: "Europe/London", label: "Europe/London" },
  ];

  /* ------------------------------ Mappings ------------------------------ */
  const dataPatientsByYear = useMemo(
    () => patientsYear.map((r) => ({ label: String(r.year), value: fmtInt(r.total) })),
    [patientsYear]
  );
  const dataPatientsByYearMonth = useMemo(
    () => pYearMonth.slice().sort((a,b)=>Number(a.month)-Number(b.month))
      .map((r)=>({ label: toMonthName(r.month), value: fmtInt(r.total) })),
    [pYearMonth]
  );
  const dataPatientsByYearGender = useMemo(
    () => pYearGender.map((r)=>({ label: r.gender || "Unknown", value: fmtInt(r.total) })),
    [pYearGender]
  );
  const dataPatientsByAgeGroup = useMemo(
    () => patientsAge.map((r)=>({ label: r.age_group || "Unknown", value: fmtInt(r.total) })),
    [patientsAge]
  );
  const dataVisitsByYear = useMemo(
    () => visitsYear.map((r)=>({ label: String(r.year), value: fmtInt(r.total) })),
    [visitsYear]
  );
  const dataVisitsByMonth = useMemo(
    () => visitsMonth.slice().sort((a,b)=>Number(a.month)-Number(b.month))
      .map((r)=>({ label: toMonthName(r.month), value: fmtInt(r.total) })),
    [visitsMonth]
  );

  const dataRevenueByYear = useMemo(
    () => revYear.map((r)=>({ label: String(r.year), value: Math.round(r.total || 0) })),
    [revYear]
  );
  const dataRevenueByMonth = useMemo(
    () => revMonth.slice().sort((a,b)=>Number(a.month)-Number(b.month))
      .map((r)=>({ label: toMonthName(r.month), value: Math.round(r.total || r.paid || 0) })),
    [revMonth]
  );

  // collections as numbers (0..100) – no % sign
  const dataCollectionsRate = useMemo(
    () => collectMonth.slice().sort((a,b)=>Number(a.month)-Number(b.month))
      .map((r)=>({ label: toMonthName(r.month), value: Math.round(r.collection_rate || 0) })),
    [collectMonth]
  );

  const dataRolling12 = useMemo(
    () => roll12.slice().sort((a,b)=> String(a.month_start).localeCompare(String(b.month_start)))
      .map((r)=>({ label: r.month_start, value: Math.round(r.total_12m || 0) })),
    [roll12]
  );

  // Triple series for biaxial chart
  const dataRevenueTriple = useMemo(
    () =>
      revMonth
        .slice()
        .sort((a, b) => Number(a.month) - Number(b.month))
        .map((r) => ({
          label: toMonthName(r.month),
          total: Math.round(r.total || 0),
          paid: Math.round(r.paid || 0),
          due: Math.round(r.due || 0),
        })),
    [revMonth]
  );

  // KPIs
  const totalPatients = useMemo(() => dataPatientsByYear.reduce((s, r) => s + r.value, 0), [dataPatientsByYear]);
  const totalVisits = useMemo(() => dataVisitsByYear.reduce((s, r) => s + r.value, 0), [dataVisitsByYear]);

  const latestYear = useMemo(() => {
    const ys = [...new Set([...patientsYear.map(r=>r.year), ...visitsYear.map(r=>r.year)])].filter(Boolean).sort((a,b)=>Number(b)-Number(a));
    return ys[0] || "-";
  }, [patientsYear, visitsYear]);

  const patientsInLatestYear = useMemo(() => {
    if (!latestYear || latestYear === "-") return 0;
    return fmtInt(patientsYear.find(r=>String(r.year)===String(latestYear))?.total);
  }, [patientsYear, latestYear]);

  const visitsInLatestYear = useMemo(() => {
    if (!latestYear || latestYear === "-") return 0;
    return fmtInt(visitsYear.find(r=>String(r.year)===String(latestYear))?.total);
  }, [visitsYear, latestYear]);

  const revenueThisYear = useMemo(() => {
    if (!dataRevenueByMonth?.length || String(yearRevenue) !== String(latestYear)) return 0;
    return dataRevenueByMonth.reduce((s,r)=> s + r.value, 0);
  }, [dataRevenueByMonth, latestYear, yearRevenue]);

  const kpiChanges = { totalPatients: 0, totalVisits: 0, patientsLatestYear: 0, visitsLatestYear: 0, revenueThisYear: 0 };
  const getChangeType = (value) => (value > 0 ? "positive" : value < 0 ? "negative" : "neutral");

  // Export helpers
  const exportCsv = (rows, filename) => {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Patients, visits & revenue (timezone-aware)</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              
              {/* Global Year Selector */}
              <div className="w-40">
                <Select
                  isSearchable
                  styles={selectStyles}
                  options={yearOptions}
                  value={yearOptions.find((o)=>o.value===globalYear) || null}
                  onChange={(opt)=>setGlobalYear(opt?.value || "")}
                  placeholder="Select Year"
                />
              </div>
              <button
                onClick={() => exportCsv(
                  [...dataPatientsByYear, ...dataVisitsByYear, ...dataRevenueByYear].map(r => ({ metric: r.label ? "Year" : "", ...r })),
                  "analytics-overview.csv"
                )}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiDownload className="mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {err && (
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex">
              <div className="ml-1">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <div className="mt-2 text-sm text-red-700"><p>{err}</p></div>
                <div className="mt-4">
                  <button onClick={() => window.location.reload()} className="text-sm font-medium text-red-700 hover:text-red-600">
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPI title="Total Patients" value={totalPatients} change={0} changeType="neutral" icon={<FiUsers className="text-lg" />} loading={loadingBase} />
          <KPI title="Total Visits" value={totalVisits} change={0} changeType="neutral" icon={<FiTrendingUp className="text-lg" />} loading={loadingBase} />
          <KPI title={`Patients (${globalYear || "-"})`} value={patientsInLatestYear} change={0} changeType="neutral" icon={<FiUsers className="text-lg" />} loading={loadingBase} />
          <KPI title={`Visits (${globalYear || "-"})`} value={visitsInLatestYear} change={0} changeType="neutral" icon={<FiTrendingUp className="text-lg" />} loading={loadingBase} />
          <KPI title={`Revenue (${globalYear || "-"})`} value={revenueThisYear} change={0} changeType="neutral" icon={<FiDollarSign className="text-lg" />} money loading={loadingBase || loadingRevMonth} />
        </div>

        {/* Patients */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h2 className="text-lg font-semibold text-gray-800">Patients Analytics</h2>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Patients by Year"
              subtitle="Total registered patients per year"
              right={<Segmented value={typePYear} onChange={setTypePYear} options={chartTypeOptions} size="sm" />}
              loading={loadingBase}
            >
              <Chart type={typePYear} data={dataPatientsByYear} isYearData={true} />
            </Card>

            <Card
              title={`Patients by Month (${globalYear})`}
              subtitle="Monthly registrations"
              right={<Segmented value={typePMonth} onChange={setTypePMonth} options={chartTypeOptions} size="sm" />}
              loading={loadingPMonth || loadingBase}
            >
              <Chart type={typePMonth} data={dataPatientsByYearMonth} isMonthData={true} />
            </Card>

            <Card
              title={`Patients by Gender (${globalYear})`}
              subtitle="Distribution by gender"
              right={<Segmented value={typePGender} onChange={(v)=>setTypePGender(v)} options={chartTypeOptionsNoLine} size="sm" />}
              loading={loadingPGender || loadingBase}
            >
              <Chart type={typePGender} data={dataPatientsByYearGender} itemColors={MEDIUM_BRIGHT_PALETTE} />
            </Card>

            <Card
              title="Patients by Age Group"
              subtitle="Distribution across age groups"
              right={<Segmented value={typePAge} onChange={setTypePAge} options={chartTypeOptions} size="sm" />}
              loading={loadingBase}
            >
              <Chart type={typePAge} data={dataPatientsByAgeGroup} itemColors={MEDIUM_BRIGHT_PALETTE} />
            </Card>
          </div>
        </div>

        {/* Visits */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h2 className="text-lg font-semibold text-gray-800">Visits Analytics</h2>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Visits by Year"
              subtitle={`Aggregated by ${tz}`}
              right={<Segmented value={typeVYear} onChange={setTypeVYear} options={chartTypeOptions} size="sm" />}
              loading={loadingBase}
            >
              <Chart type={typeVYear} data={dataVisitsByYear} isYearData={true} />
            </Card>

            <Card
              title={`Visits by Month (${globalYear})`}
              subtitle={`Monthly visits (${tz})`}
              right={<Segmented value={typeVMonth} onChange={setTypeVMonth} options={chartTypeOptions} size="sm" />}
              loading={loadingVMonth || loadingBase}
            >
              <Chart type={typeVMonth} data={dataVisitsByMonth} isMonthData={true} />
            </Card>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h2 className="text-lg font-semibold text-gray-800">Revenue Analytics</h2>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Revenue by Year"
              subtitle={`Totals computed in ${tz}`}
              right={<Segmented value={typeRevYear} onChange={setTypeRevYear} options={[{label:"Bar",value:"bar"},{label:"Line",value:"line"}]} size="sm" />}
              loading={loadingBase || loadingRevYear}
            >
              {/* Headroom & margin fixes applied inside Chart */}
              <Chart type={typeRevYear} data={dataRevenueByYear} money isYearData={true} />
            </Card>

            <Card
              title={`Revenue by Month (${globalYear})`}
              subtitle="Billed amount by month"
              right={<Segmented value={typeRevMonth} onChange={setTypeRevMonth} options={[{label:"Bar",value:"bar"},{label:"Line",value:"line"}]} size="sm" />}
              loading={loadingRevMonth || loadingBase}
            >
              <Chart type={typeRevMonth} data={dataRevenueByMonth} money isMonthData={true} />
            </Card>

            {/* Biaxial dual-axis chart */}
            <Card
              title={`Monthly Revenue vs Paid vs Due (${globalYear})`}
              subtitle="Totals and payments with separate scale for Due"
              loading={loadingRevMonth || loadingBase}
            >
              <BiaxialRevenueBars data={dataRevenueTriple} />
            </Card>

            <Card
              title={`Collections Rate by Month (${globalYear})`}
              subtitle="Paid / Total (numeric 0–100)"
              right={<Segmented value={typeCollect} onChange={setTypeCollect} options={[{label:"Bar",value:"bar"},{label:"Line",value:"line"}]} size="sm" />}
              loading={loadingCollect || loadingBase}
            >
              {/* plain numbers rather than % */}
              <Chart type={typeCollect} data={dataCollectionsRate} showBarLabels isMonthData={true} />
            </Card>

            <Card
              title="Rolling 12-Month Revenue"
              subtitle={`Sum of last 12 months (end: ${rollEnd})`}
              right={
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={rollEnd}
                    onChange={(e)=>setRollEnd(e.target.value)}
                    className="pl-4 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Segmented value={typeRoll12} onChange={setTypeRoll12} options={[{label:"Area",value:"area"},{label:"Line",value:"line"}]} size="sm" />
                </div>
              }
              loading={loadingRoll12 || loadingBase}
            >
              <Chart type={typeRoll12} data={dataRolling12} money />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;