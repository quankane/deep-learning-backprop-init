import re

src = open("main_backup_before_short.tex", encoding="utf8").read()
lines = src.split("\n")
start = next(i for i, l in enumerate(lines) if "TRANG BIA" in l) - 1
end = next(i for i, l in enumerate(lines) if l.startswith("\\tableofcontents"))
lines = lines[:start] + lines[end:]
s = "\n".join(lines)

s = s.replace("\\documentclass[12pt,a4paper]{article}", "\\documentclass[12pt,a4paper]{report}")
s = s.replace("\\section{Giới thiệu}", "\\chapter*{LỜI MỞ ĐẦU}")
s = s.replace("\\section{Nền tảng toán học}", "\\chapter{CƠ SỞ LÝ THUYẾT VÀ TOÁN HỌC}\n\\section{Nền tảng toán học}")
s = s.replace("\\section{Phương pháp thực nghiệm}", "\\chapter{THIẾT KẾ THỰC NGHIỆM}\n\\section{Phương pháp thực nghiệm}")
s = s.replace("\\section{Kết quả thực nghiệm}", "\\chapter{KẾT QUẢ VÀ THẢO LUẬN}\n\\section{Kết quả thực nghiệm}")
s = s.replace("\\section{Kết luận}", "\\chapter*{KẾT LUẬN}")

# bo phan thua
a = s.find("\\section{20 câu hỏi phản biện thường gặp}")
b = s.find("\\section{Bảng thuật ngữ Việt--Anh}")
if a != -1 and b != -1 and a < b:
    s = s[:a] + s[b:]
a = s.find("\\section{Danh mục notebook}")
if a != -1:
    b = s.find("\\section{Bảng thuật ngữ Việt--Anh}")
    if b == -1 or b > a:
        s = s[:a] + s[b:] if b != -1 else s[:a] + "\\end{document}\n"

# lời cảm ơn + viết tắt trước mục lục
front = """\\pagenumbering{roman}
\\chapter*{LỜI CẢM ƠN}
\\addcontentsline{toc}{chapter}{LỜI CẢM ƠN}
Nhóm chúng em xin cảm ơn các thầy cô đã hướng dẫn và cung cấp nền tảng về Deep Learning. Báo cáo được thực hiện theo tinh thần trung thực học thuật: mọi số liệu đến từ các lần chạy thực tế và mọi kết luận được giới hạn trong phạm vi thí nghiệm đã thực hiện.

Chúng em xin chân thành cảm ơn!

\\hfill{\\textbf{Nhóm 2 thực hiện}}

\\chapter*{DANH MỤC TỪ VIẾT TẮT}
\\addcontentsline{toc}{chapter}{DANH MỤC TỪ VIẾT TẮT}
\\begin{tabular}{ll}
MLP & Multi-Layer Perceptron \\\\
ReLU & Rectified Linear Unit \\\\
SGD & Stochastic Gradient Descent \\\\
RMS & Root Mean Square \\\\
VJP & Vector--Jacobian Product \\\\
NaN & Not a Number \\\\
\\end{tabular}

"""
s = s.replace("\\tableofcontents", front + "\\tableofcontents", 1)

# 13pt body
fontblk = """\\usepackage{anyfontsize}
\\makeatletter
\\renewcommand\\normalsize{\\@setfontsize\\normalsize{13}{16.5}}
\\renewcommand\\small{\\@setfontsize\\small{13}{16.5}}
\\renewcommand\\footnotesize{\\@setfontsize\\footnotesize{13}{16}}
\\makeatother
\\normalsize
"""
s = s.replace("\\begin{document}", fontblk + "\\begin{document}", 1)

s = s.replace("[H]", "[htbp]")
s = re.sub(r"\\newpage|\\clearpage", "", s)
s = re.sub(r"\\appendix(?![a-zA-Z])", "\\\\clearpage\\\\appendix", s, count=1)

pat = re.compile(r"\\begin\{lstlisting\}.*?\\end\{lstlisting\}\n?", re.S)
blocks = []
s = pat.sub(lambda m: (blocks.append(m.group(0)), "")[1], s)
s = s.replace("\\end{document}", "\n\\section*{Phụ lục: mã nguồn trích dẫn}\n" + "\n".join(blocks) + "\n\\end{document}")

open("main_full.tex", "w", encoding="utf8").write(s)
print("written; code blocks moved:", len(blocks))
