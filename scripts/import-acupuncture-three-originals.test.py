import importlib.util
import os
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
spec = importlib.util.spec_from_file_location("three_originals", Path(__file__).with_name("import-acupuncture-three-originals.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImportTests(unittest.TestCase):
    def test_source_text_preserves_subheadings_notes_and_captions_without_copying_images(self):
        raw = '<header data-type="book"><h1>原書</h1></header><h1>卷一</h1><p>古書文字<small class="雙行夾注">注</small>正文。</p><figure><img src="urn:test:1.jpg"><figcaption>圖注。</figcaption></figure><h1>卷二</h1><p>終。</p>'.encode()
        expected = "古書文字〔注〕正文。\n圖注。\n終。"
        source = {"id": "test", "title": "原書", "name": "原书·录文版", "author": "原作者", "dynasty": "古代", "pinyin": "Yuan Shu", "revision": "a" * 40, "rawSha256": module.digest(raw), "chapters": 2, "characters": len(expected), "images": 1, "extent": "两卷", "tail": "終。"}
        book = module.import_book(source, raw)
        self.assertEqual("\n".join(chapter["content"] for chapter in book["chapters"]), expected)
        self.assertEqual(book["excludedSourceIllustrations"]["references"], ["urn:test:1.jpg"])
        self.assertEqual(book["rightsEvidence"]["scope"], "TEXT_ONLY_CC0")

    def test_changed_source_bytes_never_enter_the_candidate(self):
        with self.assertRaisesRegex(ValueError, "SHA mismatch"):
            module.import_book(module.SOURCES[0], b"changed source")

    @unittest.skipUnless(os.getenv("ACUPUNCTURE_SOURCE_DIR"), "Owner's verified source originals are not in Git")
    def test_all_three_actual_pinned_sources_preserve_complete_text_sequence(self):
        root = Path(os.environ["ACUPUNCTURE_SOURCE_DIR"])
        total_chapters = 0
        for source in module.SOURCES:
            book = module.import_book(source, (root / (source["title"] + ".html")).read_bytes())
            total_chapters += len(book["chapters"])
            self.assertEqual(book["sourceRawSha256"], source["rawSha256"])
        self.assertEqual(total_chapters, 34)


if __name__ == "__main__":
    unittest.main()
