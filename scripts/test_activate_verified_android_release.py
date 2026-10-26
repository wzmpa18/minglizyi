"""No SSH, file deletion, real payment, deployment, or server writes."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import stat
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import zipfile

spec = importlib.util.spec_from_file_location("release_activation", Path(__file__).with_name("activate-verified-android-release.py"))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


def fixture():
    values = {"version": "25.0.118", "build": 2151, "sha256": "a" * 64, "size": 1000, "source": "b" * 40,
              "oldVersion": "25.0.117", "oldBuild": 2150, "oldSha256": "c" * 64, "oldSize": 900,
              "expectedConfigHashes": dict(release.KNOWN_OLD), "notes": None, "apply": False}
    url = release.apk_url(values["oldVersion"], values["oldBuild"])
    text = "# unrelated app remains byte identical\n"
    for _ in range(2):
        text += "server {\n" + "\n".join("    location = " + route + " { return 302 " + url + "; }" for route in release.ROUTES) + "\n}\n"
    app = {"latestVersion": values["oldVersion"], "latestVersionCode": values["oldBuild"], "downloadUrl": url,
           "downloadPage": "https://yandaoguoxue.yandao.vip/download/", "releaseNotes": ["保留现有说明"], "forceUpdate": False,
           "unknownPreserved": {"ios": "untouched"}}
    company = {"version": values["oldVersion"], "path": str(release.apk_path(values["oldVersion"], values["oldBuild"])), "bytes": values["oldSize"], "sha256": values["oldSha256"]}
    return values, text, app, company


class PlannerTests(unittest.TestCase):
    def test_exact_eight_redirects_and_unknown_metadata_are_preserved(self):
        values, text, app, company = fixture()
        actual = release.plan_changes(values, text, app, company, "approved-time")
        self.assertEqual(actual["nginx"].decode(), text.replace(release.apk_url("25.0.117", 2150), release.apk_url("25.0.118", 2151)))
        after = json.loads(actual["app"])
        self.assertEqual(after["unknownPreserved"], app["unknownPreserved"])
        self.assertEqual(after["releaseNotes"], app["releaseNotes"])
        self.assertFalse(after["forceUpdate"])
        self.assertEqual(json.loads(actual["company"])["sha256"], values["sha256"])

    def test_wrong_route_count_mixed_target_and_changed_force_policy_fail(self):
        values, text, app, company = fixture()
        cases = [text.replace("location = /latest.apk", "location = /other-app.apk", 1),
                 text.replace(release.apk_url("25.0.117", 2150), "https://outside.example/latest.apk", 1)]
        for changed in cases:
            with self.assertRaises(ValueError):
                release.plan_changes(values, changed, app, company, "time")
        with self.assertRaises(ValueError):
            release.plan_changes(values, text, {**app, "forceUpdate": True}, company, "time")
        with self.assertRaises(ValueError):
            release.plan_changes(values, text, app, {**company, "sha256": "d" * 64}, "time")

    def test_paths_versions_hashes_and_notes_are_strict_inputs(self):
        values, text, app, company = fixture()
        for change in [{"version": "../other-app"}, {"build": 2150}, {"source": "short"}, {"sha256": "invalid"}, {"size": True}, {"notes": "not-an-array"}]:
            with self.assertRaises(ValueError):
                release.plan_changes({**values, **change}, text, app, company, "time")
        actual = release.plan_changes({**values, "notes": ["明确的新说明"]}, text, app, company, "time")
        self.assertEqual(json.loads(actual["app"])["releaseNotes"], ["明确的新说明"])

    def test_actual_zip_marker_binds_version_name_build_source_and_channel(self):
        marker = {"versionName": "25.0.118", "versionCode": 2151, "sourceCommit": "b" * 40, "isNativeApp": True, "storeChannel": "internal"}
        def check(value, expected_hash=None):
            raw = io.BytesIO()
            with zipfile.ZipFile(raw, "w") as archive:
                archive.writestr("assets/public/app-native.json", json.dumps(value))
            data = raw.getvalue()
            with patch.object(release, "safe_regular", return_value=SimpleNamespace(st_size=len(data), st_mode=stat.S_IFREG | 0o644)), patch.object(release, "file_hash", return_value=release.digest(data)):
                return release.verify_apk(io.BytesIO(data), "25.0.118", 2151, len(data), expected_hash or release.digest(data), "b" * 40)
        self.assertEqual(check(marker)["storeChannel"], "internal")
        for changed in [{**marker, "storeChannel": "google"}, {**marker, "versionName": "25.0.117"}, {**marker, "sourceCommit": "c" * 40}, {**marker, "isNativeApp": False}]:
            with self.assertRaises(ValueError):
                check(changed)
        with self.assertRaises(ValueError):
            check(marker, "0" * 64)


class WorkerConvergenceTests(unittest.TestCase):
    def responses(self, sweeps):
        calls = []
        def request(url, headers_only=False, timeout=None):
            index = len(calls) // 8
            calls.append((url, timeout))
            if url.startswith("http:"):
                return {"status": 301, "location": url.replace("http:", "https:", 1)}
            current = sweeps[min(index, len(sweeps) - 1)]
            return {"status": 302, "location": release.apk_url("25.0.118", 2151) if current else release.apk_url("25.0.117", 2150)}
        return request, calls

    def test_old_workers_then_mixed_generation_then_two_complete_new_sweeps(self):
        request, calls = self.responses([False, False, True, True])
        def mixed(url, headers_only=False, timeout=None):
            result = request(url, headers_only, timeout)
            # One newer worker in the second sweep must not conceal the other
            # three HTTPS paths which still serve the old worker configuration.
            if 8 < len(calls) <= 16 and url.endswith("/latest.apk") and "/app-download/" not in url and url.startswith("https:"):
                return {"status": 302, "location": release.apk_url("25.0.118", 2151)}
            return result
        with patch.object(release, "origin_request", side_effect=mixed), patch.object(release.time, "sleep"):
            proof = release.converged_redirects("25.0.118", 2151)
        self.assertEqual(len(proof["convergenceSweeps"]), 4)
        self.assertEqual(len(calls), 32)
        self.assertTrue(all(row["matches"] for row in proof["redirects"]))
        self.assertTrue(any(not row["matches"] for row in proof["convergenceSweeps"][1]["rows"]))

    def test_new_old_new_requires_two_consecutive_complete_sweeps(self):
        request, calls = self.responses([True, False, True, True])
        with patch.object(release, "origin_request", side_effect=request), patch.object(release.time, "sleep"):
            proof = release.converged_redirects("25.0.118", 2151)
        self.assertEqual(len(proof["convergenceSweeps"]), 4)
        self.assertEqual(len(calls), 32)

    def test_one_persistently_wrong_path_never_disappears_among_good_paths(self):
        request, _ = self.responses([True])
        def wrong(url, headers_only=False, timeout=None):
            if url == "https://" + release.DOMAIN + "/app-download/latest.apk":
                return {"status": 302, "location": "https://wrong.invalid/app.apk"}
            return request(url, headers_only, timeout)
        with patch.object(release, "origin_request", side_effect=wrong), patch.object(release.time, "sleep"):
            with self.assertRaises(release.RedirectConvergenceError) as error:
                release.converged_redirects("25.0.118", 2151, max_sweeps=4)
        self.assertEqual(len(error.exception.history), 4)
        for sweep in error.exception.history:
            failures = [row for row in sweep["rows"] if not row["matches"]]
            self.assertEqual(len(failures), 1)
            self.assertEqual(failures[0]["route"], "/app-download/latest.apk")
            self.assertEqual(failures[0]["location"], "https://wrong.invalid/app.apk")

    def test_transport_failure_is_recorded_before_later_real_convergence(self):
        request, _ = self.responses([True])
        failed = False
        def transient(url, headers_only=False, timeout=None):
            nonlocal failed
            if url.startswith("https:") and not failed:
                failed = True
                raise TimeoutError("local worker handover")
            return request(url, headers_only, timeout)
        with patch.object(release, "origin_request", side_effect=transient), patch.object(release.time, "sleep"):
            proof = release.converged_redirects("25.0.118", 2151)
        self.assertEqual(len(proof["convergenceSweeps"]), 3)
        self.assertTrue(any(row.get("error") == "local worker handover" for row in proof["convergenceSweeps"][0]["rows"]))

    def test_global_deadline_bounds_stalled_paths_and_marks_incomplete_sweep(self):
        clock = [0.0]
        def slow(url, headers_only=False, timeout=None):
            self.assertLessEqual(timeout, 2.0)
            clock[0] += 1.0
            return {"status": 302, "location": release.apk_url("25.0.118", 2151)}
        with patch.object(release, "origin_request", side_effect=slow), patch.object(release.time, "monotonic", side_effect=lambda: clock[0]), patch.object(release.time, "sleep"):
            with self.assertRaises(release.RedirectConvergenceError) as error:
                release.converged_redirects("25.0.118", 2151, timeout_seconds=2)
        self.assertEqual(len(error.exception.history), 1)
        self.assertFalse(error.exception.history[0]["complete"])
        self.assertEqual(len(error.exception.history[0]["rows"]), 2)


class DownloadEntryTests(unittest.TestCase):
    def test_static_fallback_needs_no_unrelated_network_request(self):
        with patch.object(release, 'origin_request') as request:
            self.assertEqual(release.verify_download_entry(release.apk_url('25.0.118', 2151), '25.0.118', 2151), release.apk_url('25.0.118', 2151))
            request.assert_not_called()

    def test_current_public_resolver_must_head_to_the_exact_static_signed_artifact(self):
        entry = 'https://' + release.DOMAIN + '/api/public/app-version/android-installer/2151.apk'
        with patch.object(release, 'origin_request', return_value={'status': 302, 'location': release.apk_url('25.0.118', 2151)}):
            self.assertEqual(release.verify_download_entry(entry, '25.0.118', 2151), entry)
        for bad in [{'status': 302, 'location': release.apk_url('25.0.117', 2150)}, {'status': 200, 'location': None}]:
            with patch.object(release, 'origin_request', return_value=bad):
                with self.assertRaises(ValueError): release.verify_download_entry(entry, '25.0.118', 2151)

    def test_external_or_another_release_resolver_is_refused_without_request(self):
        with patch.object(release, 'origin_request') as request:
            for entry in ['https://outside.example/2151.apk', 'https://' + release.DOMAIN + '/api/public/app-version/android-installer/2150.apk']:
                with self.assertRaises(ValueError): release.verify_download_entry(entry, '25.0.118', 2151)
            request.assert_not_called()


class MemoryFile:
    def __init__(self, data):
        self.data = data
    def read_bytes(self):
        return self.data


class ActivationFailureTests(unittest.TestCase):
    def setUp(self):
        self.original = {key: ("old-" + key).encode() for key in release.FILES}
        self.changes = {key: ("new-" + key).encode() for key in release.FILES}
        self.files = {key: MemoryFile(value) for key, value in self.original.items()}
        self.metadata = {key: {"mode": 0o600 if key != "app" else 0o644, "uid": 0, "gid": 0} for key in self.files}
        self.writes = []
    def writer(self, target, data, metadata):
        target.data = data
        self.writes.append((target, data, copy.deepcopy(metadata)))
    def restored(self):
        self.assertEqual({key: value.data for key, value in self.files.items()}, self.original)

    def test_success_uses_the_real_transaction_in_the_expected_order(self):
        with patch.object(release, "FILES", self.files), patch.object(release, "atomic_write", side_effect=self.writer), patch.object(release, "nginx_command") as nginx:
            actual = release.apply_verified_changes(self.original, self.metadata, self.changes, lambda: {"verified": True}, self.restored)
        self.assertTrue(actual["verified"])
        self.assertEqual([data for _, data, _ in self.writes], [self.changes[key] for key in ("nginx", "company", "app")])
        self.assertEqual(nginx.call_args_list[-1].args, ("-s", "reload"))

    def test_concurrent_change_is_not_overwritten_or_reloaded(self):
        self.files["app"].data = b"another reviewed publisher"
        with patch.object(release, "FILES", self.files), patch.object(release, "atomic_write") as writer, patch.object(release, "nginx_command") as nginx:
            with self.assertRaises(ValueError):
                release.apply_verified_changes(self.original, self.metadata, self.changes, lambda: None, self.restored)
            writer.assert_not_called()
            nginx.assert_not_called()
        self.assertEqual(self.files["app"].data, b"another reviewed publisher")

    def test_failure_after_replace_is_owned_and_restored_even_before_writer_returns(self):
        raised = False
        def writer(target, data, metadata):
            nonlocal raised
            self.writer(target, data, metadata)
            if data == self.changes["nginx"] and not raised:
                raised = True
                raise OSError("directory fsync failed after replace")
        with patch.object(release, "FILES", self.files), patch.object(release, "atomic_write", side_effect=writer), patch.object(release, "nginx_command"):
            with self.assertRaises(release.ReleaseActivationError) as error:
                release.apply_verified_changes(self.original, self.metadata, self.changes, lambda: None, self.restored)
        self.assertEqual(error.exception.rollback_errors, [])
        self.restored()
        self.assertEqual(self.writes[-1][2], self.metadata["nginx"])

    def test_nginx_test_reload_and_public_readback_failures_restore_all_original_bytes(self):
        for fail in ("test", "reload", "readback"):
            self.setUp()
            first = True
            def nginx(*args):
                nonlocal first
                if first and ((fail == "test" and args == ("-t",)) or (fail == "reload" and args == ("-s", "reload"))):
                    first = False
                    raise OSError("simulated nginx " + fail)
            def verify():
                if fail == "readback":
                    raise OSError("wrong public redirect")
            with patch.object(release, "FILES", self.files), patch.object(release, "atomic_write", side_effect=self.writer), patch.object(release, "nginx_command", side_effect=nginx):
                with self.assertRaises(release.ReleaseActivationError) as error:
                    release.apply_verified_changes(self.original, self.metadata, self.changes, verify, self.restored)
            self.assertEqual(error.exception.rollback_errors, [])
            self.restored()

    def test_failed_rollback_is_explicit_and_never_reported_as_success(self):
        with patch.object(release, "FILES", self.files), patch.object(release, "atomic_write", side_effect=self.writer), patch.object(release, "nginx_command", side_effect=OSError("reload unavailable")):
            with self.assertRaises(release.ReleaseActivationError) as error:
                release.apply_verified_changes(self.original, self.metadata, self.changes, lambda: None, self.restored)
        self.assertTrue(error.exception.rollback_errors)
        self.restored()

    def test_original_and_rollback_path_histories_are_both_preserved(self):
        first = [{"route": "/latest.apk", "status": 302, "location": "old"}]
        second = [{"route": "/app-download/latest.apk", "status": 302, "location": "new"}]
        def new():
            raise release.RedirectConvergenceError("new-worker mismatch", first)
        def old():
            raise release.RedirectConvergenceError("rollback-worker mismatch", second)
        with patch.object(release, "FILES", self.files), patch.object(release, "atomic_write", side_effect=self.writer), patch.object(release, "nginx_command"):
            with self.assertRaises(release.ReleaseActivationError) as error:
                release.apply_verified_changes(self.original, self.metadata, self.changes, new, old)
        self.assertEqual(error.exception.failed_verification_history, first)
        self.assertEqual(error.exception.rollback_verification_history, second)
        self.assertTrue(error.exception.rollback_errors)
        self.restored()


if __name__ == "__main__":
    unittest.main()
