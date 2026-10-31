import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from support.models import Complaint

pytestmark = pytest.mark.django_db


def test_customer_can_file_a_complaint():
    response = APIClient().post(
        "/api/v1/support/complaints/",
        {
            "email": "customer@example.com",
            "order_number": "MOM-123",
            "topic": "delivery",
            "details": "My delivery has not arrived yet.",
            "website": "",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["reference"]
    assert Complaint.objects.get().status == Complaint.Status.OPEN


def test_honeypot_and_invalid_topic_are_rejected():
    body = {
        "email": "customer@example.com",
        "topic": "order",
        "details": "Please help with this order.",
    }
    spam = APIClient().post(
        "/api/v1/support/complaints/", {**body, "website": "spam"}, format="json"
    )
    invalid = APIClient().post(
        "/api/v1/support/complaints/", {**body, "topic": "invalid"}, format="json"
    )

    assert spam.status_code == 400
    assert invalid.status_code == 400
    assert not Complaint.objects.exists()


def test_only_staff_can_view_or_resolve_complaints():
    complaint = Complaint.objects.create(
        email="customer@example.com",
        topic=Complaint.Topic.ORDER,
        details="Please help with this order.",
    )
    customer = User.objects.create_user(
        email="customer@example.com",
        password="correct-horse-battery",
        first_name="Customer",
        phone="+2348000000000",
    )
    staff = User.objects.create_user(
        email="staff@example.com",
        password="correct-horse-battery",
        first_name="Staff",
        phone="+2348000000001",
        is_staff=True,
    )
    client = APIClient()
    customer_token = RefreshToken.for_user(customer).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {customer_token}")
    assert client.get("/api/v1/admin/complaints/").status_code == 403

    staff_token = RefreshToken.for_user(staff).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {staff_token}")
    assert client.get("/api/v1/admin/complaints/").data["results"][0]["id"] == str(
        complaint.id
    )
    resolved = client.patch(
        f"/api/v1/admin/complaints/{complaint.id}/",
        {"status": Complaint.Status.RESOLVED},
        format="json",
    )
    assert resolved.status_code == 200
    complaint.refresh_from_db()
    assert complaint.status == Complaint.Status.RESOLVED
