"""Hau xu ly PPTX: pptxgenjs chen <a:pPr> giua cac run cung mot doan (sai schema).
Chi giu pPr dau tien cua moi <a:p>. Chay sau build_deck.js:  python fix_pptx_runs.py"""
import re, shutil, zipfile, sys, os

SRC = "Slide_Backprop_Initialization.pptx"
TMP = SRC + ".tmp"
PPR = re.compile(r"<a:pPr\b[^>]*?(?:/>|>.*?</a:pPr>)", re.S)
PARA = re.compile(r"<a:p>(.*?)</a:p>", re.S)

def fix_para(m):
    inner = m.group(1)
    lead = PPR.match(inner)
    head, rest = (lead.group(0), inner[lead.end():]) if lead else ("", inner)
    rest = PPR.sub("", rest)
    return "<a:p>" + head + rest + "</a:p>"

with zipfile.ZipFile(SRC) as zin, zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if re.match(r"ppt/slides/slide\d+\.xml$", item.filename):
            data = PARA.sub(fix_para, data.decode("utf8")).encode("utf8")
        zout.writestr(item, data)
shutil.move(TMP, SRC)
print("fixed", SRC)
