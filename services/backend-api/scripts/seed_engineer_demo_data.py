from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sys

BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.database import get_connection, init_database
from scripts.seed_demo_data import _hash_password


@dataclass(frozen=True)
class EngineerDemoUser:
    key: str
    email: str
    password: str
    full_name: str
    phone: str
    role: str = "field_engineer"


ENGINEER_DEMO_USERS: tuple[EngineerDemoUser, ...] = (
    EngineerDemoUser(
        key="engineer_a",
        email="engineer.a.demo@roadgis.local",
        password="Engineer@123",
        full_name="Engineer A Demo",
        phone="0901000004",
    ),
    EngineerDemoUser(
        key="engineer_b",
        email="engineer.b.demo@roadgis.local",
        password="Engineer@123",
        full_name="Engineer B Demo",
        phone="0901000005",
    ),
)


def seed_engineer_demo_users() -> int:
    init_database()
    seeded = 0

    with get_connection() as connection:
        for demo_user in ENGINEER_DEMO_USERS:
            existing = connection.execute(
                "SELECT id FROM users WHERE lower(email) = lower(?)",
                (demo_user.email,),
            ).fetchone()

            now = datetime.now(timezone.utc).isoformat()
            password_hash = _hash_password(demo_user.password)

            if existing is None:
                connection.execute(
                    """
                    INSERT INTO users (
                        id,
                        full_name,
                        email,
                        phone,
                        password_hash,
                        role,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f"seed-user-{demo_user.key}",
                        demo_user.full_name,
                        demo_user.email,
                        demo_user.phone,
                        password_hash,
                        demo_user.role,
                        now,
                        now,
                    ),
                )
            else:
                connection.execute(
                    """
                    UPDATE users
                    SET full_name = ?,
                        phone = ?,
                        password_hash = ?,
                        role = ?,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        demo_user.full_name,
                        demo_user.phone,
                        password_hash,
                        demo_user.role,
                        now,
                        existing["id"],
                    ),
                )

            seeded += 1

        connection.commit()

    return seeded


def main() -> None:
    total = seed_engineer_demo_users()
    print("=== ENGINEER DEMO ACCOUNTS ===")
    for demo_user in ENGINEER_DEMO_USERS:
        print(f"[{demo_user.role}] {demo_user.email} / {demo_user.password}")
    print(f"Seeded engineer users: {total}")
    print("Engineer demo seed completed successfully.")


if __name__ == "__main__":
    main()
