import re

s = open("main_full.tex", encoding="utf8").read()
lines = s.split("\n")

drop = [
    # Chuong 1 (giu ly thuyet + toan)
    "\\subsection{Đồ thị có nhánh",
    "\\subsection{Softmax và Cross-Entropy",
    "\\subsection{Độ phức tạp tính toán",
    "\\subsection{Các biến thể Gradient Descent",
    "\\subsection{Trực giác $\\mathrm{fan",
    "\\subsection{Chuỗi ảnh hưởng",
    "\\subsection{Ví dụ số: lan truyền variance",
    "\\subsection{Activation × Initialization",
    # Chuong 2
    "\\subsection{Metric thu thập",
    "\\subsection{Môi trường tính toán",
    "\\subsection{Part B: PyTorch Autograd",
    # Chuong 3
    "\\subsection{Gradient norm theo layer",
    "\\subsection{Activation variance theo layer",
    "\\subsection{Weight variance theo layer",
    "\\subsection{Phân phối gradient và activation",
    "\\subsection{Toàn cảnh: loss theo epoch",
    "\\subsubsection*{Đọc chi tiết theo từng activation",
    "\\subsection{Liên hệ tới kiến trúc hiện đại",
    "\\subsection{Câu hỏi thường gặp",
    # Phu luc: bo bang phu
    "\\section{Bảng kết quả đầy đủ",
    "\\section{Bảng thuật ngữ",
]

head_re = re.compile(r"^\\(chapter|section|subsection|subsubsection|appendix|phantomsection|bibliography|end\{document\})")
removed = 0
for d in drop:
    idx = [i for i, l in enumerate(lines) if l.startswith(d)]
    for i in sorted(idx, reverse=True):
        j = i + 1
        while j < len(lines) and not head_re.match(lines[j]):
            j += 1
        del lines[i:j]
        removed += 1

out = "\n".join(lines)
out = out.replace("\\begin{lstlisting}", "\\begin{lstlisting}")
open("main_short20.tex", "w", encoding="utf8").write(out)
print("removed blocks:", removed)
