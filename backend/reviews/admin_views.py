"""FR-REV-03: staff flag reviews to look at and hide those that break the
guidelines. Hiding takes a review out of the shirt's rating."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .models import HiddenReason, Review
from .services import refresh_rating, reviewer_name

FILTERS = {
    "all": Q(),
    "visible": Q(is_visible=True),
    "hidden": Q(is_visible=False),
    "flagged": Q(is_flagged=True),
}


def admin_review(review):
    return {
        "id": str(review.id),
        "product": {"slug": review.product.slug, "slogan": review.product.slogan},
        "order_number": review.order.order_number,
        "rating": review.rating,
        "text": review.text,
        "reviewer": reviewer_name(review),
        "is_visible": review.is_visible,
        "is_flagged": review.is_flagged,
        "hidden_reason": review.hidden_reason,
        "hidden_reason_label": review.get_hidden_reason_display()
        if review.hidden_reason
        else "",
        "created_at": review.created_at.isoformat(),
    }


class AdminReviewPagination(PageNumberPagination):
    page_size = 25


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_review_list(request):
    show = request.query_params.get("show", "all")
    if show not in FILTERS:
        raise serializers.ValidationError({"show": f"Use one of {', '.join(FILTERS)}."})
    reviews = (
        Review.objects.filter(FILTERS[show])
        .select_related("product", "order", "user")
        .order_by("-created_at")
    )
    search = request.query_params.get("search", "").strip()
    if search:
        reviews = reviews.filter(
            Q(text__icontains=search) | Q(product__slogan__icontains=search)
        )
    paginator = AdminReviewPagination()
    page = paginator.paginate_queryset(reviews, request)
    response = paginator.get_paginated_response([admin_review(r) for r in page])
    response.data["reasons"] = [{"key": k, "label": v} for k, v in HiddenReason.choices]
    return response


class ModerateSerializer(serializers.Serializer):
    is_flagged = serializers.BooleanField(required=False)
    is_visible = serializers.BooleanField(required=False)
    hidden_reason = serializers.ChoiceField(
        choices=HiddenReason.choices, required=False, allow_blank=True
    )

    def validate(self, attrs):
        if attrs.get("is_visible") is False and not attrs.get("hidden_reason"):
            raise serializers.ValidationError(
                {"hidden_reason": "Say which guideline the review breaks."}
            )
        return attrs


@api_view(["PATCH"])
@permission_classes([IsStaffUser])
def admin_review_moderate(request, pk):
    review = get_object_or_404(
        Review.objects.select_related("product", "order", "user"), pk=pk
    )
    serializer = ModerateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    if "is_flagged" in data:
        review.is_flagged = data["is_flagged"]
    if "is_visible" in data:
        review.is_visible = data["is_visible"]
        review.hidden_reason = "" if review.is_visible else data["hidden_reason"]
    review.save(update_fields=["is_flagged", "is_visible", "hidden_reason"])
    if "is_visible" in data:
        refresh_rating(review.product)
    return Response(admin_review(review))
