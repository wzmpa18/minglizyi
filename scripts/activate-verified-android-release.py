"""Inspect or activate one pinned signed Guoxue website APK; inspect by default.

The unique APK must already exist on the server. Only the eight maintained
redirects and this app's two release JSON files may change. Each file replacement
is atomic, but the three replacements are not a cross-file transaction; tickets
can briefly fall back to ordinary download. No APK, website tree, database,
membership, other application, or PM2 process is changed or deleted.
"""
import argparse
import datetime
import hashlib
import json
import os
import uuid
from pathlib import Path
import re
import shlex
import stat
import subprocess
import sys
import time
import urllib.request
import zipfile

HOST = "root@82.156.228.87"
DOMAIN = "yandaoguoxue.yandao.vip"
DOWNLOAD_ROOT = Path("/root/yandaoguoxue/learning-downloads")
FILES = {
    "nginx": Path("/www/server/panel/vhost/nginx/yandaoguoxue.vip.conf"),
    "app": Path("/www/yandaoguoxue-backend/data/app-release-config.json"),
    "company": Path("/www/yandaoguoxue-backend/data/company_download_release.json"),
}
ROUTES = ("/latest.apk", "/app-download/latest.apk", "/app-download/guoxue-chuancheng.apk",
          "/app-download/guoxue-chuancheng-v1.0-release.apk")
KNOWN_OLD = {
    "nginx": "6653cc1d1c3ef8930245118891a1d9d5092edbf71c838c29e5030d1ebfe763d3",
    "app": "2b89a435235deea496ec64b62a93ec922533c410fe00fb008b6ae347a0d24690",
    "company": "e8af601aaf680de5d1cb9cae76b696de08ef0098d6dd1c74dda1513f88c6e49e",
}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def validate_spec(spec):
    for key in ("version", "oldVersion"):
        require(isinstance(spec.get(key), str) and re.fullmatch(r"\d+\.\d+\.\d+", spec[key]), "Invalid " + key)
    for key in ("source",):
        require(re.fullmatch(r"[a-f0-9]{40}", spec.get(key, "")), "Full source commit required")
    for key in ("sha256", "oldSha256"):
        require(re.fullmatch(r"[a-f0-9]{64}", spec.get(key, "")), "Invalid " + key)
    for key in ("build", "oldBuild", "size", "oldSize"):
        require(type(spec.get(key)) is int and 0 < spec[key] < 2**31, "Invalid " + key)
    require(spec["build"] > spec["oldBuild"], "Build must advance")
    require(tuple(map(int, spec["version"].split("."))) >= tuple(map(int, spec["oldVersion"].split("."))), "Version cannot go backwards")
    require(set(spec["expectedConfigHashes"]) == set(FILES), "Exactly three configuration hashes required")
    for value in spec["expectedConfigHashes"].values():
        require(re.fullmatch(r"[a-f0-9]{64}", value), "Invalid configuration guard")
    notes = spec.get("notes")
    require(notes is None or isinstance(notes, list) and 0 < len(notes) <= 20 and all(isinstance(n, str) and 0 < len(n) <= 2000 for n in notes), "Notes must be an explicit JSON string array")
    return spec


def apk_path(version, build):
    return DOWNLOAD_ROOT / str(build) / ("YandaoGuoxue_" + version + "_" + str(build) + ".apk")


def apk_url(version, build):
    return "https://" + DOMAIN + "/downloads/" + str(build) + "/" + apk_path(version, build).name


def redirect_rows(text):
    routes = "|".join(re.escape(route) for route in ROUTES)
    pattern = re.compile(r"(?m)^[ \t]*location[ \t]+=[ \t]+(?P<route>" + routes + r")[ \t]*\{[ \t]*return[ \t]+302[ \t]+(?P<url>https://[^;\s]+);[ \t]*\}[ \t]*$")
    rows = list(pattern.finditer(text))
    require(len(rows) == 8 and all(sum(row["route"] == route for row in rows) == 2 for route in ROUTES), "Expected exactly two sets of four maintained redirects")
    return rows


