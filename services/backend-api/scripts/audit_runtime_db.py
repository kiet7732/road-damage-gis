from __future__ import annotations

import json
from pathlib import Path
import sys

BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.database import init_database, inspect_database_runtime


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main() -> None:
    init_database()
    runtime_info = inspect_database_runtime()
    print(json.dumps(runtime_info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
