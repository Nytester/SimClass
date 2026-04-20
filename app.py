import random
from dataclasses import dataclass, asdict, field
from typing import List, Dict

import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt


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
        if self.performance < 50:
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


def get_scenario_parameters(scenario_name: str) -> Dict[str, float]:
    scenarios = {
        "Lecture Only": {
            "knowledge_boost": 1.8,
            "motivation_boost": -0.02,
            "ai_bonus": 0.0,
            "adaptive_bonus": 0.0,
            "peer_influence_strength": 0.10,
        },
        "Lecture + AI Tutor": {
            "knowledge_boost": 2.1,
            "motivation_boost": 0.01,
            "ai_bonus": 1.5,
            "adaptive_bonus": 0.0,
            "peer_influence_strength": 0.14,
        },
        "Adaptive Learning": {
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

    return {
        "history": history_df,
        "final": final_df,
    }


# -----------------------------
# Metrics
# -----------------------------
def summarize_results(final_df: pd.DataFrame) -> Dict[str, float]:
    average_score = float(final_df["performance"].mean())
    pass_rate = float((final_df["performance"] >= 60).mean() * 100)
    high_risk_pct = float((final_df["risk_level"] == "high").mean() * 100)
    low_risk_pct = float((final_df["risk_level"] == "low").mean() * 100)
    avg_confidence = float(final_df["confidence"].mean())
    avg_stress = float(final_df["stress"].mean())

    return {
        "average_score": round(average_score, 2),
        "pass_rate": round(pass_rate, 2),
        "high_risk_pct": round(high_risk_pct, 2),
        "low_risk_pct": round(low_risk_pct, 2),
        "avg_confidence": round(avg_confidence, 2),
        "avg_stress": round(avg_stress, 2),
    }


# -----------------------------
# Multi-Scenario Comparison
# -----------------------------
SCENARIOS = ["Lecture Only", "Lecture + AI Tutor", "Adaptive Learning"]


def run_all_scenarios(num_students: int, weeks: int, ai_access_rate: float, seed: int) -> Dict[str, Dict]:
    return {name: run_simulation(num_students, weeks, name, ai_access_rate, seed) for name in SCENARIOS}


def build_comparison_df(all_results: Dict[str, Dict]) -> pd.DataFrame:
    rows = []
    for scenario_name, results in all_results.items():
        final_df = results["final"]
        history_df = results["history"]
        summary = summarize_results(final_df)
        rows.append({
            "Scenario": scenario_name,
            "Avg Final Score": summary["average_score"],
            "Pass Rate (%)": summary["pass_rate"],
            "High-Risk (%)": summary["high_risk_pct"],
            "Avg Stress": summary["avg_stress"],
            "AI Usage Rate (%)": round(history_df["ai_usage_rate"].mean(), 2),
        })
    return pd.DataFrame(rows).set_index("Scenario")


def build_subgroup_df(final_df: pd.DataFrame) -> pd.DataFrame:
    def metrics(df: pd.DataFrame, label: str) -> dict:
        if df.empty:
            return {}
        return {
            "Subgroup": label,
            "N": len(df),
            "Avg Score": round(df["performance"].mean(), 2),
            "Pass Rate (%)": round((df["performance"] >= 60).mean() * 100, 2),
            "High-Risk (%)": round((df["risk_level"] == "high").mean() * 100, 2),
            "Avg Stress": round(df["stress"].mean(), 2),
        }

    subgroups = [
        metrics(final_df[final_df["prior_knowledge"] < 0.55], "Low Prior Knowledge"),
        metrics(final_df[final_df["prior_knowledge"] >= 0.55], "High Prior Knowledge"),
        metrics(final_df[final_df["ai_access"] == True], "With AI Access"),
        metrics(final_df[final_df["ai_access"] == False], "Without AI Access"),
    ]
    return pd.DataFrame([r for r in subgroups if r]).set_index("Subgroup")


# -----------------------------
# UI
# -----------------------------
st.set_page_config(page_title="SimClass MVP", layout="wide")
st.title("SimClass MVP")
st.subheader("A starter simulation for testing AI-driven teaching strategies")

with st.sidebar:
    st.header("Simulation Controls")
    scenario = st.selectbox(
        "Teaching Scenario",
        ["Lecture Only", "Lecture + AI Tutor", "Adaptive Learning"],
    )
    num_students = st.slider("Number of Students", min_value=20, max_value=200, value=80, step=10)
    weeks = st.slider("Number of Weeks", min_value=4, max_value=16, value=12, step=1)
    ai_access_rate = st.slider("AI Access Rate", min_value=0.0, max_value=1.0, value=0.6, step=0.1)
    seed = st.number_input("Random Seed", min_value=1, max_value=9999, value=42, step=1)

    run_button = st.button("Run Simulation", use_container_width=True)
    compare_button = st.button("Compare All Scenarios", use_container_width=True)

st.markdown(
    """
This MVP simulates a classroom of student agents with different levels of prior knowledge,
motivation, study habits, and AI access. It compares how teaching strategies affect learning
outcomes over time.
"""
)

if run_button:
    results = run_simulation(
        num_students=num_students,
        weeks=weeks,
        scenario_name=scenario,
        ai_access_rate=ai_access_rate,
        seed=seed,
    )

    history_df = results["history"]
    final_df = results["final"]
    summary = summarize_results(final_df)

    col1, col2, col3, col4, col5, col6 = st.columns(6)
    col1.metric("Average Final Score", summary["average_score"])
    col2.metric("Pass Rate (%)", summary["pass_rate"])
    col3.metric("High-Risk Students (%)", summary["high_risk_pct"])
    col4.metric("Low-Risk Students (%)", summary["low_risk_pct"])
    col5.metric("Avg Confidence", summary["avg_confidence"])
    col6.metric("Avg Stress", summary["avg_stress"]) 

    st.divider()

    chart_col1, chart_col2 = st.columns(2)

    with chart_col1:
        st.markdown("### Average Score Over Time")
        fig1, ax1 = plt.subplots(figsize=(8, 4))
        ax1.plot(history_df["week"], history_df["average_score"])
        ax1.set_xlabel("Week")
        ax1.set_ylabel("Average Score")
        ax1.set_title("Average Score by Week")
        st.pyplot(fig1)

    with chart_col2:
        st.markdown("### Pass Rate Over Time")
        fig2, ax2 = plt.subplots(figsize=(8, 4))
        ax2.plot(history_df["week"], history_df["pass_rate"])
        ax2.set_xlabel("Week")
        ax2.set_ylabel("Pass Rate (%)")
        ax2.set_title("Pass Rate by Week")
        st.pyplot(fig2)

    chart_col3, chart_col4 = st.columns(2)

    with chart_col3:
        st.markdown("### AI Usage Over Time")
        fig3, ax3 = plt.subplots(figsize=(8, 4))
        ax3.plot(history_df["week"], history_df["ai_usage_rate"])
        ax3.set_xlabel("Week")
        ax3.set_ylabel("AI Usage (%)")
        ax3.set_title("AI Usage by Week")
        st.pyplot(fig3)

    with chart_col4:
        st.markdown("### Stress Over Time")
        fig4, ax4 = plt.subplots(figsize=(8, 4))
        ax4.plot(history_df["week"], history_df["average_stress"])
        ax4.set_xlabel("Week")
        ax4.set_ylabel("Average Stress")
        ax4.set_title("Stress by Week")
        st.pyplot(fig4)

    st.markdown("### Final Performance Distribution")
    fig5, ax5 = plt.subplots(figsize=(8, 4))
    ax5.hist(final_df["performance"], bins=12)
    ax5.set_xlabel("Final Performance")
    ax5.set_ylabel("Number of Students")
    ax5.set_title("Distribution of Final Scores")
    st.pyplot(fig5)

    st.markdown("### Weekly Classroom Events")
    st.dataframe(history_df[["week", "event", "average_score", "pass_rate", "ai_usage_rate", "average_stress"]], use_container_width=True)

    st.markdown("### Final Student Data")
    st.dataframe(final_df, use_container_width=True)

    csv = final_df.to_csv(index=False).encode("utf-8")
    st.download_button(
        label="Download Final Results CSV",
        data=csv,
        file_name="simclass_results.csv",
        mime="text/csv",
        use_container_width=True,
    )
elif compare_button:
    with st.spinner("Running all three scenarios..."):
        all_results = run_all_scenarios(num_students, weeks, ai_access_rate, seed)

    st.markdown("## Scenario Comparison")
    comparison_df = build_comparison_df(all_results)
    st.dataframe(comparison_df, use_container_width=True)

    comparison_json = comparison_df.reset_index().to_dict(orient="records")
    st.download_button(
        label="Download Comparison JSON",
        data=__import__("json").dumps(comparison_json, indent=2),
        file_name="scenario_comparison.json",
        mime="application/json",
        use_container_width=True,
    )

    st.divider()
    st.markdown("## Subgroup Analysis by Scenario")

    for scenario_name, results in all_results.items():
        st.markdown(f"### {scenario_name}")
        subgroup_df = build_subgroup_df(results["final"])
        st.dataframe(subgroup_df, use_container_width=True)

else:
    st.info("Set your parameters in the sidebar, then click 'Run Simulation' or 'Compare All Scenarios'.")


# -----------------------------
# Run Instructions
# -----------------------------
# Save this file as app.py, then run:
#   pip install streamlit pandas matplotlib
#   streamlit run app.py
