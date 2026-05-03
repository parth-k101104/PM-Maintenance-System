import os

import psycopg
from psycopg.rows import dict_row

DEFAULT_DATABASE_URL = "postgresql://postgres:root@localhost:5433/pm_db"


def main():
    database_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    print(f"Connecting with DATABASE_URL={database_url}")
    try:
        with psycopg.connect(database_url, row_factory=dict_row) as conn:
            print("Connected.")

            with conn.cursor() as cur:
                target_tasks_sql = """
                SELECT
                    pts.task_schedule_id,
                    pst.std_task_id,
                    pst.part_id
                FROM pm_task_schedules pts
                JOIN pm_std_tasks pst ON pst.std_task_id = pts.std_task_id
                WHERE pts.is_active IS TRUE
                  AND pst.part_id IS NOT NULL
                  AND (%(part_ids)s::bigint[] IS NULL OR pst.part_id = ANY(%(part_ids)s::bigint[]))
                """
                cur.execute(target_tasks_sql, {"part_ids": None})
                rows = cur.fetchall()
                print("Tasks fetched with None:", len(rows))
                if rows:
                    print(rows[0])
    except Exception as e:
        print("Error:", str(e))
        if "localhost:5432" in database_url or "127.0.0.1:5432" in database_url:
            print("Hint: this project Docker DB is exposed on localhost:5433, not 5432.")
            print(f"Try: $env:DATABASE_URL='{DEFAULT_DATABASE_URL}'; .venv\\Scripts\\python.exe test_db.py")


if __name__ == "__main__":
    main()
