from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# All TeamWeave models reside within the 'hackloop' schema
metadata = MetaData(schema="hackloop")

class Base(DeclarativeBase):
    metadata = metadata
