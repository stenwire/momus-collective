"""FR-ADM-01: the admin hears about every paid order by email (print files
attached) and by WhatsApp (a summary and a link to the admin panel)."""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from accounts.models import User
from designs.storage import design_storage, order_item_file_name
from orders.tasks import naira

from . import whatsapp
from .models import Channel
from .services import send_once

KIND = "admin_new_order"


def admin_url(order):
    return f"{settings.FRONTEND_URL}/admin/orders/{order.id}"


def _context(order):
    address = order.shipping_address
    return {
        "order": order,
        "customer": {
            "name": address.get("full_name", ""),
            "phone": address.get("phone", ""),
            "email": order.user.email if order.user else order.guest_email,
            "account": bool(order.user),
        },
        "items": [
            {
                "item": item,
                "custom": bool(item.design_config),
                "line_total": naira(item.unit_price * item.quantity),
            }
            for item in order.items.all()
        ],
        "address": address,
        "subtotal": naira(order.subtotal),
        "delivery": naira(order.delivery_fee),
        "discount": naira(order.discount) if order.discount else "",
        "total": naira(order.total),
        "fee": naira(order.payment_fee) if order.payment_fee else "",
        "paid": naira(order.total + order.payment_fee),
        "admin_url": admin_url(order),
    }


def _print_files(order):
    storage = design_storage()
    for n, item in enumerate(order.items.all(), start=1):
        name = order_item_file_name(item.id)
        if item.design_config and storage.exists(name):
            with storage.open(name, "rb") as f:
                yield f"{order.order_number}-item{n}-{item.size}.png", f.read()


def _email(order):
    recipients = list(
        User.objects.filter(is_staff=True, is_active=True).values_list(
            "email", flat=True
        )
    )
    if not recipients:
        return
    context = _context(order)
    message = EmailMultiAlternatives(
        subject=f"New order {order.order_number}: {context['paid']}",
        body=render_to_string("notifications/email/admin_new_order.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    message.attach_alternative(
        render_to_string("notifications/email/admin_new_order.html", context),
        "text/html",
    )
    for filename, content in _print_files(order):
        message.attach(filename, content, "image/png")
    message.send()


def whatsapp_summary(order):
    c = _context(order)
    lines = [f"New order {order.order_number}: {c['paid']} paid"]
    lines.append(f"{c['customer']['name']}, {c['customer']['phone']}")
    for line in c["items"]:
        item = line["item"]
        title = f'Custom: "{item.slogan_text}"' if line["custom"] else item.slogan_text
        detail = ", ".join(filter(None, [item.size, item.color]))
        lines.append(f"- {item.quantity}x {title} ({detail})")
    a = c["address"]
    lines.append(
        "Ship to: "
        + ", ".join(
            filter(
                None,
                [a.get("address_line_1"), a.get("city"), a.get("lga"), a.get("state")],
            )
        )
    )
    if any(line["custom"] for line in c["items"]):
        lines.append("Print files are attached to the order email.")
    lines.append(f"Open: {c['admin_url']}")
    return "\n".join(lines)


def notify_new_order(order):
    send_once(order, KIND, Channel.EMAIL, lambda: _email(order))
    sender = whatsapp.provider()
    if sender.configured():
        send_once(
            order,
            KIND,
            Channel.WHATSAPP,
            lambda: sender.send_to_admin(whatsapp_summary(order)),
        )
