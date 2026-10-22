from __future__ import annotations

import sys
from pathlib import Path

# Ensure root tests directory is importable
root_path = Path(__file__).resolve().parents[3]
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

from tests.e2e.test_geocoding_workflow import GeocodingWorkflowE2ETests

__all__ = ["GeocodingWorkflowE2ETests"]
