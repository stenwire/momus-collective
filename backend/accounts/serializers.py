from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address, User


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "phone"]

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError(
                "An account with this email address already exists."
            )
        return normalized

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AccountSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "notification_pref",
        ]
        read_only_fields = ["id", "email"]


class EmailChangeRequestSerializer(serializers.Serializer):
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        normalized = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError(
                "An account with this email address already exists."
            )
        return normalized


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "full_name",
            "phone",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "lga",
            "is_default",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
