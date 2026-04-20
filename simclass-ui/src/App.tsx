import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Bot,
  ChevronRight,
  Cpu,
  FileText,
  Filter,
  Gauge,
  GraduationCap,
  LayoutGrid,
  LineChart,
  Play,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  Waves,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Agent = {
  name: string;
  role: string;
  score: number;
  mood: string;
  aiUse: number;
  riskLevel: string;
  x: number;
  y: number;
  size: number;
};

type WeeklyPoint = {
  week: string;
  score: number;
  risk: number;
  ai: number;
};

type EventItem = {
  week: string;
  title: string;
  tag: string;
};

type SubgroupMetrics = {
  n: number;
  avg_score: number | null;
  pass_rate: number | null;
  high_risk_pct: number | null;
};

type SubgroupData = {
  low_prior_knowledge: SubgroupMetrics;
  high_prior_knowledge: SubgroupMetrics;
  ai_access: SubgroupMetrics;
  no_ai_access: SubgroupMetrics;
};

type SimulationResult = {
  summary: {
    average_score: number;
    pass_rate: number;
    high_risk_pct: number;
    low_risk_pct: number;
    avg_confidence: number;
    avg_stress: number;
    avg_ai_usage: number;
  };
  weekly_history: Array<WeeklyPoint & { event: string }>;
  clusters: Agent[];
  events: EventItem[];
  subgroups: SubgroupData;
};

type ScenarioCompareData = {
  summary: SimulationResult["summary"];
  weekly_history: WeeklyPoint[];
  num_students: number;
  subgroups: SubgroupData;
};

type CompareResult = {
  scenarios: Record<string, ScenarioCompareData>;
};

const SCENARIO_MAP: Record<string, { scenario: string; num_students: number; ai_access_rate: number }> = {
  "Intro to Programming / 80 students": { scenario: "Lecture + AI Tutor", num_students: 80, ai_access_rate: 0.6 },
  "Calculus I / 60 students": { scenario: "Lecture Only", num_students: 60, ai_access_rate: 0.0 },
  "General Chemistry / 120 students": { scenario: "Adaptive Learning", num_students: 120, ai_access_rate: 0.7 },
};

const ALL_SCENARIOS = ["Lecture Only", "Lecture + AI Tutor", "Adaptive Learning"];

const SCENARIO_COLORS: Record<string, string> = {
  "Lecture Only": "#64748b",
  "Lecture + AI Tutor": "#2563eb",
  "Adaptive Learning": "#16a34a",
};

const weeklyData: WeeklyPoint[] = [
  { week: "W1", score: 54, risk: 34, ai: 18 },
  { week: "W2", score: 57, risk: 30, ai: 24 },
  { week: "W3", score: 60, risk: 27, ai: 31 },
  { week: "W4", score: 58, risk: 29, ai: 36 },
  { week: "W5", score: 64, risk: 24, ai: 40 },
  { week: "W6", score: 67, risk: 22, ai: 47 },
  { week: "W7", score: 71, risk: 18, ai: 52 },
  { week: "W8", score: 74, risk: 15, ai: 58 },
];

const agents: Agent[] = [
  {
    name: "Low-Prep Cluster",
    role: "At-risk learners",
    score: 58,
    mood: "fragile",
    aiUse: 74,
    riskLevel: "high",
    x: 18,
    y: 58,
    size: 18,
  },
  {
    name: "High-Achiever Pod",
    role: "Peer leaders",
    score: 87,
    mood: "stable",
    aiUse: 46,
    riskLevel: "low",
    x: 72,
    y: 24,
    size: 14,
  },
  {
    name: "Commuter Students",
    role: "Low time availability",
    score: 63,
    mood: "strained",
    aiUse: 69,
    riskLevel: "medium",
    x: 30,
    y: 30,
    size: 12,
  },
  {
    name: "Quiet Performers",
    role: "Independent learners",
    score: 79,
    mood: "steady",
    aiUse: 34,
    riskLevel: "medium",
    x: 56,
    y: 58,
    size: 10,
  },
  {
    name: "Office Hours Group",
    role: "Support responders",
    score: 73,
    mood: "recovering",
    aiUse: 55,
    riskLevel: "high",
    x: 79,
    y: 69,
    size: 11,
  },
  {
    name: "Disengaged Cluster",
    role: "Low participation",
    score: 49,
    mood: "high-risk",
    aiUse: 22,
    riskLevel: "high",
    x: 12,
    y: 22,
    size: 16,
  },
];

