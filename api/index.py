import random
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# -----------------------------
# Data Model
# -----------------------------
@dataclass
class StudentAgent:
    student_id: int
    prior_knowledge: float
    motivation: float
    study_habits: float
    ai_access: bool
    performance: float
    confidence: float
    help_seeking: float
    ai_trust: float
    stress: float
    peer_group: List[int] = field(default_factory=list)
    memory: List[str] = field(default_factory=list)
    used_ai_last_week: bool = False
    risk_level: str = "medium"

    def update_risk(self) -> None:
        if self.performance < 60:
            self.risk_level = "high"
        elif self.performance < 70:
            self.risk_level = "medium"
        else:
            self.risk_level = "low"

    def remember(self, event: str) -> None:
        self.memory.append(event)
        self.memory = self.memory[-5:]


# -----------------------------
# Agent / Scenario Creation
# -----------------------------
def create_students(num_students: int, ai_access_rate: float, seed: int) -> List[StudentAgent]:
    random.seed(seed)
    students: List[StudentAgent] = []

    for i in range(num_students):
        prior_knowledge = random.uniform(0.2, 0.9)
        motivation = random.uniform(0.3, 0.95)
        study_habits = random.uniform(0.2, 0.9)
        confidence = random.uniform(0.3, 0.9)
        help_seeking = random.uniform(0.2, 0.95)
        ai_trust = random.uniform(0.2, 0.95)
        stress = random.uniform(0.1, 0.5)
        ai_access = random.random() < ai_access_rate

        base_performance = 35 + (prior_knowledge * 25) + (motivation * 15) + (study_habits * 15)
        base_performance += random.uniform(-5, 5)
        base_performance = max(0, min(100, base_performance))

        student = StudentAgent(
            student_id=i + 1,
            prior_knowledge=prior_knowledge,
            motivation=motivation,
            study_habits=study_habits,
            ai_access=ai_access,
            performance=base_performance,
            confidence=confidence,
            help_seeking=help_seeking,
            ai_trust=ai_trust,
            stress=stress,
        )
        student.update_risk()
        students.append(student)

    ids = [student.student_id for student in students]
    for student in students:
        peer_candidates = [sid for sid in ids if sid != student.student_id]
        peer_count = min(len(peer_candidates), random.randint(3, 6))
        student.peer_group = random.sample(peer_candidates, peer_count)

    return students


def get_scenario_parameters(scenario_name: str) -> Dict:
    scenarios = {
        "Lecture Only": {
            "num_students": 60,
            "ai_access_rate": 0.0,
            "knowledge_boost": 1.8,
            "motivation_boost": -0.02,
            "ai_bonus": 0.0,
            "adaptive_bonus": 0.0,
            "peer_influence_strength": 0.10,
        },
        "Lecture + AI Tutor": {
            "num_students": 80,
            "ai_access_rate": 0.6,
            "knowledge_boost": 2.1,
            "motivation_boost": 0.01,
            "ai_bonus": 1.5,
            "adaptive_bonus": 0.0,
            "peer_influence_strength": 0.14,
        },
        "Adaptive Learning": {
            "num_students": 120,
            "ai_access_rate": 0.7,
            "knowledge_boost": 2.2,
            "motivation_boost": 0.02,
            "ai_bonus": 1.0,
            "adaptive_bonus": 1.3,
            "peer_influence_strength": 0.12,
        },
    }
    return scenarios[scenario_name]


def apply_classroom_event(students: List[StudentAgent], week: int) -> str:
    if week == 4:
        for student in students:
            student.stress = min(1.0, student.stress + 0.08)
            student.remember("Quiz pressure increased stress")
        return "Quiz week increased stress across the classroom."

    if week == 8:
        for student in students:
            if student.risk_level == "high":
                student.motivation = min(1.0, student.motivation + 0.08)
                student.help_seeking = min(1.0, student.help_seeking + 0.05)
                student.remember("Support intervention boosted motivation")
        return "Instructor support intervention targeted high-risk students."

    if week == 10:
        for student in students:
            student.stress = min(1.0, student.stress + 0.12)
            student.remember("Midterm pressure increased stress")
        return "Midterm week sharply increased stress."

    return "Normal instructional week."


