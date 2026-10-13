from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from catalog.models import Product

from .models import Review
from .services import eligible_order, leave_review, reviewer_name


def review_payload(review):
    return {
        "id": str(review.id),
        "rating": review.rating,
        "text": review.text,
        "reviewer": reviewer_name(review),
        "verified": review.is_verified,
        "created_at": review.created_at.isoformat(),
    }


class ReviewPagination(PageNumberPagination):
    page_size = 10


class ReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(
        required=False, allow_blank=True, max_length=500, default=""
    )
    token = serializers.CharField(required=False, allow_blank=True, default="")


def _product(slug):
    return get_object_or_404(Product, slug=slug, is_active=True)


class ProductReviews(APIView):
    """FR-REV-01: newest first, visible ones only. Posting needs a delivered
    order with this shirt: the customer's own, or a guest's tracking token.
    Only posting is throttled: pages read reviews from the Next server's IP."""

    permission_classes = [AllowAny]
    throttle_scope = "reviews"

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request, slug):
        product = _product(slug)
        reviews = (
            Review.objects.filter(product=product, is_visible=True)
            .select_related("user", "order")
            .order_by("-created_at")
        )
        paginator = ReviewPagination()
        page = paginator.paginate_queryset(reviews, request, view=self)
        response = paginator.get_paginated_response([review_payload(r) for r in page])
        response.data["average"] = str(product.avg_rating)
        return response

    def post(self, request, slug):
        product = _product(slug)
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        review = leave_review(
            product,
            data["rating"],
            data["text"],
            user=request.user,
            token=data["token"],
        )
        return Response(review_payload(review), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def review_eligibility(request, slug):
    order, reason = eligible_order(
        _product(slug), user=request.user, token=request.query_params.get("token", "")
    )
    return Response({"can_review": order is not None, "reason": reason})
