def scoped(scope):
    """Sets throttle_scope on a function-based view. Must be the innermost
    decorator: @api_view reads func.throttle_scope at decoration time, so
    this has to run before @api_view wraps the function, not after."""

    def decorator(func):
        func.throttle_scope = scope
        return func

    return decorator