# -----------------------------
# Simulation Logic
# -----------------------------
def simulate_week(student: StudentAgent, params: Dict[str, float], peer_lookup: Dict[int, StudentAgent]) -> None:
    peer_scores = [peer_lookup[peer_id].performance for peer_id in student.peer_group if peer_id in peer_lookup]
    peer_ai_usage = [peer_lookup[peer_id].used_ai_last_week for peer_id in student.peer_group if peer_id in peer_lookup]

    avg_peer_score = sum(peer_scores) / len(peer_scores) if peer_scores else student.performance
    peer_ai_adoption = sum(peer_ai_usage) / len(peer_ai_usage) if peer_ai_usage else 0

    peer_motivation_effect = 0.0
    if avg_peer_score > student.performance:
        peer_motivation_effect = params["peer_influence_strength"] * 0.6
    elif avg_peer_score + 8 < student.performance:
        peer_motivation_effect = -params["peer_influence_strength"] * 0.2

    ai_probability = 0.0
    if student.ai_access:
        ai_probability = (student.ai_trust * 0.45) + (student.help_seeking * 0.25) + (peer_ai_adoption * 0.20) + (student.stress * 0.10)
    used_ai = student.ai_access and random.random() < min(1.0, ai_probability)
    student.used_ai_last_week = used_ai

    engagement = (
        (student.motivation * 0.35)
        + (student.study_habits * 0.30)
        + (student.prior_knowledge * 0.15)
        + (student.confidence * 0.10)
        + (student.help_seeking * 0.10)
    )
    engagement += peer_motivation_effect
    engagement -= student.stress * 0.15
    engagement = max(0.05, min(1.2, engagement))

    noise = random.uniform(-0.7, 0.7)
    weekly_gain = params["knowledge_boost"] * engagement + noise

    if used_ai:
        weekly_gain += params["ai_bonus"] * (0.5 + student.study_habits * 0.5)
        student.remember("Used AI support this week")

    if params["adaptive_bonus"] > 0:
        need_factor = max(0, (70 - student.performance) / 70)
        weekly_gain += params["adaptive_bonus"] * need_factor

    if avg_peer_score > student.performance + 10:
        weekly_gain += 0.25
        student.remember("Peers positively influenced study effort")

    student.performance += weekly_gain
    student.performance = max(0, min(100, student.performance))

    if student.performance >= 75:
        student.motivation += 0.02 + params["motivation_boost"]
        student.confidence += 0.02
        student.stress -= 0.01
    elif student.performance < 55:
        student.motivation -= 0.03
        student.confidence -= 0.02
        student.stress += 0.03
        student.remember("Low performance reduced confidence")
    else:
        student.motivation += params["motivation_boost"]

    if used_ai and student.performance >= 65:
        student.ai_trust = min(1.0, student.ai_trust + 0.03)
    elif used_ai and student.performance < 55:
        student.ai_trust = max(0.1, student.ai_trust - 0.01)

    student.motivation = max(0.1, min(1.0, student.motivation))
    student.confidence = max(0.1, min(1.0, student.confidence))
    student.stress = max(0.0, min(1.0, student.stress))
    student.update_risk()


