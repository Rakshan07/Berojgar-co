"""0001_initial_hackloop_schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-24 20:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pathlib import Path
import re

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Ensure hackloop schema exists
    conn = op.get_bind()
    raw_conn = conn.connection.dbapi_connection
    bootstrap_path = Path(__file__).resolve().parent.parent.parent / "sql" / "bootstrap.sql"
    if bootstrap_path.exists():
        with open(bootstrap_path, "r", encoding="utf-8") as f:
            sql_statements = f.read()
        with raw_conn.cursor() as cur:
            cur.execute(sql_statements)
    else:
        op.execute("CREATE SCHEMA IF NOT EXISTS hackloop;")

def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS hackloop CASCADE;")