def plan_changes(spec, nginx, release, company, published_at):
    validate_spec(spec)
    old_url = apk_url(spec["oldVersion"], spec["oldBuild"])
    new_url = apk_url(spec["version"], spec["build"])
    rows = redirect_rows(nginx)
    require(all(row["url"] == old_url for row in rows), "Maintained redirects no longer point to the expected old APK")
    require(release.get("latestVersion") == spec["oldVersion"] and release.get("latestVersionCode") == spec["oldBuild"] and release.get("downloadUrl") == old_url, "Published app release changed since review")
    require(release.get("forceUpdate") is False, "Unexpected force-update policy requires review")
    expected_company = {"version": spec["oldVersion"], "path": str(apk_path(spec["oldVersion"], spec["oldBuild"])), "bytes": spec["oldSize"], "sha256": spec["oldSha256"]}
    require(company == expected_company, "Company download release changed since review")
    # Replace only the URL group in these eight already-validated exact lines.
    replaced = nginx
    for row in reversed(rows):
        start, end = row.span("url")
        replaced = replaced[:start] + new_url + replaced[end:]
    updated = dict(release)
    updated.update(latestVersion=spec["version"], latestVersionCode=spec["build"], downloadUrl=new_url, publishedAt=published_at)
    if spec.get("notes") is not None:
        updated["releaseNotes"] = spec["notes"]
    new_company = {"version": spec["version"], "path": str(apk_path(spec["version"], spec["build"])), "bytes": spec["size"], "sha256": spec["sha256"]}
    encode = lambda value: (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return {"nginx": replaced.encode("utf-8"), "app": encode(updated), "company": encode(new_company)}


def safe_regular(path):
    require(path.is_absolute(), "Absolute path required")
    for part in (path, *path.parents):
        require(not part.is_symlink(), "Symlink is not permitted: " + str(path))
    require(path.is_file() and stat.S_ISREG(path.stat().st_mode), "Expected regular file: " + str(path))
    return path.stat()


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_apk(path, version, build, size, sha256, source=None):
    info = safe_regular(path)
    require(info.st_size == size and info.st_mode & 0o004, "APK size or nginx readability mismatch")
    require(file_hash(path) == sha256, "Complete APK SHA mismatch")
    with zipfile.ZipFile(path) as archive:
        require(archive.namelist().count("assets/public/app-native.json") == 1, "Ambiguous native provenance marker")
        member = archive.getinfo("assets/public/app-native.json")
        require(member.file_size < 100_000, "Oversized native provenance marker")
        marker = json.loads(archive.read(member))
    require(marker.get("versionName") == version and marker.get("versionCode") == build and marker.get("isNativeApp") is True, "APK native version marker mismatch")
    require(marker.get("storeChannel") in ("internal", "default"), "Store-specific APK cannot become the website APK")
    if source is not None:
        require(marker.get("sourceCommit") == source, "APK source commit mismatch")
    return {key: marker.get(key) for key in ("versionName", "versionCode", "sourceCommit", "storeChannel", "isNativeApp")}


def atomic_write(path, data, metadata):
    temporary = path.with_name(path.name + ".verified-release-tmp-" + str(os.getpid()) + "-" + uuid.uuid4().hex)
    require(not temporary.exists(), "Unexpected staging file")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, metadata["mode"])
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, metadata["mode"])
        os.chown(temporary, metadata["uid"], metadata["gid"])
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    except Exception:
        # The target's original bytes are restored by the outer transaction;
        # preserve an unfinished staging file for inspection rather than delete.
        raise


def nginx_command(*arguments):
    import shutil
    executable = shutil.which("nginx") or "/www/server/nginx/sbin/nginx"
    subprocess.run([executable, *arguments], check=True, capture_output=True, timeout=25)


