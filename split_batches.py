import json, os

with open("words_raw.json", "r", encoding="utf-8") as f:
    words = json.load(f)

BATCH_SIZE = 150
batches = [words[i:i+BATCH_SIZE] for i in range(0, len(words), BATCH_SIZE)]
print(f"Split {len(words)} words into {len(batches)} batches of ~{BATCH_SIZE}")

os.makedirs("batches", exist_ok=True)
for i, batch in enumerate(batches):
    path = f"batches/batch_{i+1:02d}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(batch, f, ensure_ascii=False, indent=2)
    print(f"  {path}: {len(batch)} words (Unit {batch[0]['unit']}-{batch[-1]['unit']})")
