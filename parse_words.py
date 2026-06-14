import re, json, subprocess

result = subprocess.run(['pdftotext', '单词.pdf', '-'], capture_output=True, text=True)
text = result.stdout
print(f"Extracted {len(text)} chars, {len(text.splitlines())} lines")

# Parse pattern: word followed by POS
pattern = re.compile(r'([a-zA-Z]+(?:\(\w+\))?(?:\/\-?[a-z]+)?)\s+((?:n|v|adj|adv|prep|conj|pron|num|art|int|aux)\.(?:\s*;?\s*(?:n|v|adj|adv|prep|conj|pron|num|art|int|aux)\.)*)')

words = []
seen = set()
unit = 1

for line in text.split('\n'):
    m = re.search(r'Lesson\s*(\d+)\s*\(.*?Unit\s*(\d+)\)', line)
    if m:
        unit = int(m.group(2))

    matches = pattern.findall(line)
    for word_raw, pos_raw in matches:
        word = word_raw.strip().rstrip(')').lstrip('(')
        if word.lower() in seen: continue
        if len(word) < 3: continue
        seen.add(word.lower())

        pos_parts = re.findall(r'(n|v|adj|adv|prep|conj|pron|num|art|int|aux)\.', pos_raw)
        pos_clean = '；'.join([p+'.' for p in pos_parts]) if pos_parts else pos_raw.strip()

        words.append({"en": word, "pos": pos_clean, "unit": unit})

for i, w in enumerate(words):
    w["id"] = i + 1
    w["zh"] = ""
    w["example"] = ""
    w["exampleZh"] = ""

print(f"\nParsed {len(words)} words across units 1-10")
for u in sorted(set(w['unit'] for w in words)):
    count = sum(1 for w in words if w['unit'] == u)
    print(f"  Unit {u}: {count} words")

with open("words_raw.json", "w", encoding="utf-8") as f:
    json.dump(words, f, ensure_ascii=False, indent=2)
print("\nSaved to words_raw.json")
