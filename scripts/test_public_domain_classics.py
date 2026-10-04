import json
from pathlib import Path


DATA = Path(__file__).resolve().parents[1] / "src" / "data" / "guoxueClassics.json"
REQUIRED = {
    "lunyu", "daxue", "zhongyong", "daodejing_wangbi", "sunzibingfa",
    "sanzijing", "baijiaxing", "qianziwen", "dizigui", "zhuzijiaxun",
    "shenglvqimeng", "zengguangxianwen",
    "yijing", "shijing", "liji", "zuozhuan",
}


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    books = payload["books"]
    ids = {book["id"] for book in books}
    assert REQUIRED.issubset(ids), f"missing required books: {sorted(REQUIRED - ids)}"
    assert len(ids) == len(books), "duplicate classic ids"
    assert len(books) >= 42, f"catalogue unexpectedly shrank: {len(books)}"
    for book in books:
        content = book["content"].strip()
        assert len(content) >= 500, f"{book['title']} is too short"
        assert "Public domainPublic domain" not in content
        assert not content.endswith("编辑")
        assert content.count("�") <= 10, f"{book['title']} contains replacement characters"
        assert book["category"]
        assert book["sourceUrl"].startswith(("https://zh.wikisource.org/wiki/", "https://www.gutenberg.org/ebooks/"))
        assert book["license"]
    print(f"validated {len(books)} public-domain classics")


if __name__ == "__main__":
    main()
