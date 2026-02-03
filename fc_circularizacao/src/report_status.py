from __future__ import annotations
import csv
from pathlib import Path
from fc_circularize.settings import load_settings
from fc_circularize.db import db_session
from fc_circularize.util import now_iso

def main():
    s = load_settings()
    out_dir = Path("./outputs/reports")
    out_dir.mkdir(parents=True, exist_ok=True)

    with db_session(s.db_path) as conn:
        cycle = conn.execute(
            "SELECT cycle_id, year, quarter, opened_at FROM circularization_cycle WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1"
        ).fetchone()
        if not cycle:
            raise RuntimeError("Nao existe ciclo OPEN.")
        cycle_id = cycle["cycle_id"]

        rows = conn.execute(
            """SELECT recipient_key, cliente, escritorio, email, owner, escopo, status, last_event_at, next_action_at, notes
               FROM circularization_recipient WHERE cycle_id=? ORDER BY cliente""",
            (cycle_id,)
        ).fetchall()

    csv_path = out_dir / f"status_{cycle_id}.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["recipient_key","cliente","escritorio","email","owner","escopo","status","last_event_at","next_action_at","notes"])
        for r in rows:
            w.writerow([r["recipient_key"], r["cliente"], r["escritorio"], r["email"], r["owner"], r["escopo"], r["status"], r["last_event_at"], r["next_action_at"], r["notes"]])

    # HTML simples para enviar para auditoria/diretoria
    html_path = out_dir / f"status_{cycle_id}.html"
    html = []
    html.append(f"<h2>Status Circularizacao {cycle['quarter']}/{cycle['year']}</h2>")
    html.append(f"<p>Ciclo: {cycle_id} | Gerado em: {now_iso()}</p>")
    html.append("<table border='1' cellpadding='6' cellspacing='0'>")
    html.append("<tr><th>Cliente</th><th>Escritorio</th><th>Email</th><th>Status</th><th>Ultimo Evento</th></tr>")
    for r in rows:
        html.append(f"<tr><td>{r['cliente']}</td><td>{r['escritorio']}</td><td>{r['email']}</td><td>{r['status']}</td><td>{r['last_event_at'] or ''}</td></tr>")
    html.append("</table>")
    html_path.write_text("\n".join(html), encoding="utf-8")

    print(f"OK: {csv_path}")
    print(f"OK: {html_path}")

if __name__ == "__main__":
    main()