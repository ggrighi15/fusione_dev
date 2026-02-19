from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Any

AG_ROOT = Path(r"C:\Aggregatto")
CORE_ROOT = AG_ROOT / "Core"
APP_ROOT = CORE_ROOT / "apps" / "APP"
ESPAIDER_ROOT = Path(r"C:\Temp\espaider")
OUT_DIR = AG_ROOT / "outputs" / "automation"


@dataclass
class AutomationEntry:
    id: str
    path: str
    kind: str
    entrypoint: str
    input: List[str]
    output: List[str]
    deps: List[str]
    status: str
    priority: str
    blockers: List[str]


def slug(name: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return base or "item"


def classify_python(path: Path) -> tuple[str, str, list[str], list[str]]:
    n = path.name.lower()
    if n.startswith(("01_", "02_", "03_", "04_", "05_")):
        return "ui_automation", "python " + str(path), [".env.espaider", "ESPAIDER_*"], ["screenshots", "stdout"]
    if n.startswith("09_"):
        return "etl_db", "python " + str(path), [".msg files", "requisicoes.db"], ["SQLite updates", "CSV/JSON export", "report .md"]
    if "agente_triagem_api" in n:
        return "triage_api", "uvicorn agente_triagem_api:app --host 127.0.0.1 --port 8011", ["requisicoes.db"], ["HTTP API"]
    if "agente_triagem_llm" in n:
        return "triage_ai", "python " + str(path), ["requisicoes.db", "optional OPENAI/OLLAMA"], ["agente_triagem_*.csv/json"]
    if "inventario" in n:
        return "inventory", "python " + str(path), ["file paths"], ["inventario_espaider.json"]
    if "orchestrator" in n:
        return "orchestrator", "python " + str(path), ["target_id", "sources"], ["db updates"]
    if "scraper" in n:
        return "scraper", "python " + str(path), ["credentials"], ["scraped payload"]
    return "automation", "python " + str(path), [], []


def precheck_install_script(path: Path) -> Dict[str, Any]:
    text = path.read_text(encoding="utf-8", errors="replace")
    copies = re.findall(r'Copy-Checked\s+"([^"]+)"\s+"([^"]+)"', text)

    is_deprecated = "Write-DeprecatedInstaller" in text
    is_blocked = "BLOCKED:" in text and "throw" in text

    checks = []
    blocked_reasons = []

    for src_raw, dst_raw in copies:
        src = src_raw.replace("$PSScriptRoot", str(APP_ROOT)).replace("$core", str(CORE_ROOT))
        dst = dst_raw.replace("$PSScriptRoot", str(APP_ROOT)).replace("$core", str(CORE_ROOT))
        src_ok = Path(src).exists()
        dst_dir_ok = Path(dst).parent.exists()
        checks.append({
            "source": src,
            "source_exists": src_ok,
            "destination": dst,
            "destination_dir_exists": dst_dir_ok,
        })
        if not src_ok:
            blocked_reasons.append(f"missing source: {src}")
        if not dst_dir_ok:
            blocked_reasons.append(f"missing destination dir: {Path(dst).parent}")

    status = "ready"
    priority = "P2"
    if is_deprecated:
        status = "deprecated"
        priority = "P2"
        blocked_reasons.append("deprecated installer")
    if is_blocked:
        status = "blocked"
        priority = "P0"
        blocked_reasons.append("script intentionally blocked")
    if blocked_reasons and status == "ready":
        status = "blocked"
        priority = "P0"

    return {
        "script": str(path),
        "status": status,
        "priority": priority,
        "checks": checks,
        "blockers": sorted(set(blocked_reasons)),
    }


def build_entries(install_precheck: List[Dict[str, Any]]) -> List[AutomationEntry]:
    entries: List[AutomationEntry] = []

    if ESPAIDER_ROOT.exists():
        for p in sorted(ESPAIDER_ROOT.glob("*.py")):
            kind, entrypoint, inp, out = classify_python(p)
            deps = ["python", "pandas", "python-dotenv", "playwright"] if p.name[:2].isdigit() else ["python"]
            if "agente_triagem" in p.name:
                deps.extend(["fastapi", "pydantic", "sqlite3"])
            status = "ready"
            priority = "P1"
            blockers = []
            if p.name in {"06_exportar_relatorio.py", "07_monitorar_prazos.py", "08_integracao_api.py"}:
                status = "missing"
                priority = "P1"
                blockers = ["referenced in README but not found"]
            entries.append(
                AutomationEntry(
                    id=f"espaider-{slug(p.stem)}",
                    path=str(p),
                    kind=kind,
                    entrypoint=entrypoint,
                    input=inp,
                    output=out,
                    deps=sorted(set(deps)),
                    status=status,
                    priority=priority,
                    blockers=blockers,
                )
            )

    for p in sorted(APP_ROOT.glob("*.py")):
        kind, entrypoint, inp, out = classify_python(p)
        deps = ["python"]
        if "orchestrator" in p.name.lower() or "scraper" in p.name.lower():
            deps.extend(["sqlalchemy", "fc_core"])
        entries.append(
            AutomationEntry(
                id=f"app-{slug(p.stem)}",
                path=str(p),
                kind=kind,
                entrypoint=entrypoint,
                input=inp,
                output=out,
                deps=sorted(set(deps)),
                status="ready",
                priority="P1",
                blockers=[],
            )
        )

    for pre in install_precheck:
        script = Path(pre["script"])
        entries.append(
            AutomationEntry(
                id=f"installer-{slug(script.stem)}",
                path=str(script),
                kind="installer",
                entrypoint=f"powershell -ExecutionPolicy Bypass -File {script}",
                input=["source files", "destination tree"],
                output=["copied modules"],
                deps=["powershell", "python (for patch scripts)"] if script.name == "install_api.ps1" else ["powershell"],
                status=pre["status"],
                priority=pre["priority"],
                blockers=pre["blockers"],
            )
        )

    return entries


def write_markdown(entries: List[AutomationEntry], path: Path) -> None:
    lines = []
    lines.append("# Automation Map")
    lines.append("")
    lines.append("| ID | Kind | Status | Priority | Path |")
    lines.append("|---|---|---|---|---|")
    for e in sorted(entries, key=lambda x: (x.priority, x.status, x.id)):
        lines.append(f"| {e.id} | {e.kind} | {e.status} | {e.priority} | `{e.path}` |")

    lines.append("")
    lines.append("## Blockers")
    for e in entries:
        if e.blockers:
            lines.append(f"- `{e.id}`: " + "; ".join(e.blockers))

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    install_precheck = []
    for script in sorted(APP_ROOT.glob("install_*.ps1")):
        install_precheck.append(precheck_install_script(script))

    entries = build_entries(install_precheck)

    by_status: Dict[str, int] = {}
    for e in entries:
        by_status[e.status] = by_status.get(e.status, 0) + 1

    payload = {
        "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "scope": [str(ESPAIDER_ROOT), str(APP_ROOT)],
        "summary": {
            "total": len(entries),
            "by_status": by_status,
        },
        "entries": [asdict(e) for e in entries],
    }

    (OUT_DIR / "automation_map.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / "installers_precheck.json").write_text(json.dumps(install_precheck, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(entries, OUT_DIR / "automation_map.md")

    print(f"OK: wrote {OUT_DIR / 'automation_map.json'}")
    print(f"OK: wrote {OUT_DIR / 'automation_map.md'}")
    print(f"OK: wrote {OUT_DIR / 'installers_precheck.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

