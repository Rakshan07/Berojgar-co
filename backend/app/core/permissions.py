from enum import Enum

class RoleName(str, Enum):
    PARTICIPANT = "participant"
    ORGANIZER = "organizer"
    ADMIN = "admin"

class PermissionDeniedException(Exception):
    def __init__(self, message: str = "Permission denied"):
        self.message = message
        super().__init__(self.message)
