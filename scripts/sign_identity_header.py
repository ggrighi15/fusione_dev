"""
Generate signed identity headers for internal gateway calls.

Usage:
  python scripts/sign_identity_header.py --user-id svc-backend --team-id juridico --secret YOUR_SECRET
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import time


def build_signature(secret: str, method: str, path: str, user_id: str, team_id: str, ts: str) -> str:
    payload = f"{method.upper()}|{path}|{user_id}|{team_id}|{ts}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate X-Identity-* headers for LLM gateway.")
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--team-id", default="")
    parser.add_argument("--method", default="POST")
    parser.add_argument("--path", default="/llm/chat")
    parser.add_argument("--secret", required=True)
    parser.add_argument("--timestamp", default="")
    args = parser.parse_args()

    ts = args.timestamp or str(int(time.time()))
    signature = build_signature(
        args.secret,
        args.method,
        args.path,
        args.user_id,
        args.team_id,
        ts,
    )

    print(f"X-User-Id: {args.user_id}")
    print(f"X-Team-Id: {args.team_id}")
    print(f"X-Identity-Timestamp: {ts}")
    print(f"X-Identity-Signature: {signature}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
