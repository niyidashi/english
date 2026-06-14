"""Merge all batch files into js/words.js"""
import json, os

all_words = []

for i in range(1, 13):
    path = f"batches/batch_{i:02d}.json"
    with open(path, "r", encoding="utf-8") as f:
        batch = json.load(f)
    all_words.extend(batch)
    filled = sum(1 for w in batch if w.get("zh"))
    print(f"  {path}: {len(batch)} words, {filled} filled")

# Verify
total = len(all_words)
filled = sum(1 for w in all_words if w.get("zh"))
empty = total - filled
print(f"\nTotal: {total}, Filled: {filled}, Empty: {empty}")

if empty > 0:
    print(f"WARNING: {empty} words still empty!")
    for w in all_words:
        if not w.get("zh"):
            print(f"  Empty: id={w['id']} en={w['en']}")

# Write words.js
with open("js/words.js", "w", encoding="utf-8") as f:
    f.write("// Hello 单词 - Word Data\n")
    f.write("// Auto-generated. " + str(total) + " words across 10 units.\n")
    f.write("const WORDS = ")
    json.dump(all_words, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"\nWritten js/words.js ({total} words)")
