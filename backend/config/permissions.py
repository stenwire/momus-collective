from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Admin-only routes (NFR-04): 401 anonymous, 403 authenticated non-admin,
    both handled by DRF's own permission-denied flow off has_permission."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)
