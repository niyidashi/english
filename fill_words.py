"""Generate words.js by filling in Chinese meanings for all 1657 words.
This script reads words_raw.json and writes js/words.js with zh/examples filled in batches.
Each batch is processed by reading the intermediate file and appending results."""

import json, os

# Read all raw words
with open("words_raw.json", "r", encoding="utf-8") as f:
    all_words = json.load(f)

print(f"Total words: {len(all_words)}")

# Split into smaller batches of 30 words each
BATCH = 30
batches = [all_words[i:i+BATCH] for i in range(0, len(all_words), BATCH)]
print(f"Split into {len(batches)} batches of ~{BATCH} words each")

# Write each batch to a file
os.makedirs("batches_small", exist_ok=True)
for i, batch in enumerate(batches):
    path = f"batches_small/batch_{i+1:03d}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(batch, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(batches)} small batch files to batches_small/")
print(f"First batch sample: {batches[0][0]['en']} ({batches[0][0]['pos']})")
