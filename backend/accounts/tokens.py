from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import signing

EMAIL_VERIFICATION_SALT = "accounts.email-verification"
EMAIL_VERIFICATION_MAX_AGE = 60 * 60 * 24  # 24 hours

EMAIL_CHANGE_SALT = "accounts.email-change"
EMAIL_CHANGE_MAX_AGE = 60 * 60 * 24  # 24 hours


def make_email_verification_token(user):
    return signing.dumps(str(user.id), salt=EMAIL_VERIFICATION_SALT)


def read_email_verification_token(token, max_age=EMAIL_VERIFICATION_MAX_AGE):
    """Returns the user id, or None if the token is invalid or expired."""
    try:
        return signing.loads(token, salt=EMAIL_VERIFICATION_SALT, max_age=max_age)
    except signing.BadSignature:
        return None


def make_email_change_token(user, new_email):
    """Carries the new email itself, not just the user id, so the pending
    change needs no extra database column to hold state (D-041's pattern)."""
    return signing.dumps(
        {"user_id": str(user.id), "new_email": new_email}, salt=EMAIL_CHANGE_SALT
    )


def read_email_change_token(token, max_age=EMAIL_CHANGE_MAX_AGE):
    """Returns {"user_id", "new_email"}, or None if invalid or expired."""
    try:
        return signing.loads(token, salt=EMAIL_CHANGE_SALT, max_age=max_age)
    except signing.BadSignature:
        return None


class PasswordResetTokenGeneratorForUser(PasswordResetTokenGenerator):
    """Invalidates automatically once the password (or last_login) changes,
    unlike a bare signed token which stays valid until it expires."""

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.password}{timestamp}"


password_reset_token = PasswordResetTokenGeneratorForUser()
