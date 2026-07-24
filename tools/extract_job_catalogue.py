"""Normalize the local job-description workbooks into a reviewable JSON catalogue."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "job descriptions"
OUTPUT_FILE = ROOT / "backend" / "data" / "job_catalogue.json"

WORKBOOK_JOB_OVERRIDES = {
    "2026_07_03 Chocolaterie.xlsx": ("chocolate-confectionery-worker", "Chocolate / Confectionery Worker"),
    "2026_07_03 Glacerie.xlsx": ("ice-cream-maker", "Ice Cream Maker"),
    "2026_07_03 Pat Boulang.xlsx": ("bakery-pastry-worker", "Bakery / Pastry Worker"),
}

SHEET_DISABILITIES = {
    "h 1 main": ("hand", "Hand"),
    "h 1 avant bras": ("forearm", "Forearm"),
    "h 1 bras": ("arm", "Arm"),
    "h 2 mains": ("both-hands", "Both Hands"),
    "h 2 avant bras": ("both-forearms", "Both Forearms"),
    "h 2 bras": ("both-arms", "Both Arms"),
    "h 1 cheville": ("ankle", "Ankle"),
    "h 1 cheville & jambe": ("leg", "Leg"),
    "h 1 pieds": ("knee", "Knee"),
    "h 2 chevilles": ("both-ankles", "Both Ankles"),
    "h 2 chevilles jambes": ("both-legs", "Both Legs"),
    "h 2 jambes": ("both-knees", "Both Knees"),
    "h 2 pieds": ("both-knees", "Both Knees"),
    "h 1 avc": ("cva", "CVA"),
    "h fauteuil": ("wheelchair", "Wheelchair"),
    "h fauteuil ventre m": ("pelvis-legs-wheelchair", "Pelvis Legs Wheelchair"),
    "h fauteuil sangl": ("waist-wheelchair", "Waist Wheelchair"),
}


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def assessment_for_row(sheet, row: int) -> str | None:
    # The workbook uses filled numeric cells: F=green, G=orange, H=red.
    # When colors overlap, retain the most restrictive result.
    if sheet.cell(row, 8).value is not None:
        return "avoid"
    if sheet.cell(row, 7).value is not None:
        return "needs_assistance"
    if sheet.cell(row, 6).value is not None:
        return "feasible"
    return None


def infer_job(source: Path, workbook) -> tuple[str, str]:
    override = WORKBOOK_JOB_OVERRIDES.get(source.name)
    if override:
        return override

    for sheet in workbook.worksheets[1:]:
        for row in range(19, min(sheet.max_row, 35) + 1):
            english = clean(sheet.cell(row, 3).value)
            next_english = clean(sheet.cell(row + 1, 3).value)
            if english and english.lower() != "position" and next_english.lower() in {"", "personal education"}:
                name = english
                return normalized_key(name), name

    raise ValueError(f"Could not infer the job name from {source.name}")


def extract_catalogue(sources: list[Path]) -> dict:
    jobs = []
    disabilities: dict[str, str] = {}
    warnings = []

    if not sources:
        raise FileNotFoundError("No .xlsx workbooks were supplied.")

    used_slugs = set()
    for source in sources:
        filename = source.name
        # Uploaded files commonly have extensionless temporary paths. Opening the
        # validated file as a binary stream lets OpenPyXL inspect the OOXML archive
        # itself instead of rejecting PHP's temporary filename.
        with source.open("rb") as workbook_stream:
            workbook = load_workbook(workbook_stream, data_only=True)
        job_slug, job_name = infer_job(source, workbook)
        if job_slug in used_slugs:
            raise ValueError(f"Duplicate inferred job slug {job_slug!r} from {filename}")
        used_slugs.add(job_slug)
        extracted_by_disability = {}

        for sheet in workbook.worksheets[1:]:
            sheet_key = clean(sheet.title).lower()
            disability = SHEET_DISABILITIES.get(sheet_key)
            if disability is None:
                warnings.append(f"{filename}: unrecognized disability sheet {sheet.title!r}")
                continue

            disability_slug, disability_name = disability
            disabilities[disability_slug] = disability_name
            occurrences: defaultdict[str, int] = defaultdict(int)
            rows = []

            for row_number in range(19, sheet.max_row + 1):
                task_name = clean(sheet.cell(row_number, 3).value)
                feasibility = assessment_for_row(sheet, row_number)
                if not task_name or feasibility is None:
                    continue

                base_key = normalized_key(task_name)
                occurrences[base_key] += 1
                task_key = f"{base_key}-{occurrences[base_key]}"
                rows.append({
                    "taskKey": task_key,
                    "name": task_name,
                    "sourceRow": row_number,
                    "feasibility": feasibility,
                })

            extracted_by_disability[disability_slug] = {
                "name": disability_name,
                "sheet": sheet.title,
                "rows": rows,
            }

        task_records = {}
        assessments = []
        for disability_slug, disability_data in extracted_by_disability.items():
            for position, row in enumerate(disability_data["rows"], start=1):
                task = task_records.setdefault(row["taskKey"], {
                    "key": row["taskKey"],
                    "name": row["name"],
                    "position": position,
                })
                if task["name"].casefold() != row["name"].casefold():
                    warnings.append(
                        f"{filename}/{disability_data['sheet']}: task key collision for {row['taskKey']}"
                    )
                assessments.append({
                    "taskKey": row["taskKey"],
                    "disability": disability_slug,
                    "feasibility": row["feasibility"],
                    "sourceSheet": disability_data["sheet"],
                    "sourceRow": row["sourceRow"],
                })

        tasks = sorted(task_records.values(), key=lambda item: (item["position"], item["key"]))
        for position, task in enumerate(tasks, start=1):
            task["position"] = position

        expected = len(tasks) * len(extracted_by_disability)
        if len(assessments) != expected:
            warnings.append(
                f"{filename}: {len(assessments)} assessments present; "
                f"{expected} would be required for a complete matrix"
            )

        jobs.append({
            "slug": job_slug,
            "name": job_name,
            "sourceWorkbook": filename,
            "tasks": tasks,
            "assessments": assessments,
            "matrix": {
                "disabilityCount": len(extracted_by_disability),
                "taskCount": len(tasks),
                "assessmentCount": len(assessments),
                "expectedAssessmentCount": expected,
                "complete": len(assessments) == expected,
            },
        })

    return {
        "schemaVersion": 1,
        "feasibilityValues": ["feasible", "needs_assistance", "avoid"],
        "disabilities": [
            {"slug": slug, "name": name}
            for slug, name in sorted(disabilities.items())
        ],
        "jobs": jobs,
        "warnings": warnings,
    }



def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "workbooks",
        nargs="*",
        type=Path,
        help="Specific .xlsx workbooks. Defaults to every workbook in the local source folder.",
    )
    parser.add_argument("--stdout", action="store_true", help="Write only normalized JSON to stdout.")
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE, help="Catalogue JSON output path.")
    args = parser.parse_args()

    sources = args.workbooks or sorted(SOURCE_DIR.glob("*.xlsx"))
    for source in sources:
        if not source.is_file():
            raise ValueError(f"Missing workbook: {source}")

    output = extract_catalogue(sources)
    rendered = json.dumps(output, indent=2, ensure_ascii=False) + "\n"
    if args.stdout:
        print(rendered, end="")
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(f"Wrote {args.output}")
    for job in output["jobs"]:
        matrix = job["matrix"]
        print(
            f"{job['name']}: {matrix['taskCount']} tasks, "
            f"{matrix['disabilityCount']} disabilities, "
            f"{matrix['assessmentCount']}/{matrix['expectedAssessmentCount']} assessments"
        )
    print(f"Warnings: {len(output['warnings'])}")


if __name__ == "__main__":
    main()
