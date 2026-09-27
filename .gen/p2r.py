
# ---------- Реконструкция ручных названий из текущего каталога ----------
# Повторяем генератор ПРОШЛОГО запуска (пороги 0.22/0.50 + история):
# всё, что НЕ совпадает с его выходом — ручные названия (OVERRIDES).
def _gen_prev(i, em):
    rng = random.Random(5000 + i)
    b = base_name(em)
    g = gender_of(b)
    roll = rng.random()
    if roll < 0.22:
        p = rng.choice(POSS)
        return f"{p[GI[g]]} {b}"
    elif roll < 0.50:
        return rng.choice(SPECIAL)(b)
    elif roll < 0.515:
        if rng.random() < 0.5:
            a = rng.choice(HIST_ADJ4)
            return f"{a[GI[g]]} {b}"
        return rng.choice(HIST_F)(b)
    else:
        a = rng.choice(ADJ4)
        return f"{a[GI[g]]} {b}"

import os
OVR_PATH = '/mnt/agents/output/overrides.json'
if os.path.exists(OVR_PATH):
    OVERRIDES = json.load(open(OVR_PATH, encoding='utf-8'))
    print('loaded overrides from json:', len(OVERRIDES))
else:
    OVERRIDES = {}
    n_gen = 0
    for i, item in enumerate(arr):
        if item['n'] == _gen_prev(i, item['e']):
            n_gen += 1
        else:
            OVERRIDES[item['e']] = item['n']
    print('reconstructed overrides:', len(OVERRIDES), '| matched generator:', n_gen)

# история перекрывает всё
OVERRIDES.update(HIST_OVERRIDES)

# сохраняем ручные названия в постоянное хранилище (переживает /tmp)
import os
os.makedirs('/mnt/agents/output', exist_ok=True)
json.dump(OVERRIDES, open('/mnt/agents/output/overrides.json', 'w', encoding='utf-8'),
          ensure_ascii=False)
