from __future__ import annotations

import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "apps" / "APP"


def main() -> int:
    errors = []
    installers = sorted(APP.glob("install_*.ps1"))
    if not installers:
        errors.append("No install_*.ps1 scripts found in apps/APP")

    for p in installers:
        text = p.read_text(encoding="utf-8", errors="replace")
        if r"C:\fusionecore-suite" in text:
            errors.append(f"{p.name}: hardcoded legacy path C:\\fusionecore-suite still present")

    canonical = APP / "install_orch_v2.ps1"
    if not canonical.exists():
        errors.append("install_orch_v2.ps1 not found")

    deprecated = ["install_orchestrator.ps1", "install_orchestrator_v2.ps1"]
    for name in deprecated:
        p = APP / name
        if not p.exists():
            errors.append(f"{name} missing")
            continue
        t = p.read_text(encoding="utf-8", errors="replace")
        if "Write-DeprecatedInstaller" not in t:
            errors.append(f"{name} must call Write-DeprecatedInstaller")

    frontend = APP / "install_frontend.ps1"
    if frontend.exists():
        t = frontend.read_text(encoding="utf-8", errors="replace")
        if "BLOCKED:" not in t:
            errors.append("install_frontend.ps1 must stay explicitly BLOCKED")

    common = APP / "_install_common.ps1"
    if not common.exists():
        errors.append("_install_common.ps1 not found")

    if errors:
        print("INSTALLER_PRECHECK_FAILED")
        for e in errors:
            print(f" - {e}")
        return 1

    print("INSTALLER_PRECHECK_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

