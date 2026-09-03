from __future__ import annotations

from flask import Flask, jsonify, request

from .engine import ScoringEngine
from .models import Candidate, Job, Task
from .serialization import result_to_dict


def create_app() -> Flask:
    app = Flask(__name__)
    engine = ScoringEngine()

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "engine": "deterministic-scoring"})

    @app.post("/score")
    def score():
        try:
            payload = request.get_json(force=True)
            candidate = _candidate_from_dict(payload["candidate"])
            jobs = tuple(_job_from_dict(job) for job in payload["jobs"])
            results = [engine.evaluate(candidate, job) for job in jobs]
            results.sort(key=lambda result: (not result.eligible, -(result.score or 0), str(result.job_title)))
            return jsonify({"results": [result_to_dict(result) for result in results]})
        except (KeyError, TypeError, ValueError) as error:
            return jsonify({"message": str(error)}), 400

    return app


def _candidate_from_dict(data: dict) -> Candidate:
    return Candidate(
        candidate_id=data["id"],
        education_level=data["educationLevel"],
        disability_slugs=tuple(data.get("disabilities", ())),
        reading_ability=data.get("readingAbility") or "not_yet",
        writing_ability=data.get("writingAbility") or "not_yet",
        numeracy_ability=data.get("numeracyAbility") or "not_yet",
        position_knowledge=data.get("positionKnowledgeLevel"),
    )


def _job_from_dict(data: dict) -> Job:
    return Job(
        job_id=data["id"],
        title=data["title"],
        minimum_education_level=data.get("minimumEducationLevel") or "none",
        assistance_available=bool(data.get("assistanceAvailable", False)),
        education_requirement=data.get("educationRequirement") or "not_required",
        reading_requirement=data.get("readingRequirement") or "not_required",
        writing_requirement=data.get("writingRequirement") or "not_required",
        numeracy_requirement=data.get("numeracyRequirement") or "not_required",
        position_knowledge_requirement=data.get("positionKnowledgeRequirement") or "not_required",
        tasks=tuple(
            Task(
                task_id=task["id"],
                name=task["name"],
                weight=float(task.get("weight", 1)),
                mandatory=bool(task.get("mandatory", False)),
                highlighted=bool(task.get("highlighted", False)),
                assessments=task.get("assessments", {}),
            )
            for task in data["tasks"]
        ),
    )


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
