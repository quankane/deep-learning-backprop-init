p="main_chapters.tex"
s=open(p,encoding="utf8").read()
a="\chapter*{LỜI CẢM ƠN}\n\addcontentsline{toc}{chapter}{LỜI CẢM ƠN}\n"
b="\chapter*{DANH MỤC TỪ VIẾT TẮT}"
i=s.index(a)+len(a); j=s.index(b)
body=s[i:j]
body="\setlength{\parskip}{1.1em}\linespread{1.5}\selectfont\n"+body.rstrip()+"\n\linespread{1.0}\selectfont\setlength{\parskip}{0.4em}\n\n"
s=s[:i]+body+s[j:]
open(p,"w",encoding="utf8").write(s)
print("ok")
