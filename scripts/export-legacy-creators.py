#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一次性导出：老系统 tiktok_creators.db 里 region=SG 且有联系方式的达人
→ Compass 可导入的 JSON（.data/legacy-import/sg-creators.json）

只取「联系方式 + 建联历史」为真值；粉丝/GMV/类目/均播为「估算」(metricsEstimated)。
不导 collaborations 的 gmv/orders（空）、不导 scraped_creators stub。
只读老库，绝不写。
"""
import os, re, json, sqlite3, sys

SRC_DB = r"D:\tiktok-creator-tool\backend\tiktok_creators.db"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".data", "legacy-import")
OUT_FILE = os.path.join(OUT_DIR, "sg-creators.json")


def parse_range(text):
    """中文区间文本 → 代表整数。处理 K/M 后缀传播与区间取中点。
    例: '隐藏10k+'→10000, '10K以下'→10000, '100K-300K'→200000,
        '300-500K'→400000, '1M以上'→1000000, '500左右'→500, '无'→0"""
    if text is None:
        return 0
    t = str(text).strip()
    if not t or t in ("无", "-", "隐藏"):
        return 0
    # 找到所有 数字+可选K/M 片段（保留出现顺序）
    parts = re.findall(r"(\d+(?:\.\d+)?)\s*([KkMm千万亿]?)", t)
    parts = [(p[0], p[1]) for p in parts if p[0] != ""]
    if not parts:
        return 0

    def mul(suf):
        s = suf.lower()
        if s == "k":
            return 1000
        if s == "m":
            return 1_000_000
        if s == "千":
            return 1000
        if s == "万":
            return 10000
        if s == "亿":
            return 100_000_000
        return 1

    # 后缀传播：区间里如 '300-500K'，前一个无后缀的沿用后一个的后缀
    suffixes = [p[1] for p in parts]
    last_suf = ""
    for i in range(len(parts) - 1, -1, -1):
        if suffixes[i]:
            last_suf = suffixes[i]
        elif last_suf:
            suffixes[i] = last_suf
    vals = [float(parts[i][0]) * mul(suffixes[i]) for i in range(len(parts))]
    if len(vals) >= 2 and ("-" in t or "~" in t or "～" in t):
        return int((vals[0] + vals[1]) / 2)
    return int(max(vals))


# 意向强度排序（数字越大越强）——派生 legacyOutreach 时取最强
REPLY_RANK = {
    "interested_paid": 6,
    "confirmed": 5,
    "interested": 4,
    "manual_reply": 3,
    "rejected": 1,
    "brand_rejected": 1,
    "": 0,
}
REPLY_LABEL = {
    "interested_paid": "曾洽谈·有意向(付费)",
    "confirmed": "曾确认合作",
    "interested": "曾洽谈·有意向",
    "manual_reply": "曾回复(人工)",
    "rejected": "曾拒绝",
    "brand_rejected": "品牌方拒绝",
}
PARTNER_RANK = {"已合作": 3, "洽谈中": 2, "已拒绝": 1, "": 0, None: 0}


def has_contact(row):
    return any((row[k] or "").strip() for k in ("email", "whatsapp", "instagram", "wechat"))


def main():
    if not os.path.exists(SRC_DB):
        print("源库不存在:", SRC_DB)
        sys.exit(1)
    os.makedirs(OUT_DIR, exist_ok=True)
    db = sqlite3.connect(SRC_DB)
    db.row_factory = sqlite3.Row
    c = db.cursor()

    creators = c.execute("SELECT * FROM creators WHERE region='SG'").fetchall()

    # 预聚合：每个 creator_id 的最强 reply_category + 最近建联时间
    best_reply = {}      # creator_id -> (rank, category)
    last_contact = {}    # creator_id -> sent_at
    for r in c.execute(
        "SELECT creator_id, reply_category, sent_at FROM outreach_records"
    ).fetchall():
        cid = r["creator_id"]
        cat = (r["reply_category"] or "").strip()
        rank = REPLY_RANK.get(cat, 0)
        if cid not in best_reply or rank > best_reply[cid][0]:
            best_reply[cid] = (rank, cat)
        sa = r["sent_at"]
        if sa and (cid not in last_contact or str(sa) > str(last_contact[cid])):
            last_contact[cid] = sa

    # 每个 creator_id 的最强 partnership_status
    best_partner = {}
    for r in c.execute(
        "SELECT creator_id, partnership_status FROM collaborations"
    ).fetchall():
        cid = r["creator_id"]
        ps = r["partnership_status"] or ""
        if cid not in best_partner or PARTNER_RANK.get(ps, 0) > PARTNER_RANK.get(best_partner[cid], 0):
            best_partner[cid] = ps

    out = []
    n_email = n_wa = n_hist = 0
    for row in creators:
        if not has_contact(row):
            continue
        cid = row["id"]
        username = (row["tiktok_username"] or "").strip().lstrip("@")
        if not username:
            continue

        legacy = {}
        if cid in best_reply and best_reply[cid][1]:
            legacy["replyCategory"] = best_reply[cid][1]
            legacy["replyLabel"] = REPLY_LABEL.get(best_reply[cid][1], best_reply[cid][1])
        if cid in best_partner and best_partner[cid]:
            legacy["partnershipStatus"] = best_partner[cid]
        if cid in last_contact and last_contact[cid]:
            legacy["lastContactedAt"] = str(last_contact[cid])

        cats = [x.strip() for x in (row["category"] or "").split(",") if x.strip()]

        item = {
            "username": username,
            "nickname": (row["nickname"] or username).strip(),
            "email": (row["email"] or "").strip(),
            "whatsapp": (row["whatsapp"] or "").strip(),
            "instagram": (row["instagram"] or "").strip(),
            "wechat": (row["wechat"] or "").strip(),
            "contactPerson": (row["contact_person"] or "").strip(),
            "region": "SG",
            # 估算指标（metricsEstimated）
            "followers": int(row["followers"] or 0),
            "gmv": parse_range(row["gmv"]),
            "avgVideoViews": parse_range(row["avg_video_views"]),
            "category": cats[0] if cats else "",
            "categoryLabels": cats,
            "creatorLevel": (row["creator_level"] or "").strip(),
            "avgPriceText": (row["avg_price"] or "").strip(),
            "metricsEstimated": True,
            "librarySource": "legacy-import",
        }
        if legacy:
            item["legacyOutreach"] = legacy

        if item["email"]:
            n_email += 1
        if item["whatsapp"]:
            n_wa += 1
        if legacy:
            n_hist += 1
        out.append(item)

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"导出完成 -> {OUT_FILE}")
    print(f"  总条数: {len(out)}  有email: {n_email}  有whatsapp: {n_wa}  有建联历史: {n_hist}")
    # 抽样
    for s in out[:3]:
        print("  样本:", s["username"], "| gmv=", s["gmv"], "| views=", s["avgVideoViews"],
              "| cat=", s["category"], "| legacy=", s.get("legacyOutreach"))


if __name__ == "__main__":
    main()
