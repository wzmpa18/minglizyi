"""Portable extraction tests; never require or modify the owner's originals."""
import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location("ni_import", Path(__file__).with_name("import-ni-teacher-courses.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sample_word(text="中文AB"):
    header, fat, directory, word, table = [bytearray(512) for _ in range(5)]
    header[:8] = bytes.fromhex("d0cf11e0a1b11ae1")
    struct.pack_into("<HH", header, 30, 9, 6)
    for offset, value in [(44, 1), (48, 1), (56, 0), (60, 0xFFFFFFFE), (64, 0), (68, 0xFFFFFFFE), (72, 0)]:
        struct.pack_into("<I", header, offset, value)
    struct.pack_into("<109I", header, 76, 0, *([0xFFFFFFFF] * 108))
    struct.pack_into("<128I", fat, 0, 0xFFFFFFFD, 0xFFFFFFFE, 0xFFFFFFFE, 0xFFFFFFFE, *([0xFFFFFFFF] * 124))
    for index, (name, kind, start, size) in enumerate([("Root Entry", 5, 0xFFFFFFFE, 0), ("WordDocument", 2, 2, 512), ("1Table", 2, 3, 512)]):
        offset = index * 128
        name_bytes = (name + "\0").encode("utf-16le")
        directory[offset:offset + len(name_bytes)] = name_bytes
        struct.pack_into("<H", directory, offset + 64, len(name_bytes))
        directory[offset + 66] = kind
        struct.pack_into("<IQ", directory, offset + 116, start, size)
    struct.pack_into("<H", word, 0, 0xA5EC)
    struct.pack_into("<H", word, 10, 0x200)
    struct.pack_into("<H", word, 32, 14)
    struct.pack_into("<H", word, 62, 22)
    struct.pack_into("<I", word, 76, len(text))
    struct.pack_into("<H", word, 152, 93)
    struct.pack_into("<II", word, 154 + 33 * 8, 0, 21)
    word[400:400 + len(text) * 2] = text.encode("utf-16le")
    table[:21] = b"\x02" + struct.pack("<I", 16) + struct.pack("<IIHIH", 0, len(text), 0, 400, 0)
    return bytes(header + fat + directory + word + table)


class ExtractionTests(unittest.TestCase):
    def test_word_uses_piece_table_not_unrelated_binary_strings(self):
        text, info = module.word_text(sample_word())
        self.assertEqual(text, "中文AB")
        self.assertEqual(info["mainTextCharacters"], 4)
        self.assertEqual(info["pieceCount"], 1)

    def test_cyclic_sector_chain_is_rejected(self):
        data = bytearray(sample_word())
        struct.pack_into("<I", data, 512 + 4, 1)
        with self.assertRaisesRegex(ValueError, "cyclic"):
            module.word_text(bytes(data))

    def test_rtf_decodes_dbcs_unicode_and_skips_hidden_destinations(self):
        raw = br"{\rtf1\ansi\ansicpg936{\fonttbl ignored}\'d6\'d0\'ce\'c4\par\u20013?\u25991?{\pict 00ff}{\*\generator hidden}AB}"
        text, info = module.rtf_text(raw)
        self.assertEqual(text, "中文\n中文AB")
        self.assertEqual(info["format"], "RTF")

    def test_chapter_pagination_keeps_every_source_character_in_order(self):
        text = "说明\n" + "甲" * 15000 + "\n第一章 开始（1-00:00:01）\n课程正文\n一、主题（1-00:00:02）\n末尾。"
        chapters = module.make_chapters(text, "course", "acupuncture")
        self.assertEqual("".join(chapter["content"] for chapter in chapters), text)
        self.assertTrue(all(module.sha(chapter["content"].encode()) == chapter["sha256"] for chapter in chapters))
        self.assertEqual(chapters[-1]["title"], "一、主题（1-00:00:02）")


if __name__ == "__main__":
    unittest.main()