def run_simulation(
    num_students: int,
    weeks: int,
    scenario_name: str,
    ai_access_rate: float,
    seed: int,
) -> Dict[str, pd.DataFrame]:
    random.seed(seed)
    students = create_students(num_students=num_students, ai_access_rate=ai_access_rate, seed=seed)
    params = get_scenario_parameters(scenario_name)

    history = []

    for week in range(1, weeks + 1):
        event_text = apply_classroom_event(students, week)
        peer_lookup = {student.student_id: student for student in students}

        for student in students:
            simulate_week(student, params, peer_lookup)

        avg_score = sum(s.performance for s in students) / len(students)
        pass_rate = sum(1 for s in students if s.performance >= 60) / len(students)
        high_risk_rate = sum(1 for s in students if s.risk_level == "high") / len(students)
        ai_usage_rate = sum(1 for s in students if s.used_ai_last_week) / len(students)
        avg_motivation = sum(s.motivation for s in students) / len(students)
        avg_stress = sum(s.stress for s in students) / len(students)

        history.append(
            {
                "week": week,
                "event": event_text,
                "average_score": round(avg_score, 2),
                "pass_rate": round(pass_rate * 100, 2),
                "high_risk_rate": round(high_risk_rate * 100, 2),
                "ai_usage_rate": round(ai_usage_rate * 100, 2),
                "average_motivation": round(avg_motivation, 2),
                "average_stress": round(avg_stress, 2),
            }
        )

    student_rows = [asdict(s) for s in students]
    final_df = pd.DataFrame(student_rows)
    history_df = pd.DataFrame(history)

    return {"history": history_df, "final": final_df}


# -----------------------------
# Metrics
# -----------------------------
def summarize_results(final_df: pd.DataFrame) -> Dict[str, float]:
    return {
        "average_score": round(float(final_df["performance"].mean()), 2),
        "pass_rate": round(float((final_df["performance"] >= 60).mean() * 100), 2),
        "high_risk_pct": round(float((final_df["risk_level"] == "high").mean() * 100), 2),
        "low_risk_pct": round(float((final_df["risk_level"] == "low").mean() * 100), 2),
        "avg_confidence": round(float(final_df["confidence"].mean()), 2),
        "avg_stress": round(float(final_df["stress"].mean()), 2),
        "avg_ai_usage": round(float(final_df["used_ai_last_week"].mean() * 100), 2),
    }


# -----------------------------
# Subgroup Analysis
# -----------------------------
def _subgroup_metrics(subset: pd.DataFrame) -> dict:
    n = len(subset)
    if n == 0:
        return {"n": 0, "avg_score": None, "pass_rate": None, "high_risk_pct": None}
    return {
        "n": n,
        "avg_score": round(float(subset["performance"].mean()), 1),
        "pass_rate": round(float((subset["performance"] >= 60).mean() * 100), 1),
        "high_risk_pct": round(float((subset["risk_level"] == "high").mean() * 100), 1),
    }


def build_subgroups(final_df: pd.DataFrame) -> dict:
    return {
        "low_prior_knowledge": _subgroup_metrics(final_df[final_df["prior_knowledge"] < 0.55]),
        "high_prior_knowledge": _subgroup_metrics(final_df[final_df["prior_knowledge"] >= 0.55]),
        "ai_access": _subgroup_metrics(final_df[final_df["ai_access"] == True]),
        "no_ai_access": _subgroup_metrics(final_df[final_df["ai_access"] == False]),
    }


# -----------------------------
# Cluster Builder
# -----------------------------
CLUSTER_DEFS = [
    {
        "name": "Low-Prep Cluster",
        "role": "At-risk learners",
        "filter": lambda df: df[(df["risk_level"] == "high") & (df["prior_knowledge"] < 0.55)],
        "risk": "high",
        "x": 18, "y": 58,
    },
    {
        "name": "High-Achiever Pod",
        "role": "Peer leaders",
        "filter": lambda df: df[df["risk_level"] == "low"],
        "risk": "low",
        "x": 72, "y": 24,
    },
    {
        "name": "Commuter Students",
        "role": "Low time availability",
        "filter": lambda df: df[(df["stress"] > 0.55) & (df["risk_level"] == "medium")],
        "risk": "medium",
        "x": 30, "y": 30,
    },
    {
        "name": "Quiet Performers",
        "role": "Independent learners",
        "filter": lambda df: df[(df["risk_level"] == "medium") & (df["stress"] <= 0.55)],
        "risk": "medium",
        "x": 56, "y": 58,
    },
    {
        "name": "Office Hours Group",
        "role": "Support responders",
        "filter": lambda df: df[(df["risk_level"] == "high") & (df["used_ai_last_week"] == True)],
        "risk": "high",
        "x": 79, "y": 69,
    },
    {
        "name": "Disengaged Cluster",
        "role": "Low participation",
        "filter": lambda df: df[(df["risk_level"] == "high") & (df["used_ai_last_week"] == False)],
        "risk": "high",
        "x": 12, "y": 22,
    },
]


