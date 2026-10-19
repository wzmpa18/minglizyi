"""Rebuild the literal research index from existing, pinned Guoxue editions.

No downloads, medical conclusions, generated cases, source rewrites or page numbers.
The index is a disposable derivative; complete text stays in the original corpus.
Run with python -X utf8 -B scripts/build_study_research_index.py. Commit the
reviewed result and rerun the source-location tests before publishing content.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'backend_deploy/data'

def main():
    topics = json.loads((DATA/'study-research-topics.json').read_text('utf-8'))
    mapping = json.loads((ROOT/'src/data/lifeSearchTraditional.json').read_text('utf-8'))
    def norm(value):
        return ''.join(mapping.get(c, c) for c in value)
    concepts = [(x, [norm(a) for a in x['aliases']]) for c in topics['categories'] for x in c['symptoms']]
    books, metadata, cards = [], [], []
    for name in ['tcmOriginalEditions.json', 'tcmClinicalOriginalEditions.json']:
        books.extend(json.loads((ROOT/'src/data'/name).read_text('utf-8')))
    for book in books:
        metadata.append({k:book.get(k, '') for k in ['id','name','author','sourceName','sourceUrl','sourceRevision','sourceRevisionUrl','license','verification','contentSha256']})
        for chapter in book['chapters']:
            offset = 0
            for n, part in enumerate(chapter['content'].split('\n\n'), 1):
                normalized = norm(part)
                matched = [(x, aliases) for x, aliases in concepts if any(a in normalized for a in aliases)]
                if matched:
                    first = min(normalized.find(a) for _, aliases in matched for a in aliases if a in normalized)
                    start = max(0, first-55)
                    end = min(len(part), start+220)
                    card = dict(id=hashlib.sha256((book['id']+'\0'+chapter['id']+'\0'+str(n)+'\0'+part).encode()).hexdigest()[:24],bookId=book['id'],chapterId=chapter['id'],chapterTitle=chapter['title'],paragraph=n,start=offset+start,end=offset+end,quote=part[start:end],conceptIds=[x['conceptId'] for x, _ in matched])
                    assert chapter['content'][card['start']:card['end']] == card['quote']
                    cards.append(card)
                offset += len(part)+2
    result = dict(schema=1,type='derived literal index, not a second medical corpus',books=metadata,cards=cards)
    target = DATA/'study-research-evidence.json'
    target.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n','utf-8')
    print(json.dumps(dict(books=len(books),concepts=len(concepts),cards=len(cards),bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest())))

if __name__ == '__main__':
    main()
