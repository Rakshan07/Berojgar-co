"""Queries for the installed schema. Parameters are always bound, never interpolated."""
from sqlalchemy import text
from fastapi import HTTPException

def rows(db, sql, **params):
    return [dict(row) for row in db.execute(text(sql), params).mappings()]
def one(db, sql, **params):
    result = rows(db, sql, **params)
    return result[0] if result else None
def execute(db, sql, **params):
    return db.execute(text(sql), params)
def require(value, status=404, message='Not found'):
    if not value:
        raise HTTPException(status_code=status, detail=message)
    return value