const events: EventItem[] = [
  { week: "Week 2", title: "AI tutor introduced", tag: "intervention" },
  { week: "Week 4", title: "Quiz pressure spike", tag: "stress" },
  { week: "Week 6", title: "Peer study circles formed", tag: "network" },
  {
    week: "Week 8",
    title: "Targeted support sent to at-risk students",
    tag: "support",
  },
];

const scenarios = [
  "Intro to Programming / 80 students",
  "Calculus I / 60 students",
  "General Chemistry / 120 students",
];

const navItems = [
  { icon: LayoutGrid, label: "World Builder" },
  { icon: Users, label: "Agent Clusters" },
  { icon: LineChart, label: "Trajectory" },
  { icon: ShieldAlert, label: "Risk Map" },
  { icon: FileText, label: "Reports" },
];

const statCards = [
  { label: "Students", value: "80", icon: Users },
  { label: "At-risk", value: "15%", icon: ShieldAlert },
  { label: "AI Adoption", value: "58%", icon: Bot },
  { label: "Avg Score", value: "74", icon: Gauge },
];

function SparkArea({
  values,
  height = 84,
}: {
  values: number[];
  height?: number;
}) {
  const width = 360;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const step = width / (values.length - 1 || 1);

  const points = values
    .map((v, i) => {
      const normalized = (v - min) / Math.max(1, max - min);
      const y = height - normalized * (height - 14) - 8;
      const x = i * step;
      return `${x},${y}`;
    })
    .join(" ");

  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full">
      <defs>
        <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={area}
        fill="url(#fillArea)"
        className="text-slate-500"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-800"
      />
    </svg>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values);

  return (
    <div className="flex h-28 items-end gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-2xl bg-slate-800/85"
            style={{ height: `${(v / max) * 100}%` }}
          />
          <span className="text-[11px] text-slate-500">W{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function MultiLineChart({ data }: { data: Record<string, WeeklyPoint[]> }) {
  const W = 600, H = 100;
  const entries = Object.entries(data);
  const allScores = entries.flatMap(([, pts]) => pts.map((p) => p.score));
  const lo = Math.min(...allScores);
  const hi = Math.max(...allScores);

  const pts = (values: WeeklyPoint[]) =>
    values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * W;
        const y = H - ((v.score - lo) / Math.max(hi - lo, 1)) * (H - 16) - 8;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full">
      {entries.map(([scenario, values]) => (
        <polyline
          key={scenario}
          points={pts(values)}
          fill="none"
          stroke={SCENARIO_COLORS[scenario] ?? "#64748b"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default function App() {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    if (simResult && simResult.clusters.length > 0) {
      setSelectedAgent(simResult.clusters[0]);
    }
  }, [simResult]);

  const handleRunSimulation = async () => {
    setIsLoading(true);
    try {
      const params = SCENARIO_MAP[selectedScenario];
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, weeks: 12, seed: 42 }),
      });
      const data: SimulationResult = await res.json();
      setSimResult(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async () => {
    setIsComparing(true);
    try {
      const res = await fetch("/api/simulate/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks: 12, ai_access_rate: 0.6, seed: 42 }),
      });
      const data: CompareResult = await res.json();
      setCompareResult(data);
      setCompareMode(true);
    } finally {
      setIsComparing(false);
    }
  };

  const displayWeeklyData = simResult ? simResult.weekly_history : weeklyData;
  const displayAgents = simResult ? simResult.clusters : agents;
  const displayEvents = simResult ? simResult.events : events;
  const displayStatCards = simResult
    ? [
        { label: "Students", value: String(SCENARIO_MAP[selectedScenario]?.num_students ?? 80), icon: Users },
        { label: "At-risk", value: `${simResult.summary.high_risk_pct}%`, icon: ShieldAlert },
        { label: "AI Adoption", value: `${simResult.summary.avg_ai_usage.toFixed(0)}%`, icon: Bot },
        { label: "Avg Score", value: String(simResult.summary.average_score), icon: Gauge },
      ]
    : statCards;
  const simulationHealth = simResult ? Math.round(100 - simResult.summary.high_risk_pct) : 92;
  const agentStability = simResult ? Math.round(simResult.summary.pass_rate) : 74;

  const singleInsights = useMemo<string[]>(() => {
    if (!simResult) return ["Run the simulation to generate data-driven insights."];
    const { summary, clusters } = simResult;
    const out: string[] = [];

    // Pass rate
    if (summary.pass_rate >= 80) {
      out.push(`${summary.pass_rate}% of students met the passing threshold — a strong outcome for this scenario.`);
    } else if (summary.pass_rate < 60) {
      out.push(`Only ${summary.pass_rate}% of students passed — this scenario needs additional support structures.`);
    } else {
      out.push(`Pass rate of ${summary.pass_rate}% reflects a typical distribution under this instructional model.`);
    }

    // High-risk rate
    if (summary.high_risk_pct >= 20) {
      out.push(`${summary.high_risk_pct}% of students remained at high risk by week 12 — targeted intervention is critical.`);
    } else if (summary.high_risk_pct < 8) {
      out.push(`High-risk rate was held to ${summary.high_risk_pct}% — this scenario effectively contained dropout risk.`);
    } else {
      out.push(`${summary.high_risk_pct}% of students finished at high risk, indicating residual cohort vulnerability.`);
    }

    // AI adoption
    if (summary.avg_ai_usage >= 50) {
      out.push(`AI tool adoption reached ${summary.avg_ai_usage}% — a majority of students engaged with digital support.`);
    } else if (summary.avg_ai_usage >= 10) {
      out.push(`AI adoption reached ${summary.avg_ai_usage}%, concentrated among higher help-seeking students.`);
    }

    // Low-prep cluster vs class average
    const lowPrep = clusters.find((c) => c.name === "Low-Prep Cluster");
    if (lowPrep && lowPrep.score > 0) {
      const gap = Math.round(summary.average_score - lowPrep.score);
      if (gap >= 10) {
        out.push(`The low-prep cluster scored ${gap} points below the class average — the achievement gap persisted under this scenario.`);
      } else if (gap >= 1 && gap <= 4) {
        out.push(`The low-prep cluster tracked within ${gap} points of the class average — the scenario narrowed the achievement gap.`);
      }
    }

    return out.slice(0, 4);
  }, [simResult]);

  const compareInsights = useMemo<string[]>(() => {
    if (!compareResult) return [];
    const s = compareResult.scenarios;
    const names = ALL_SCENARIOS.filter((n) => n in s);
    const out: string[] = [];

    // Best pass rate vs worst
    const bestPass = names.reduce((a, b) => s[a].summary.pass_rate >= s[b].summary.pass_rate ? a : b);
    const worstPass = names.reduce((a, b) => s[a].summary.pass_rate <= s[b].summary.pass_rate ? a : b);
    const passGap = +(s[bestPass].summary.pass_rate - s[worstPass].summary.pass_rate).toFixed(1);
    if (passGap >= 1) {
      out.push(`${bestPass} achieved the highest pass rate at ${s[bestPass].summary.pass_rate}%, ${passGap} points above ${worstPass}.`);
    }

    // Lowest high-risk vs highest
    const lowestRisk = names.reduce((a, b) => s[a].summary.high_risk_pct <= s[b].summary.high_risk_pct ? a : b);
    const highestRisk = names.reduce((a, b) => s[a].summary.high_risk_pct >= s[b].summary.high_risk_pct ? a : b);
    const riskGap = +(s[highestRisk].summary.high_risk_pct - s[lowestRisk].summary.high_risk_pct).toFixed(1);
    if (riskGap >= 1) {
      out.push(`${lowestRisk} had the lowest high-risk rate at ${s[lowestRisk].summary.high_risk_pct}%, ${riskGap} points below ${highestRisk}.`);
    }

    // AI adoption: AI Tutor vs Lecture Only
    if (s["Lecture + AI Tutor"] && s["Lecture Only"]) {
      const aiGap = +(s["Lecture + AI Tutor"].summary.avg_ai_usage - s["Lecture Only"].summary.avg_ai_usage).toFixed(1);
      if (aiGap >= 5) {
        out.push(`AI-supported instruction drove ${aiGap}% more digital tool engagement than lecture-only delivery.`);
      }
    }

    // Best average score vs lecture-only baseline
    const bestScore = names.reduce((a, b) => s[a].summary.average_score >= s[b].summary.average_score ? a : b);
    const baseline = s["Lecture Only"]?.summary.average_score;
    if (baseline !== undefined && bestScore !== "Lecture Only") {
      const scoreGap = +(s[bestScore].summary.average_score - baseline).toFixed(1);
      if (scoreGap >= 1) {
        out.push(`${bestScore} raised the average score by ${scoreGap} points over the lecture-only baseline.`);
      }
    }

    return out.slice(0, 4);
  }, [compareResult]);

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-12 gap-4 p-4 lg:p-5">
        <aside className="col-span-12 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">SimClass</p>
              <p className="text-xs text-slate-500">Education Console</p>
            </div>
          </div>

          <div className="space-y-2">
            {navItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm transition ${
                  label === "World Builder"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Live State
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Simulation health</span>
                  <span className="font-semibold">{simulationHealth}%</span>
                </div>
                <Progress value={simulationHealth} className="h-2" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Agent stability</span>
                  <span className="font-semibold">{agentStability}%</span>
                </div>
                <Progress value={agentStability} className="h-2" />
              </div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 space-y-4 lg:col-span-7">
          {compareMode && compareResult ? (
            <>
              <Card className="rounded-[28px] border-slate-200 shadow-sm">
                <CardContent className="p-4 lg:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Comparison Mode</p>
                      <h1 className="mt-2 text-3xl font-semibold tracking-tight">All Scenarios Side-by-Side</h1>
                    </div>
                    <Button variant="outline" className="rounded-2xl border-slate-200" onClick={() => setCompareMode(false)}>
                      Exit Compare
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                {ALL_SCENARIOS.map((s) => {
                  const d = compareResult.scenarios[s];
                  return (
                    <Card key={s} className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{s}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-semibold">{d.summary.average_score.toFixed(1)}</div>
                        <p className="mt-1 text-xs text-slate-500">avg score · {d.num_students} students</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">Pass Rate</p>
                            <p className="mt-1 text-lg font-semibold">{d.summary.pass_rate}%</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">High Risk</p>
                            <p className="mt-1 text-lg font-semibold">{d.summary.high_risk_pct}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="rounded-[28px] border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Score Trajectories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MultiLineChart
                      data={Object.fromEntries(
                        ALL_SCENARIOS.map((s) => [s, compareResult.scenarios[s].weekly_history])
                      )}
                    />
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      {ALL_SCENARIOS.map((s) => (
                        <span key={s} className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-5 rounded-full" style={{ background: SCENARIO_COLORS[s] }} />
                          {s}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Comparison Table</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-3 text-left font-medium text-slate-400">Metric</th>
                          {ALL_SCENARIOS.map((s) => (
                            <th key={s} className="pb-3 text-left font-medium text-slate-700">
                              {s.replace("Lecture + AI Tutor", "AI Tutor").replace("Adaptive Learning", "Adaptive")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            ["Avg Score", "average_score", (v: number) => v.toFixed(1)],
                            ["Pass Rate", "pass_rate", (v: number) => `${v.toFixed(1)}%`],
                            ["High Risk", "high_risk_pct", (v: number) => `${v.toFixed(1)}%`],
                            ["Confidence", "avg_confidence", (v: number) => `${Math.round(v * 100)}%`],
                            ["Avg Stress", "avg_stress", (v: number) => `${Math.round(v * 100)}%`],
                          ] as [string, keyof SimulationResult["summary"], (v: number) => string][]
                        ).map(([label, key, fmt]) => (
                          <tr key={key} className="border-b border-slate-100">
                            <td className="py-2.5 text-slate-500">{label}</td>
                            {ALL_SCENARIOS.map((s) => (
                              <td key={s} className="py-2.5 font-medium">
                                {fmt(compareResult.scenarios[s].summary[key] as number)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-[28px] border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {compareInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
          <>
          <Card className="rounded-[28px] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
                    Research Simulation
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
                    SimClass — Agent-Based Classroom Simulator
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Select a scenario, run the simulation, and analyze how instructional
                    strategies affect student outcomes across risk levels, AI adoption,
                    and prior knowledge groups.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                    onClick={handleRunSimulation}
                    disabled={isLoading}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isLoading ? "Running…" : "Run Simulation"}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                {displayStatCards.map(({ label, value, icon: Icon }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{label}</span>
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="mt-4 text-3xl font-semibold tracking-tight">
                      {value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[28px] border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Classroom World Graph</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                      network
                    </Badge>
                    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                      live clusters
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative h-[430px] overflow-hidden rounded-[26px] border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.18),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(148,163,184,0.14),transparent_28%),linear-gradient(180deg,#fbfbfc,#f2f4f7)]">
                  <svg className="absolute inset-0 h-full w-full">
                    {displayAgents.flatMap((a, i) =>
                      displayAgents.slice(i + 1).map((b) => (
                        <line
                          key={`${a.name}-${b.name}`}
                          x1={`${a.x}%`}
                          y1={`${a.y}%`}
                          x2={`${b.x}%`}
                          y2={`${b.y}%`}
                          stroke="rgba(100,116,139,0.16)"
                          strokeWidth="1.2"
                        />
                      ))
                    )}
                  </svg>

                  {displayAgents.map((agent) => {
                    const active = selectedAgent.name === agent.name;
                    const risk = agent.riskLevel as "high" | "medium" | "low";

                    const activeColors: Record<string, string> = {
                      high: "bg-red-600 border-red-700 text-white",
                      medium: "bg-amber-500 border-amber-600 text-white",
                      low: "bg-green-600 border-green-700 text-white",
                    };
                    const inactiveColors: Record<string, string> = {
                      high: "bg-red-50 border-red-300 text-red-900 hover:bg-red-100",
                      medium: "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100",
                      low: "bg-green-50 border-green-300 text-green-900 hover:bg-green-100",
                    };
                    const colorClass = active
                      ? (activeColors[risk] ?? activeColors.medium)
                      : (inactiveColors[risk] ?? inactiveColors.medium);

                    // Size encodes performance: score 44→36px, 100→80px
                    const nodePx = Math.max(36, Math.min(80, Math.round(agent.score * 0.72)));

                    // Border glow encodes AI usage
                    const aiGlow =
                      agent.aiUse >= 60
                        ? "0 0 0 3px rgba(59,130,246,0.55), 0 2px 8px rgba(0,0,0,0.10)"
                        : agent.aiUse >= 30
                        ? "0 0 0 2px rgba(59,130,246,0.28), 0 2px 6px rgba(0,0,0,0.08)"
                        : "0 2px 6px rgba(0,0,0,0.08)";

                    return (
                      <button
                        key={agent.name}
                        onClick={() => setSelectedAgent(agent)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition ${colorClass}`}
                        style={{
                          left: `${agent.x}%`,
                          top: `${agent.y}%`,
                          width: `${nodePx}px`,
                          height: `${nodePx}px`,
                          boxShadow: aiGlow,
                        }}
                        title={agent.name}
                      >
                        <span className="text-[11px] font-medium">
                          {Math.round(agent.score)}
                        </span>
                      </button>
                    );
                  })}

                  <div className="absolute bottom-4 left-4 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Waves className="h-4 w-4 text-slate-500" />
                      Cluster legend
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        low risk
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        medium risk
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        high risk
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-blue-400" />
                        high AI use
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="rounded-[28px] border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Research Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {singleInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Selected Cluster</CardTitle>
                    <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                      {selectedAgent.mood}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedAgent.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedAgent.role}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                      <p className="text-xs text-slate-500">cluster score</p>
                      <p className="text-xl font-semibold">
                        {selectedAgent.score}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-500">AI usage</span>
                        <span>{selectedAgent.aiUse}%</span>
                      </div>
                      <Progress value={selectedAgent.aiUse} className="h-2" />
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {selectedAgent.riskLevel === "high"
                      ? selectedAgent.aiUse > 40
                        ? "At-risk cohort with elevated AI tool usage — monitor whether digital support is translating into performance recovery."
                        : "At-risk cohort with low AI engagement — direct instructor outreach may be needed to prevent further disengagement."
                      : selectedAgent.riskLevel === "medium"
                      ? selectedAgent.aiUse > 30
                        ? "Moderate performers with active AI engagement — consistent support could move this group toward the low-risk tier."
                        : "Moderate performers with limited AI usage — peer reinforcement is likely the primary driver of progress."
                      : selectedAgent.aiUse > 30
                      ? "High-achieving cohort with strong AI adoption — performance is stable with low dropout risk."
                      : "High-achieving cohort driven by preparation and motivation, with minimal AI dependency."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="rounded-[28px] border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Learning Trajectory</CardTitle>
              </CardHeader>
              <CardContent>
                <SparkArea values={displayWeeklyData.map((d) => d.score)} />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  {displayWeeklyData.map((d) => (
                    <span key={d.week}>{d.week}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">AI Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBars values={displayWeeklyData.map((d) => d.ai)} />
              </CardContent>
            </Card>
          </div>
          </>
          )}
        </main>

        <aside className="col-span-12 space-y-4 lg:col-span-3">
          <Card className="rounded-[28px] border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Scenario Builder</CardTitle>
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                  Select scenario
                </p>
                <div className="space-y-2">
                  {scenarios.map((item) => (
                    <button
                      key={item}
                      onClick={() => setSelectedScenario(item)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        selectedScenario === item
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    className="mt-1 w-full rounded-2xl border-slate-300"
                    onClick={handleCompare}
                    disabled={isComparing}
                  >
                    {isComparing ? "Comparing…" : "Compare All Scenarios"}
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Cpu className="h-4 w-4" />
                  Model Features
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-white text-slate-700 hover:bg-white">
                    peer influence
                  </Badge>
                  <Badge className="rounded-full bg-white text-slate-700 hover:bg-white">
                    stress events
                  </Badge>
                  <Badge className="rounded-full bg-white text-slate-700 hover:bg-white">
                    risk tracking
                  </Badge>
                  <Badge className="rounded-full bg-white text-slate-700 hover:bg-white">
                    12-week sim
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Event Timeline</CardTitle>
                <Filter className="h-4 w-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayEvents.map((event) => (
                  <div
                    key={`${event.week}-${event.title}`}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {event.title}
                      </p>
                      <Badge className="rounded-full bg-white text-slate-700 hover:bg-white">
                        {event.tag}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{event.week}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {simResult && (
            <Card className="rounded-[28px] border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Subgroup Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 text-left text-xs font-medium text-slate-400">Group</th>
                      <th className="pb-2 text-right text-xs font-medium text-slate-400">Score</th>
                      <th className="pb-2 text-right text-xs font-medium text-slate-400">Pass%</th>
                      <th className="pb-2 text-right text-xs font-medium text-slate-400">Risk%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["low_prior_knowledge", "Low prep"],
                        ["high_prior_knowledge", "High prep"],
                        ["ai_access", "AI access"],
                        ["no_ai_access", "No AI"],
                      ] as [keyof SubgroupData, string][]
                    ).map(([key, label]) => {
                      const sg = simResult.subgroups[key];
                      const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(1));
                      return (
                        <tr key={key} className="border-b border-slate-50">
                          <td className="py-2 text-slate-500">{label}</td>
                          <td className="py-2 text-right font-medium">{fmt(sg.avg_score)}</td>
                          <td className="py-2 text-right font-medium">{fmt(sg.pass_rate)}</td>
                          <td className="py-2 text-right font-medium">{fmt(sg.high_risk_pct)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-slate-400">
                  Prior knowledge split at 0.55 · {simResult.subgroups.low_prior_knowledge.n} low / {simResult.subgroups.high_prior_knowledge.n} high
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[28px] border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Prediction Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-[24px] bg-slate-900 p-5 text-white">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Brain className="h-4 w-4" />
                  Simulation Summary
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Early support and peer reinforcement produce the fastest
                  improvement curves. Delayed intervention can raise AI adoption
                  but does not fully recover disengaged clusters.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}