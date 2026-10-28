from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# All Skillfy models reside within the 'hackloop' schema
metadata = MetaData(schema="hackloop")

class Base(DeclarativeBase):
    metadata = metadata
