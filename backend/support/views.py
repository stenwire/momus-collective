from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.pagination import StandardPagination
from config.permissions import IsStaffUser

from .models import Complaint
from .serializers import AdminComplaintSerializer, ComplaintCreateSerializer


class FileComplaint(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "complaints"

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        return Response(
            {"reference": str(complaint.id).split("-")[0].upper()},
            status=status.HTTP_201_CREATED,
        )


class AdminComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = AdminComplaintSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardPagination
    queryset = Complaint.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