def mood_from_score(score: float) -> str:
    if score >= 80:
        return "stable"
    if score >= 72:
        return "steady"
    if score >= 65:
        return "recovering"
    if score >= 60:
        return "strained"
    if score >= 50:
        return "fragile"
    return "high-risk"


def build_clusters(final_df: pd.DataFrame) -> list:
    total = max(len(final_df), 1)
    clusters = []
    for defn in CLUSTER_DEFS:
        subset = defn["filter"](final_df)
        n = len(subset)
        score = round(float(subset["performance"].mean()), 1) if n > 0 else 50.0
        ai_use = round(float(subset["used_ai_last_week"].mean() * 100)) if n > 0 else 0
        size = max(8, min(20, int(8 + (n / total) * 60)))
        clusters.append({
            "name": defn["name"],
            "role": defn["role"],
            "score": score,
            "mood": mood_from_score(score),
            "aiUse": ai_use,
            "riskLevel": defn["risk"],
            "x": defn["x"],
            "y": defn["y"],
            "size": size,
        })
    return clusters


# -----------------------------
# Event Builder
# -----------------------------
def build_events(history_df: pd.DataFrame) -> list:
    events = []
    for _, row in history_df.iterrows():
        text = row["event"]
        if text == "Normal instructional week.":
            continue
        if "Quiz" in text:
            tag = "stress"
        elif "intervention" in text or "support" in text.lower():
            tag = "support"
        elif "Midterm" in text:
            tag = "stress"
        else:
            tag = "event"
        events.append({"week": f"Week {int(row['week'])}", "title": text, "tag": tag})
    return events


# -----------------------------
# Helpers
# -----------------------------
def _weekly_row(row: pd.Series, include_event: bool = False) -> dict:
    d = {
        "week": f"W{int(row['week'])}",
        "score": row["average_score"],
        "risk": row["high_risk_rate"],
        "ai": row["ai_usage_rate"],
    }
    if include_event:
        d["event"] = row["event"]
    return d


# -----------------------------
# FastAPI App
# -----------------------------
SCENARIOS = ["Lecture Only", "Lecture + AI Tutor", "Adaptive Learning"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    scenario: str
    num_students: int = 80
    weeks: int = 12
    ai_access_rate: float = 0.6
    seed: int = 42


@app.get("/api/scenarios")
def get_scenarios():
    return {"scenarios": SCENARIOS}


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    results = run_simulation(
        req.num_students, req.weeks, req.scenario, req.ai_access_rate, req.seed
    )
    history_df = results["history"]
    final_df = results["final"]
    summary = summarize_results(final_df)

    weekly_history = [_weekly_row(row, include_event=True) for _, row in history_df.iterrows()]

    return {
        "summary": summary,
        "weekly_history": weekly_history,
        "clusters": build_clusters(final_df),
        "events": build_events(history_df),
        "subgroups": build_subgroups(final_df),
    }


class CompareRequest(BaseModel):
    weeks: int = 12
    ai_access_rate: float = 0.6
    seed: int = 42


@app.post("/api/simulate/compare")
def simulate_compare(req: CompareRequest):
    out: Dict[str, dict] = {}
    for scenario in SCENARIOS:
        params = get_scenario_parameters(scenario)
        num_students = params["num_students"]
        ai_access_rate = params["ai_access_rate"]
        results = run_simulation(num_students, req.weeks, scenario, ai_access_rate, req.seed)
        history_df = results["history"]
        final_df = results["final"]
        out[scenario] = {
            "summary": summarize_results(final_df),
            "num_students": num_students,
            "weekly_history": [_weekly_row(row) for _, row in history_df.iterrows()],
            "subgroups": build_subgroups(final_df),
        }
    return {"scenarios": out}
