"""FastAPI dependencies sharing the same service and policy as the dispatcher."""
from .rbac import require_permission


def make_dependencies(auth_service):
    try:
        from fastapi import Depends, Request
    except ImportError as exc:
        raise RuntimeError("FastAPI runtime is NOT_CONFIGURED; dependency is not installed") from exc

    def current_user(request: Request):
        return auth_service.authenticate(request.headers.get("authorization"))

    def require_permissions(*permissions):
        def authorize(principal=Depends(current_user)):
            for permission in permissions:
                require_permission(principal, permission)
            return principal
        return authorize

    return current_user, require_permissions
