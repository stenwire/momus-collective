import pytest


@pytest.fixture(autouse=True)
def private_design_files(settings, tmp_path):
    settings.DESIGN_FILES_ROOT = tmp_path / "design-files"
    settings.BACKEND_URL = "http://api.test"
    return settings.DESIGN_FILES_ROOT
