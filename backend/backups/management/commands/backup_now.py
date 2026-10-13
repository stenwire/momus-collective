from django.core.management.base import BaseCommand

from backups.services import backup_assets, backup_database


class Command(BaseCommand):
    help = "Back up the database and design files to the backup storage now."

    def add_arguments(self, parser):
        parser.add_argument("--only", choices=["database", "assets"])

    def handle(self, *args, **options):
        if options["only"] != "assets":
            self.stdout.write(f"database -> {backup_database()}")
        if options["only"] != "database":
            name, count = backup_assets()
            self.stdout.write(f"assets ({count} files) -> {name}")
