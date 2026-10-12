import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def procfile():
    lines = (BACKEND / "Procfile").read_text().splitlines()
    return dict(line.split(": ", 1) for line in lines if line.strip())


def test_every_production_process_is_defined():
    procs = procfile()
    assert set(procs) == {"release", "web", "worker", "beat"}
    assert procs["release"] == "python manage.py migrate --noinput"
    assert procs["worker"].startswith("celery -A config worker")
    assert procs["beat"].startswith("celery -A config beat")


def test_web_uses_threaded_gunicorn_with_its_access_log_off():
    web = procfile()["web"]
    assert web.startswith("gunicorn config.wsgi")
    assert "--worker-class gthread" in web and "--threads" in web
    # D-103: gunicorn's access log would write tracking tokens unredacted.
    assert "--access-logfile" not in web and "--access-log" not in web


def test_every_required_variable_is_documented():
    settings = (BACKEND / "config" / "settings.py").read_text()
    required = set(re.findall(r'env(?:\.\w+)?\("([A-Z_]+)"\)', settings))
    readme = (BACKEND / "README.md").read_text().split("## Deployment", 1)[1]
    missing = sorted(v for v in required if v not in readme)
    assert required and not missing, missing
