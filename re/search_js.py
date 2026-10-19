import sys, re

path = r"C:\Users\djdan\Documents\keybaord\re\gearhub_index.js"
with open(path, "r", encoding="utf-8", errors="replace") as f:
    data = f.read()

patterns = sys.argv[1:]
for pat in patterns:
    print(f"===== PATTERN: {pat} =====")
    count = 0
    for m in re.finditer(pat, data, re.IGNORECASE):
        start = max(0, m.start() - 150)
        end = min(len(data), m.end() + 250)
        snippet = re.sub(r"[^\x20-\x7E]", "?", data[start:end].replace("\n", "\\n"))
        print(f"--- @{m.start()} ---")
        print(snippet)
        count += 1
        if count >= 8:
            print("... (more matches truncated)")
            break
    if count == 0:
        print("(no matches)")
    print()
