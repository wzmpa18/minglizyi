import json
from pathlib import Path


DATA = Path(__file__).resolve().parents[1] / "src" / "data" / "guoxueClassics.json"
EXPECTED = {
    "lunyu", "daxue", "zhongyong", "daodejing_wangbi", "sunzibingfa",
    "sanzijing", "baijiaxing", "qianziwen", "dizigui", "zhuzijiaxun",
    "shenglvqimeng", "zengguangxianwen",
}


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    books = payload["books"]
    ids = {book["id"] for book in books}
    assert ids == EXPECTED, f"unexpected books: {sorted(ids)}"
    for book in books:
        content = book["content"].strip()
        assert len(content) >= 500, f"{book['title']} is too short"
        assert "Public domainPublic domain" not in content
        assert not content.endswith("编辑")
        assert book["sourceUrl"].startswith("https://zh.wikisource.org/wiki/")
        assert book["license"]
    print(f"validated {len(books)} public-domain classics")


if __name__ == "__main__":
    main()