def origin_request(url, headers_only=False, timeout=None):
    # Real hostname and certificate verification, explicitly routed to this
    # origin; this is not represented as an independent public-network test.
    from urllib.parse import urlsplit
    parsed = urlsplit(url)
    require(parsed.hostname == DOMAIN and parsed.scheme in ("http", "https") and not parsed.username and not parsed.password and not parsed.port, "Origin probe escaped the application")
    port = 443 if parsed.scheme == "https" else 80
    limit = timeout if timeout is not None else 90
    command = ["curl", "--silent", "--show-error", "--noproxy", "*", "--max-time", str(limit), "--resolve", DOMAIN + ":" + str(port) + ":127.0.0.1"]
    if headers_only:
        result = subprocess.run(command + ["--head", "--dump-header", "-", "--output", "/dev/null", url], capture_output=True, check=True, timeout=limit + 2)
        lines = result.stdout.decode("iso-8859-1").splitlines()
        status = int(next(line for line in lines if line.startswith("HTTP/")).split()[1])
        location = next((line.split(":", 1)[1].strip() for line in lines if line.lower().startswith("location:")), None)
        return {"status": status, "location": location}
    process = subprocess.Popen(command + ["--fail", url], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    h, size = hashlib.sha256(), 0
    try:
        for chunk in iter(lambda: process.stdout.read(1024 * 1024), b""):
            h.update(chunk)
            size += len(chunk)
            require(size <= 2**31, "Unexpected response size")
        process.wait(timeout=5)
        require(process.returncode == 0, "Origin HTTPS full read failed")
    finally:
        if process.poll() is None:
            process.kill()
    return {"sha256": h.hexdigest(), "bytes": size, "verificationScope": "hostname-and-TLS-verified-local-origin"}


class RedirectConvergenceError(ValueError):
    def __init__(self, message, history):
        super().__init__(message)
        self.history = history


def converged_redirects(version, build, max_sweeps=10, timeout_seconds=20, interval=0.35):
    """Require two complete matching sweeps; a good route cannot hide a bad one.

    Reload signals are asynchronous. Preserve each route's actual response from
    every sweep, including old/new interleaving and transport failures. A global
    wall-clock deadline also bounds a stuck local-origin curl request.
    """
    expected = apk_url(version, build)
    start = time.monotonic()
    deadline = start + timeout_seconds
    history, streak = [], 0
    for sweep in range(1, max_sweeps + 1):
        rows = []
        expired = False
        for scheme in ("http", "https"):
            for route in ROUTES:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    expired = True
                    break
                try:
                    actual = origin_request(scheme + "://" + DOMAIN + route, True, timeout=min(2.0, remaining))
                    upgrade = scheme == "http" and actual == {"status": 301, "location": "https://" + DOMAIN + route}
                    matches = actual == {"status": 302, "location": expected} or upgrade
                    rows.append({"scheme": scheme, "route": route, **actual, "matches": matches})
                except Exception as error:
                    rows.append({"scheme": scheme, "route": route, "status": None, "location": None, "matches": False, "error": str(error)[:300]})
            if expired:
                break
        complete = len(rows) == 8
        history.append({"sweep": sweep, "elapsedMs": round((time.monotonic() - start) * 1000, 3), "complete": complete, "rows": rows})
        streak = streak + 1 if complete and all(row["matches"] for row in rows) else 0
        if streak >= 2:
            return {"redirects": rows, "convergenceSweeps": history, "requiredConsecutiveSweeps": 2}
        if expired or time.monotonic() >= deadline:
            break
        if sweep < max_sweeps:
            time.sleep(min(interval, max(0, deadline - time.monotonic())))
    failures = [row for row in history[-1]["rows"] if not row["matches"]]
    detail = json.dumps(failures, ensure_ascii=False) if failures else "incomplete global convergence deadline"
    raise RedirectConvergenceError("Stable redirect readback mismatch after bounded convergence: " + detail, history)


def verify_live(spec, old=False):
    version, build = (spec["oldVersion"], spec["oldBuild"]) if old else (spec["version"], spec["build"])
    url = apk_url(version, build)
    convergence = converged_redirects(version, build)
    with urllib.request.urlopen("http://127.0.0.1:3001/api/public/app-version?platform=android", timeout=10) as response:
        data = json.load(response)["data"]
    require(data["latestVersion"] == version and data["latestVersionCode"] == build and data["downloadUrl"] == url and data["forceUpdate"] is False, "App version API readback mismatch")
    actual = origin_request(url)
    require(actual["bytes"] == spec["oldSize" if old else "size"] and actual["sha256"] == spec["oldSha256" if old else "sha256"], "Origin APK full readback mismatch")
    return {**convergence, "versionApiVerified": True, "apk": actual}


class ReleaseActivationError(RuntimeError):
    def __init__(self, original, rollback_errors, rollback_verification_history=None):
        super().__init__(str(original))
        self.rollback_errors = rollback_errors
        self.failed_verification_history = getattr(original, "history", None)
        self.rollback_verification_history = rollback_verification_history


def apply_verified_changes(original, metadata, changes, verify_new, verify_old):
    """The same failure-handling path is used by live activation and tests."""
    for key in FILES:
        require(FILES[key].read_bytes() == original[key], "Concurrent configuration update: " + key)
    changed = []
    try:
        for key in ("nginx", "company", "app"):
            require(FILES[key].read_bytes() == original[key], "Concurrent configuration update: " + key)
            # Record ownership BEFORE writing: fsync can fail after os.replace.
            changed.append(key)
            atomic_write(FILES[key], changes[key], metadata[key])
        nginx_command("-t")
        nginx_command("-s", "reload")
        for key in FILES:
            require(FILES[key].read_bytes() == changes[key], "Configuration writeback mismatch: " + key)
        return verify_new()
    except Exception as error:
        rollback_errors = []
        rollback_verification_history = None
        for key in reversed(changed):
            try:
                atomic_write(FILES[key], original[key], metadata[key])
            except Exception as rollback_error:
                rollback_errors.append(key + ": " + str(rollback_error))
        try:
            nginx_command("-t")
            nginx_command("-s", "reload")
            for key in FILES:
                require(FILES[key].read_bytes() == original[key], "Rollback bytes mismatch: " + key)
            verify_old()
        except Exception as rollback_error:
            rollback_errors.append("verification: " + str(rollback_error))
            rollback_verification_history = getattr(rollback_error, "history", None)
        raise ReleaseActivationError(error, rollback_errors, rollback_verification_history) from None


def remote_run(spec):
    import fcntl
    validate_spec(spec)
    require(os.name == "posix" and os.geteuid() == 0, "Pinned Linux application host required")
    lock = None
    if spec["apply"]:
        lock_path = Path("/root/yandaoguoxue/.android-release-activation.lock")
        require(not lock_path.is_symlink() and all(not part.is_symlink() for part in lock_path.parents), "Unexpected activation lock path")
        descriptor = os.open(lock_path, os.O_WRONLY | os.O_APPEND | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        lock = os.fdopen(descriptor, "a")
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    original, metadata = {}, {}
    for key, path in FILES.items():
        info = safe_regular(path)
        original[key] = path.read_bytes()
        require(digest(original[key]) == spec["expectedConfigHashes"][key], "Configuration changed since review: " + key)
        metadata[key] = {"mode": stat.S_IMODE(info.st_mode), "uid": info.st_uid, "gid": info.st_gid}
    old_path = apk_path(spec["oldVersion"], spec["oldBuild"])
    old_marker = verify_apk(old_path, spec["oldVersion"], spec["oldBuild"], spec["oldSize"], spec["oldSha256"])
    new_path = apk_path(spec["version"], spec["build"])
    marker = verify_apk(new_path, spec["version"], spec["build"], spec["size"], spec["sha256"], spec["source"])
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    changes = plan_changes(spec, original["nginx"].decode("utf-8"), json.loads(original["app"]), json.loads(original["company"]), now)
    proof = {"state": "VERIFIED_INSPECT_ONLY", "apply": False, "source": spec["source"], "newApk": {"path": str(new_path), "bytes": spec["size"], "sha256": spec["sha256"], "marker": marker}, "retainedRollbackApk": {"path": str(old_path), "sha256": spec["oldSha256"], "marker": old_marker}, "before": {key: digest(value) for key, value in original.items()}, "plannedAfter": {key: digest(value) for key, value in changes.items()}, "redirectCount": 8, "databaseOrPm2Changed": False, "otherAppsChanged": False, "crossFileAtomicity": False}
    if not spec["apply"]:
        return proof
    nginx_command("-t")
    backup_root = Path("/root/yandaoguoxue-backups")
    require(not backup_root.is_symlink() and backup_root.resolve() == backup_root, "Unexpected backup root")
    backup = backup_root / ("android-release-" + str(spec["build"]) + "-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + "-" + spec["source"][:7])
    backup.mkdir(mode=0o700, parents=True, exist_ok=False)
    for key, value in original.items():
        file = backup / (key + ".original")
        with file.open("xb") as stream:
            stream.write(value)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(file, 0o600)
        require(file.read_bytes() == value, "Backup readback mismatch: " + key)
    (backup / "rollback-manifest.json").write_text(json.dumps({"files": {key: {"path": str(FILES[key]), "sha256": digest(original[key]), **metadata[key]} for key in FILES}, "oldApk": str(old_path)}, indent=2) + "\n")
    try:
        def verify_new():
            result = verify_live(spec)
            require(file_hash(old_path) == spec["oldSha256"], "Rollback APK changed unexpectedly")
            return result
        verified = apply_verified_changes(original, metadata, changes, verify_new, lambda: verify_live(spec, old=True))
        proof.update(state="ACTIVATED_AND_ORIGIN_VERIFIED", apply=True, backup=str(backup), activatedAt=now, verification=verified)
    except ReleaseActivationError as error:
        failure = {**proof, "state": "ROLLBACK_FAILED" if error.rollback_errors else "ROLLED_BACK_AND_VERIFIED", "apply": False, "failure": str(error), "rollbackErrors": error.rollback_errors, "failedVerificationAttempts": error.failed_verification_history, "rollbackVerificationAttempts": error.rollback_verification_history, "backup": str(backup)}
        (backup / "activation-failure.json").write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n")
        raise RuntimeError(json.dumps(failure, ensure_ascii=False)) from None
    finally:
        if lock:
            lock.close()
    (backup / "activation-proof.json").write_text(json.dumps(proof, ensure_ascii=False, indent=2) + "\n")
    return proof


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", default="25.0.118")
    parser.add_argument("--build", type=int, default=2151)
    parser.add_argument("--sha256", default="2ce3de1ccc6d92ffb31e0fd30479142d6d86731249773c3ef96007e7d6f7fd9d")
    parser.add_argument("--size", type=int, default=91492400)
    parser.add_argument("--source", default="ac13a433cfb5f5e8f2c2e3e0946f7181339fc079")
    parser.add_argument("--expected-old-version", default="25.0.117")
    parser.add_argument("--expected-old-build", type=int, default=2150)
    parser.add_argument("--expected-old-sha256", default="ab0f3d94843e797079775cce01e1da9bf9827858453a7c7f83ddfcedf930739b")
    parser.add_argument("--expected-old-size", type=int, default=91370992)
    for key in FILES:
        parser.add_argument("--expected-" + key + "-sha256", default=KNOWN_OLD[key])
    parser.add_argument("--notes-file", type=Path, help="Optional explicit JSON array of release-note strings; otherwise preserve existing notes")
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--apply", action="store_true", help="Apply only after the pinned APK is on the server and this plan is approved")
    args = parser.parse_args()
    spec = {"version": args.version, "build": args.build, "sha256": args.sha256, "size": args.size, "source": args.source, "oldVersion": args.expected_old_version, "oldBuild": args.expected_old_build, "oldSha256": args.expected_old_sha256, "oldSize": args.expected_old_size, "expectedConfigHashes": {key: getattr(args, "expected_" + key + "_sha256") for key in FILES}, "notes": json.loads(args.notes_file.read_text("utf-8-sig")) if args.notes_file else None, "apply": args.apply}
    validate_spec(spec)
    source = Path(__file__).read_text("utf-8-sig")
    command = "python3 -c " + shlex.quote(source) + " --remote-run"
    run = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=12", HOST, command], input=json.dumps(spec).encode(), capture_output=True, timeout=450)
    if run.returncode:
        raise RuntimeError("Activation did not confirm success; inspect the retained remote proof before retrying. " + run.stderr.decode("utf-8", errors="replace")[-6000:])
    proof = json.loads(run.stdout)
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(json.dumps(proof, ensure_ascii=False))


if __name__ == "__main__":
    try:
        if len(sys.argv) == 2 and sys.argv[1] == "--remote-run":
            print(json.dumps(remote_run(json.load(sys.stdin)), ensure_ascii=False))
        else:
            main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
