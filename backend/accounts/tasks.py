from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_verification_email(user_id, token):
    from .models import User

    user = User.objects.get(id=user_id)
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_mail(
        subject="Verify your momus collective account",
        message=f"Confirm your email: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


@shared_task
def send_password_reset_email(user_id, uid, token):
    from .models import User

    user = User.objects.get(id=user_id)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        subject="Reset your momus collective password",
        message=f"Reset your password: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


@shared_task
def send_email_change_confirmation(new_email, token):
    # Sent to the new address, never the old one: confirming here is the
    # proof of ownership the change requires, so there's nothing to notify
    # the old address about until the change actually takes effect.
    link = f"{settings.FRONTEND_URL}/confirm-email-change?token={token}"
    send_mail(
        subject="Confirm your new momus collective email address",
        message=f"Confirm this email address: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[new_email],
    )
