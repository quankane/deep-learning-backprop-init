# Kịch bản thuyết trình chi tiết — Backpropagation & Parameter Initialization

**Dùng cùng với:** `Slide_Backprop_Initialization.pptx` (31 slide)
**Thời lượng đề xuất:** 35–45 phút thuyết trình + 10–15 phút demo/Q&A (bản dài, học thuật)
**Đối tượng:** Học phần Deep Learning bậc Thạc sĩ

> Đây là bản kịch bản NÓI **đầy đủ và chi tiết** — viết để đọc gần như nguyên văn khi luyện tập, không phải bản rút gọn. Mỗi slide có: (1) phần dẫn nhập nối từ slide trước, (2) phần trình bày chính đầy đủ câu chữ, (3) cách ĐỌC TO từng ký hiệu toán học bằng tiếng Việt (mở ngoặc ngay sau ký hiệu), (4) một câu chuyển ý sang slide kế tiếp. Speaker notes trong PPTX là bản rút gọn của chính kịch bản này — nếu quên, chỉ cần mở Notes trong PowerPoint.

---

## 0. Quy ước đọc ký hiệu toán học (đọc trước khi luyện tập)

Dùng bảng này để luyện phát âm các ký hiệu sẽ xuất hiện lặp lại xuyên suốt bài. Khi ký hiệu xuất hiện lần đầu trong kịch bản bên dưới, cách đọc sẽ được nhắc lại trong ngoặc; từ lần thứ hai trở đi có thể đọc tắt.

| Ký hiệu | Cách đọc tiếng Việt | Ý nghĩa |
|---|---|---|
| `f'(x)` | "f phẩy của x" | đạo hàm của hàm f tại x |
| `∂L/∂w` | "del L trên del w" (hoặc "đạo hàm riêng của L theo w") | đạo hàm riêng của Loss theo tham số w |
| `∇L` | "nabla L" (hoặc "gradient của L") | vector gradient của Loss |
| `∇_θL` | "nabla theta L" (hoặc "gradient của L theo theta") | gradient của L theo TOÀN BỘ vector tham số θ |
| `θ` | "theta" | ký hiệu chung cho vector tham số (weight + bias) |
| `η` | "eta" | learning rate — tốc độ học |
| `δ` | "delta" | ký hiệu cho ∂L/∂z ở một lớp — "sai số cục bộ" lan truyền ngược |
| `z⁽ˡ⁾` | "z mũ (l), lớp thứ l" | pre-activation (giá trị trước khi qua activation) ở lớp l |
| `a⁽ˡ⁾` | "a mũ (l), lớp thứ l" | activation (giá trị sau khi qua activation) ở lớp l |
| `Var(·)` | "Var, phương sai của..." | phương sai |
| `E[·]` | "E, kỳ vọng của..." | kỳ vọng (giá trị trung bình theo xác suất) |
| `N(0, σ²)` | "N, không, sigma bình phương" (phân phối chuẩn, trung bình 0, phương sai sigma bình phương) | phân phối Gauss/chuẩn |
| `W_ij ~ N(0, 2/fan_in)` | "W dưới i j tuân theo phân phối chuẩn N, trung bình không, phương sai 2 trên fan-in" | cách khởi tạo weight theo He |
| `fan_in`, `fan_out` | đọc nguyên văn tiếng Anh "fan in", "fan out" | số neuron đầu vào / đầu ra của 1 lớp |
| `RMS` | đọc tắt "R-M-S" hoặc đọc đầy đủ "căn bậc hai trung bình bình phương" (root-mean-square) | chỉ số đo độ lớn trung bình |
| `pp` | đọc "điểm phần trăm" (percentage points) | đơn vị chênh lệch giữa hai tỉ lệ phần trăm |

---

## 1. Trước khi bắt đầu — checklist chuẩn bị

- [ ] Mở `Slide_Backprop_Initialization.pptx`, chạy thử Present từ đầu 1 lượt (không nói) để chắc hình không vỡ trên máy chiếu thật.
- [ ] Mở sẵn 1 terminal tại thư mục gốc project (`deep-learning-backprop-init/`), đã activate đúng Python env có `torch`, `numpy`, `pandas`, `matplotlib`.
- [ ] Test nhanh: `python -c "import torch; print(torch.__version__)"` — tránh lỗi giữa buổi.
- [ ] Đọc lại Mục 0 (bảng ký hiệu) 1 lượt để quen miệng trước khi lên trình bày — đây là phần dễ vấp nhất khi nói trực tiếp về công thức.
- [ ] Nếu phần Demo-sống (Mục 6 bên dưới) không chạy được tại chỗ (wifi/điện/thời gian) → có **Kế hoạch B**: mở sẵn các file JSON/CSV/PNG trong `results/` để chỉ tay thay vì chạy code.
- [ ] Nhớ: KHÔNG cần chạy lại thực nghiệm trong buổi — mọi số liệu trên slide đã có sẵn trong `results/`. Chạy lại chỉ để "diễn" cho khán giả thấy pipeline hoạt động thật.

---

## Cấu trúc buổi nói (4 Act, khớp progress-dots trên slide)

| Act | Slide | Nội dung | Thời gian gợi ý |
|---|---|---|---|
| 1. Motivation & Math | 1–9 | Đặt vấn đề → Derivative → Gradient → Gradient Descent → Forward → Chain Rule → Backprop Example → Multi-layer Backprop | ~12 phút |
| 2. Vanishing/Exploding & Init | 10–17 | Vanishing → Exploding → Zero/Random/Xavier/He → Synthesis | ~11 phút |
| 3. Experiment | 18–27 | Thiết kế thực nghiệm → Metrics → 5 experiment → Heatmap → Activation Variance → Depth → Bảng tổng hợp | ~15 phút |
| 4. Conclusion | 28–31 | Limitations → Kết luận → Mở rộng → References | ~5 phút |

---

## ACT 1 — Motivation & Math (Slide 1–9)

### Slide 1 — Title

**Nói (nguyên văn, mở đầu):**

> "Kính chào thầy/cô và các bạn. Em tên là Bùi Đức Quân, hôm nay em xin trình bày đề tài: Backpropagation và Parameter Initialization trong mạng nơ-ron sâu — tạm dịch là Lan truyền ngược và Khởi tạo Tham số. Bài trình bày này được xây dựng xoay quanh MỘT câu hỏi nghiên cứu duy nhất, xuyên suốt từ đầu tới cuối:
>
> *Khởi tạo tham số ảnh hưởng như thế nào đến việc gradient (đọc: gờ-rây-đi-ần, tức đạo hàm) lan truyền qua mạng, và tới khả năng mạng có hội tụ được hay không?*
>
> Đây không đơn thuần là một bài giảng lại lý thuyết đã học trên lớp. Cấu trúc bài gồm 4 phần lớn: phần một ôn lại nền tảng toán học từ đạo hàm tới Backpropagation; phần hai giải thích cơ chế vanishing và exploding gradient — tạm dịch là gradient biến mất và gradient bùng nổ — cùng với các chiến lược khởi tạo tham số ra đời để giải quyết vấn đề đó; phần ba là phần quan trọng nhất — một thực nghiệm có kiểm soát (controlled experiment) do chính em thiết kế và chạy, nhằm KIỂM CHỨNG lại những gì lý thuyết dự đoán bằng số liệu đo được thật; và phần bốn là kết luận, cùng với một slide Limitations nêu rõ giới hạn của những gì em đã làm được — đúng tinh thần trung thực khoa học."

**Chuyển ý:** "Trước khi đi vào công thức, em xin bắt đầu bằng một câu hỏi trực quan để đặt vấn đề."

---

### Slide 2 — Motivation

**Nói:**

> "Hãy tưởng tượng một mạng nơ-ron rất sâu — ví dụ 50 lớp (layer). Input đi qua Layer 1, Layer 2, cứ thế cho tới Layer 50, rồi cho ra Loss — tức hàm mất mát, đại lượng đo mức độ sai của mô hình so với nhãn thật.
>
> Câu hỏi đầu tiên đặt ra: Layer 1 — lớp gần input nhất, xa Loss nhất — làm sao BIẾT được là nó cần thay đổi trọng số theo hướng nào để giảm Loss? Câu trả lời cho câu hỏi này chính là thuật toán Backpropagation, mà em sẽ trình bày chi tiết ở phần sau.
>
> Nhưng ngay khi có Backpropagation rồi, một vấn đề mới lập tức xuất hiện. Vì Loss chỉ 'nhìn thấy' được đầu ra cuối cùng, để tính được đạo hàm cho Layer 1, gradient phải LAN TRUYỀN NGƯỢC qua tất cả 50 lớp đó. Và trong quá trình lan truyền ngược qua từng ấy phép biến đổi liên tiếp, độ lớn của gradient có thể tiến dần về 0 — hiện tượng gọi là vanishing gradient — hoặc tiến về vô cùng — gọi là exploding gradient. Cả hai đều khiến mạng không học được.
>
> Và đây chính là điểm nối trực tiếp sang câu hỏi thứ ba: liệu ta có thể CHỌN cách khởi tạo tham số ban đầu — ký hiệu là θ₀ (đọc: theta không, tức là giá trị của theta tại thời điểm khởi tạo, trước khi huấn luyện) — một cách khôn ngoan, để ngay từ đầu đã hạn chế được nguy cơ vanishing hay exploding? Đây chính là động lực ra đời của các phương pháp Xavier và He mà em sẽ trình bày ở phần hai."

**Chuyển ý:** "Để hiểu được Backpropagation một cách chính xác, ta cần quay lại từ viên gạch nền tảng nhất: đạo hàm."

---

### Slide 3 — Derivative

**Nói:**

> "Đạo hàm — derivative — của một hàm số f tại điểm x, ký hiệu là f'(x) (đọc: f phẩy của x), được định nghĩa bằng giới hạn:
>
> f'(x) bằng giới hạn khi h tiến tới 0 của, trong ngoặc, f của (x cộng h) trừ f của x, tất cả chia cho h.
>
> Nói bằng lời: đạo hàm đo mức độ thay đổi của giá trị đầu ra f(x) khi ta thay đổi đầu vào x đi một lượng rất nhỏ, gọi là h. Ví dụ kinh điển: nếu f(x) bằng x bình phương, thì đạo hàm f'(x) bằng 2x. Nghĩa là tại x=3, độ dốc của hàm là 6 — nếu x tăng thêm một lượng rất nhỏ, giá trị hàm sẽ tăng nhanh gấp 6 lần lượng đó.
>
> Em xin nhấn mạnh: đây là viên gạch nền tảng DUY NHẤT cần nhớ trong toàn bộ bài. Mọi khái niệm phức tạp hơn xuất hiện sau đây — gradient, chain rule, và cuối cùng là Backpropagation — đều chỉ là việc áp dụng khái niệm đạo hàm này một cách có hệ thống và lặp lại nhiều lần. Không có gì bí ẩn hơn thế. Vì đây là kiến thức calculus cơ bản, em sẽ không dừng lại lâu ở slide này."

**Chuyển ý:** "Vấn đề là: trong Deep Learning, ta không có một biến x duy nhất, mà có hàng triệu tham số cùng lúc. Vậy khái niệm đạo hàm mở rộng ra sao?"

---

### Slide 4 — Partial Derivative & Gradient

**Nói:**

> "Trong một mạng nơ-ron thực tế, hàm Loss không phụ thuộc vào một biến, mà phụ thuộc vào hàng triệu tham số cùng lúc — ta viết L(w₁, w₂, …, wₙ) (đọc: L của w một, w hai, chấm chấm chấm, w n) để chỉ việc Loss là một hàm của n tham số.
>
> Với mỗi tham số riêng lẻ, ta có một đạo hàm riêng — partial derivative — ký hiệu ∂L/∂w₁ (đọc: del L trên del w một), đo mức Loss thay đổi khi CHỈ riêng w₁ thay đổi, các tham số khác giữ nguyên.
>
> Gộp tất cả các đạo hàm riêng này lại thành MỘT vector, ta được Gradient, ký hiệu ∇L (đọc: nabla L):
>
> ∇L bằng vector cột gồm ∂L/∂w₁, ∂L/∂w₂, cho tới ∂L/∂wₙ.
>
> Đây là điểm mà em muốn nhấn mạnh CHÍNH XÁC, vì đây là chỗ rất hay bị phát biểu sai ngay cả trong nhiều tài liệu không chính thống: **∇L chỉ HƯỚNG TĂNG nhanh nhất của Loss trong không gian tham số — KHÔNG PHẢI hướng giảm.** Nói cách khác, nếu ta di chuyển tham số theo đúng hướng của ∇L, Loss sẽ tăng nhanh nhất có thể tại điểm đó. Muốn GIẢM Loss, ta phải đi theo hướng NGƯỢC LẠI, tức là −∇L (đọc: âm nabla L). Đây chính là nội dung của slide tiếp theo — Gradient Descent."

**Chuyển ý:** "Vậy nếu đã có Gradient rồi, làm sao dùng nó để thực sự cập nhật được tham số?"

---

### Slide 5 — Gradient Descent

**Nói:**

> "Gradient Descent là QUY TẮC cập nhật tham số dựa trên gradient đã tính được. Công thức dạng vô hướng — cho một tham số đơn lẻ w:
>
> w_new (đọc: w mới) bằng w_old (đọc: w cũ) trừ η (eta) nhân với ∂L/∂w.
>
> Và dạng tổng quát hơn, cho TOÀN BỘ vector tham số θ cùng lúc:
>
> θ_new bằng θ_old trừ η nhân ∇_θL (đọc: nabla theta L, tức gradient của L theo toàn bộ theta).
>
> Trong đó: w — hay θ ở dạng tổng quát — là tham số cần cập nhật; η, đọc là eta, chính là learning rate, tức tốc độ học, quyết định bước nhảy lớn hay nhỏ mỗi lần cập nhật; và L là hàm Loss cần tối thiểu hoá.
>
> Dấu trừ ở đây KHÔNG phải là chi tiết ngẫu nhiên — nó BẮT BUỘC phải có, đúng như em vừa giải thích ở slide trước: vì bản thân ∇L chỉ hướng TĂNG, nên −∇L mới thực sự là hướng GIẢM nhanh nhất cục bộ. Trực giác hình ảnh thường dùng: hãy tưởng tượng một quả bóng đặt trên một bề mặt địa hình gọi là 'loss landscape' — bề mặt hàm mất mát — quả bóng sẽ tự nhiên lăn xuống theo hướng dốc nhất, và hướng dốc xuống đó chính là hướng ngược với gradient."

**Chuyển ý:** "Nhưng Gradient Descent chỉ là quy tắc SỬ DỤNG gradient. Câu hỏi tiếp theo: gradient đó được TÍNH ra như thế nào trong một mạng nơ-ron thực tế? Trước khi trả lời, ta cần hiểu bước forward pass diễn ra trước đó."

---

### Slide 6 — Forward Propagation

**Nói:**

> "Forward Propagation — lan truyền tiến — là bước tính toán đi từ input tới output. Với một neuron đơn giản nhận hai input x₁, x₂ (đọc: x một, x hai), công thức là:
>
> z bằng w₁x₁ cộng w₂x₂ cộng b, rồi a bằng f của z, rồi L bằng L của a và y.
>
> Trong đó z (đọc: zét, hoặc giữ nguyên 'z') là pre-activation — tổng có trọng số cộng bias; a là activation — giá trị sau khi z đi qua hàm kích hoạt f, ví dụ ReLU hay Sigmoid; và cuối cùng L là Loss, so sánh giữa dự đoán a — hoặc ŷ (đọc: y mũ) ở lớp output — với nhãn thật y.
>
> Đây là điểm em cần phát biểu CHÍNH XÁC, vì đây cũng là một chỗ rất dễ bị nói sai theo hướng tuyệt đối hoá: **Forward pass CHƯA tính parameter gradient — nhưng nó KHÔNG PHẢI 'không liên quan gì' tới gradient.** Nói chính xác: forward pass tính ra giá trị đầu ra, ĐỒNG THỜI lưu lại tất cả các giá trị trung gian — cụ thể là z và a ở từng lớp — cùng với toàn bộ computational graph, tức đồ thị tính toán thể hiện các phép biến đổi đã xảy ra. Tất cả những gì được lưu lại này chính là nguyên liệu mà bước backward pass — bước tính gradient thực sự — sẽ cần dùng lại. Đây chính xác là điều mà framework PyTorch làm ngầm mỗi khi ta gọi hàm forward — nó tự động xây dựng computational graph phía sau, sẵn sàng cho bước backward."

**Chuyển ý:** "Vậy bước backward pass đó thực chất tính toán gì? Câu trả lời nằm ở một quy tắc toán học duy nhất: Chain Rule — quy tắc chuỗi."

---

### Slide 7 — Chain Rule

**Nói:**

> "Chain Rule — Quy tắc chuỗi — chính là trái tim toán học của Backpropagation. Xét lại đồ thị tính toán đơn giản: w đi tới z, z đi tới a, a đi tới L. Muốn biết w ảnh hưởng tới L như thế nào, Chain Rule nói rằng ta phải NHÂN các đạo hàm cục bộ dọc theo TOÀN BỘ đường đi từ w tới L:
>
> ∂L/∂w (del L trên del w) bằng, trong ngoặc, ∂L/∂a (del L trên del a), nhân ∂a/∂z (del a trên del z), nhân ∂z/∂w (del z trên del w).
>
> Đây chính là ý tưởng cốt lõi của toàn bộ Backpropagation: đi ngược lại đồ thị tính toán, từ Loss trở về từng tham số, và NHÂN DỒN các đạo hàm cục bộ lại với nhau tại mỗi bước.
>
> Em xin lưu ý một điểm quan trọng về mặt học thuật: ví dụ vừa trình bày là trường hợp SCALAR — tức mỗi đại lượng z, a, w chỉ là MỘT con số — để dễ hình dung. Nhưng trong một mạng nơ-ron thực tế, activation là VECTOR, còn weight là MA TRẬN (matrix). Khi đó, phép nhân các đạo hàm cục bộ tổng quát hoá thành phép nhân Jacobian (đọc: gia-cô-bi-an) — hoặc chính xác hơn, vector-Jacobian product, viết tắt VJP — tức tích giữa một vector và một ma trận Jacobian. Về mặt trực giác, VJP làm đúng công việc mà phép nhân vô hướng làm ở ví dụ trên, chỉ là tổng quát hoá lên chiều cao hơn. Các framework tính vi phân tự động hiện đại — modern autodiff frameworks — như PyTorch, tính các vector-Jacobian product này một cách hoàn toàn tự động, người dùng không cần tự viết tay. Em sẽ không đi sâu vào derivation ma trận ở đây vì vượt phạm vi trình bày — chỉ cần nắm được: bản chất là CÙNG một ý tưởng Chain Rule, chỉ khác về bậc của đối tượng toán học đang thao tác."

**Chuyển ý:** "Để cụ thể hoá ý tưởng này, em xin trình bày một ví dụ chạy tay hoàn chỉnh."

---

### Slide 8 — Backpropagation Example

**Nói:**

> "Đây là ví dụ tối giản nhất có thể để minh hoạ Chain Rule bằng số cụ thể. Cho x bằng 2, w bằng 3, và hai phép biến đổi liên tiếp: z bằng w nhân x, rồi y bằng z bình phương.
>
> Forward pass: z bằng 3 nhân 2 bằng 6; y bằng 6 bình phương bằng 36.
>
> Bây giờ ta đi Backward — tính đạo hàm của y theo w. Áp dụng Chain Rule:
>
> ∂y/∂z (del y trên del z) bằng 2z bằng 2 nhân 6 bằng 12 — đây là đạo hàm của hàm bình phương.
> ∂z/∂w (del z trên del w) bằng x bằng 2 — vì z là hàm tuyến tính theo w.
>
> Nhân hai đạo hàm cục bộ này lại theo đúng Chain Rule: ∂y/∂w (del y trên del w) bằng 12 nhân 2 bằng 24.
>
> Có thể kiểm chứng độc lập bằng cách viết y trực tiếp theo w: y bằng (wx) bình phương bằng w²x², đạo hàm theo w là 2wx², thay số: 2 nhân 3 nhân 4 bằng 24 — khớp hoàn toàn. Ví dụ nhỏ này chính là bản chất của Chain Rule ở quy mô đơn giản nhất — và cùng một logic này, khi lặp lại hàng triệu lần qua hàng chục lớp trong một mạng thật, chính là những gì thuật toán Backpropagation thực hiện."

**Chuyển ý:** "Bây giờ ta mở rộng ví dụ này lên một mạng nhiều lớp, để thấy rõ điều gì xảy ra khi số phép nhân tăng lên."

---

### Slide 9 — Multi-layer Backpropagation

**Nói:**

> "Xét một mạng nhiều lớp: x đi qua W₁ (đọc: W một) để ra h₁ (đọc: h một), tiếp tục qua W₂ để ra h₂, qua W₃ để ra ŷ, và cuối cùng ra Loss. Khi đi backward, thứ tự tính toán ngược lại: từ Loss, ta tính ∇W₃ (đọc: nabla W ba, tức gradient của Loss theo W₃), rồi ∇W₂, rồi ∇W₁.
>
> Đây là điểm mấu chốt của toàn bộ phần lý thuyết, và cũng là điểm em cần phát biểu chính xác về mặt toán học: **gradient lan truyền về lớp CÀNG GẦN input phụ thuộc vào TÍCH của CÀNG NHIỀU local Jacobian VÀ weight transformation** — chứ không đơn thuần là tích của các đạo hàm vô hướng đơn giản như ở ví dụ slide trước. Nói cách khác, W₁ — lớp xa Loss nhất — phải 'gánh' tích luỹ của toàn bộ chuỗi biến đổi phía sau nó.
>
> Ở đây em xin làm rõ một điểm rất hay bị nhầm lẫn, kể cả giữa những người đã học qua Deep Learning: Backpropagation và Gradient Descent là HAI khái niệm HOÀN TOÀN ĐỘC LẬP, đóng hai vai trò khác nhau. Em minh hoạ bằng sơ đồ ba bước dưới đây: bước Forward tính prediction và Loss; bước Backward — chính là Backpropagation — CHỈ tính gradient, và DỪNG LẠI ở đó; bước Optimizer — sử dụng Gradient Descent hoặc các biến thể như Momentum, Adam — mới thực sự DÙNG gradient đó để cập nhật tham số. Em xin nhấn mạnh lại: **Backpropagation KHÔNG tự cập nhật weight.** Nó chỉ là một thuật toán tính toán — cụ thể là một dạng của kỹ thuật gọi là reverse-mode automatic differentiation, tạm dịch là vi phân tự động theo chiều ngược — giúp tính TOÀN BỘ gradient của một hàm Loss vô hướng theo hàng triệu tham số một cách hiệu quả, bằng cách tái sử dụng các đạo hàm cục bộ đã tính, tránh phải tính lại từ đầu cho từng tham số. Đây chính là lý do vì sao Backpropagation đặc biệt phù hợp với bối cảnh Deep Learning — nơi một scalar Loss duy nhất phụ thuộc vào một số lượng tham số khổng lồ."

**Chuyển ý:** "Vậy khi số lớp — độ sâu của mạng — tăng lên, tích luỹ của rất nhiều phép nhân đó sẽ dẫn tới điều gì? Đây chính là nội dung của hai slide tiếp theo."

---

## ACT 2 — Vanishing/Exploding & Initialization (Slide 10–17)

### Slide 10 — Vanishing Gradient

**Nói:**

> "Vanishing Gradient — tạm dịch là gradient biến mất hoặc gradient tiêu biến. Em xin trình bày một ví dụ minh hoạ đơn giản hoá bằng số vô hướng trước, sau đó phát biểu lại cho chính xác về mặt tổng quát.
>
> Giả sử, chỉ để MINH HOẠ trực giác, mỗi bước biến đổi làm co norm — tức độ lớn — của gradient lại theo một hệ số xấp xỉ 0.5 (không phẩy năm). Qua 20 lớp liên tiếp, hệ số tích luỹ sẽ là 0.5 mũ 20 (đọc: không phẩy năm luỹ thừa hai mươi), xấp xỉ bằng 9.54 nhân 10 mũ trừ 7 (đọc: chín phẩy năm tư nhân mười luỹ thừa âm bảy) — một con số gần như bằng 0.
>
> Em xin nhấn mạnh: đây CHỈ LÀ một ví dụ minh hoạ đơn giản hoá bằng MỘT số vô hướng duy nhất, để dễ hình dung độ lớn của hiệu ứng luỹ thừa. Phát biểu ĐÚNG và TỔNG QUÁT hơn — điều em muốn khán giả nhớ chính xác — là thế này: **gradient trong một mạng sâu bằng TÍCH của rất nhiều local Jacobian VÀ weight matrix. Nếu chuỗi các phép biến đổi này LIÊN TỤC làm giảm norm của gradient, thì gradient lan truyền về các lớp đầu sẽ trở nên rất nhỏ.** Đây không phải là một điều kiện đơn giản kiểu 'đạo hàm nhỏ hơn 1' áp dụng cho MỘT con số — mà là hành vi tích luỹ của CẢ MỘT CHUỖI ma trận, phụ thuộc vào norm của từng ma trận đó nhân lại với nhau.
>
> Hệ quả thực tế: các lớp gần input gần như không nhận được tín hiệu học nào có ý nghĩa; trọng số ở những lớp đó gần như đứng yên tuyệt đối suốt cả quá trình huấn luyện, bất kể ta cho mạng chạy bao nhiêu epoch."

**Chuyển ý:** "Đó là khi gradient co lại. Điều gì xảy ra ở chiều ngược lại — khi gradient liên tục được khuếch đại?"

---

### Slide 11 — Exploding Gradient

**Nói:**

> "Exploding Gradient — gradient bùng nổ — là hiện tượng đối lập, nhưng cùng chung một cơ chế toán học. Vẫn với ví dụ minh hoạ đơn giản hoá: nếu mỗi bước KHUẾCH ĐẠI norm gradient theo hệ số xấp xỉ 1.5 (một phẩy năm), qua 20 lớp, hệ số tích luỹ sẽ là 1.5 mũ 20 (một phẩy năm luỹ thừa hai mươi), xấp xỉ bằng 3325 — một con số cực lớn.
>
> Về mặt phát biểu chính xác: **nếu chuỗi các phép biến đổi liên tục KHUẾCH ĐẠI norm của gradient, gradient CÓ THỂ bùng nổ** — em dùng từ 'có thể' một cách có chủ đích, vì đây là xu hướng quan sát được, không phải một định lý tất định áp dụng cho mọi trường hợp.
>
> Đây cũng là chỗ em xin sửa lại một cách diễn đạt hay bị đơn giản hoá quá mức mà em từng mắc phải ở một bản nháp trước: KHÔNG NÊN nói rằng exploding 'chỉ khác vanishing ở dấu của (đạo hàm trừ 1)' — cách nói đó ngầm coi cả hệ thống chỉ là MỘT con số vô hướng duy nhất. Thực tế, đây là hành vi của TÍCH của rất nhiều ma trận trọng số và ma trận Jacobian khác nhau ở từng lớp — phức tạp hơn nhiều so với một phép luỹ thừa của một số thực.
>
> Hậu quả khi xảy ra trong thực tế: giá trị Loss dao động cực mạnh giữa các bước cập nhật, hoặc trở thành NaN — Not a Number, tức giá trị không xác định về mặt số học — và trọng số của mạng tăng vọt mất kiểm soát. Ở phần thực nghiệm, cụ thể là Experiment 3, em sẽ cho khán giả thấy đúng hiện tượng này xảy ra THẬT, bằng số liệu đo được chứ không phải minh hoạ lý thuyết suông."

**Chuyển ý:** "Cả hai hiện tượng vanishing và exploding đều bắt nguồn từ việc chọn SAI cách khởi tạo tham số ban đầu. Vậy khởi tạo sai theo cách cụ thể nào? Trường hợp cực đoan nhất — và cũng hay bị hiểu nhầm nhất — chính là khởi tạo toàn bộ weight bằng 0."

---

### Slide 12 — Why Initialization Matters (Zero-init)

**Nói:**

> "Tại sao ta không đơn giản đặt tất cả weight bằng 0 khi khởi tạo — tức W bằng 0, viết là W = np.zeros(...) trong code? Nghe có vẻ là lựa chọn 'trung tính' nhất, nhưng thực tế đây lại là lựa chọn TỆ NHẤT có thể.
>
> Lý do: khi mọi hidden unit — tức mọi neuron trong CÙNG một lớp ẩn — đều nhận CÙNG một input, và CÙNG một giá trị weight bằng 0, chúng sẽ tính ra CÙNG một giá trị z, CÙNG một giá trị a sau activation, và quan trọng nhất — CÙNG một gradient khi lan truyền ngược. Hiện tượng này gọi là giữ SYMMETRY — tính đối xứng — giữa các hidden unit trong cùng một lớp.
>
> Đây là điểm em xin phát biểu THẬT CHÍNH XÁC, vì đây là chỗ rất dễ nói ngược nghĩa: **Zero-initialization thất bại vì các hidden unit KHÔNG PHÁ ĐƯỢC symmetry** — tiếng Anh gọi đúng là 'failure to break symmetry'. Tuyệt đối KHÔNG được nói là nó thất bại 'vì symmetry breaking' — cụm từ đó có nghĩa NGƯỢC LẠI, tức là 'phá vỡ được đối xứng', trong khi điều THỰC SỰ xảy ra là đối xứng KHÔNG hề bị phá vỡ.
>
> Một phân biệt quan trọng khác: vấn đề symmetry này chỉ áp dụng cho WEIGHT — không áp dụng cho bias. Vì sao? Vì bias không gây ra sự đối xứng GIỮA các hidden unit trong cùng một lớp — kể cả khi mọi bias đều bằng 0, các unit vẫn có thể học ra giá trị khác nhau MIỄN LÀ weight đã phá được đối xứng. Vì vậy, trong thực hành tiêu chuẩn, bias thường VẪN được khởi tạo bằng 0 một cách an toàn.
>
> Về số liệu: trong kiến trúc đang khảo sát ở đây — cụ thể là 10 hidden layer, activation ReLU, cùng kiến trúc dùng xuyên suốt phần Demo phía sau — Zero-init khiến gradient RMS của lớp ẩn thứ nhất, đo TẠI bước khởi tạo, bằng ĐÚNG 0.0, không phải một con số nhỏ xấp xỉ 0. Test accuracy cuối cùng chỉ đạt 10.0%, đúng bằng mức đoán ngẫu nhiên của một bài toán phân loại 10 lớp. Số liệu này lấy trực tiếp từ file `deep_demo_zero.json`, CÙNG kiến trúc và dataset với toàn bộ phần Demo — em cố tình KHÔNG dùng số liệu từ thí nghiệm lưới chính 6-layer/Sigmoid trong báo cáo LaTeX, để tránh trộn lẫn hai thiết lập thực nghiệm khác nhau, gây hiểu nhầm về nguồn gốc số liệu."

**Chuyển ý:** "Vậy nếu không dùng Zero, giải pháp đơn giản tiếp theo là khởi tạo NGẪU NHIÊN. Nhưng ngẫu nhiên với độ lớn bao nhiêu?"

---

### Slide 13 — Random Initialization

**Nói:**

> "Random Initialization — khởi tạo ngẫu nhiên — sinh weight theo công thức W bằng np.random.randn(...) nhân với std, trong đó std (viết tắt của standard deviation, tức độ lệch chuẩn) là một hằng số ta tự chọn.
>
> Random giải quyết TRIỆT ĐỂ vấn đề symmetry của Zero-init, vì mỗi neuron giờ đây xuất phát từ một giá trị khác nhau. Nhưng nếu chọn std SAI, mạng vẫn thất bại — chỉ là thất bại theo một cơ chế khác.
>
> Nếu std QUÁ NHỎ: weight rất nhỏ CÓ XU HƯỚNG làm co lại scale — tức độ lớn — của pre-activation và activation qua mỗi lớp, khiến gradient nhỏ dần theo cấp số nhân qua nhiều lớp, dẫn tới VANISHING GRADIENT. Em dùng từ 'có xu hướng' một cách có chủ đích, vì hành vi cụ thể còn phụ thuộc vào cả phân phối của input và giá trị bias, không chỉ riêng weight.
>
> Nếu std QUÁ LỚN, với mạng dùng activation ReLU như trong thực nghiệm của em: gradient có xu hướng tăng vọt qua mỗi lớp, dẫn tới EXPLODING. Nhưng — đây là điểm quan trọng cần làm rõ, và cũng là điểm khiến câu chuyện trở nên tinh tế hơn — với các activation có vùng BÃO HOÀ như Sigmoid hoặc Tanh, std quá lớn lại có thể đẩy giá trị pre-activation vào VÙNG BÃO HOÀ của hàm kích hoạt, nơi đạo hàm của hàm đó xấp xỉ bằng 0. Kết quả là VẪN xảy ra vanishing gradient, chứ KHÔNG PHẢI exploding. Nói cách khác: 'std lớn luôn gây exploding' là một phát biểu SAI nếu áp dụng chung cho mọi loại activation — đây là hành vi ĐẶC THÙ của mạng ReLU trong thực nghiệm cụ thể của em, chứ không phải một quy luật phổ quát.
>
> Hai thí nghiệm ngay sau — Experiment 2 và Experiment 3, trên mạng ReLU thật — sẽ tái hiện chính xác hai trường hợp std-nhỏ dẫn tới vanishing, và std-lớn dẫn tới exploding, bằng số liệu đo được thật, không phải minh hoạ."

**Chuyển ý:** "Từ đây dẫn tới câu hỏi cốt lõi của cả phần hai: có công thức nào chọn được std MỘT CÁCH CÓ CĂN CỨ, thay vì đoán mò? Đây chính là đóng góp của Xavier và He."

---

### Slide 14 — Xavier / Glorot Initialization

**Nói:**

> "Xavier Initialization, còn gọi là Glorot Initialization theo tên tác giả, đề xuất công thức Normal — tức phân phối chuẩn — như sau:
>
> W_ij (đọc: W dưới i j, tức phần tử hàng i cột j của ma trận weight) tuân theo phân phối N, với trung bình bằng 0, và phương sai bằng 2 chia cho, trong ngoặc, fan_in cộng fan_out.
>
> Trong đó fan_in và fan_out — giữ nguyên thuật ngữ tiếng Anh, đọc là 'fan in' và 'fan out' — lần lượt là số neuron đầu vào và số neuron đầu ra của lớp đang xét.
>
> Mục tiêu của công thức này là: CHỌN độ lớn — scale — của weight sao cho XẤP XỈ giữ được variance của tín hiệu ỔN ĐỊNH qua từng lớp, DƯỚI CÁC GIẢ ĐỊNH ĐƠN GIẢN HOÁ nhất định — cụ thể là giả định activation gần tuyến tính quanh điểm 0, và các trọng số độc lập với nhau về mặt thống kê. Em xin nhấn mạnh cụm từ 'xấp xỉ' và 'dưới giả định' — đây KHÔNG phải một cam kết toán học tuyệt đối rằng variance sẽ ổn định trong MỌI kiến trúc hay MỌI activation thực tế, mà chỉ là một phân tích tại THỜI ĐIỂM khởi tạo.
>
> Cụ thể hơn, Xavier cố gắng cân bằng ĐỒNG THỜI hai điều kiện: giữ Var(z) — phương sai của pre-activation — ổn định khi đi FORWARD, và giữ Var(gradient) — phương sai của gradient — ổn định khi đi BACKWARD. Vì hai điều kiện này về mặt toán học chỉ trùng khớp hoàn toàn khi fan_in bằng fan_out, công thức 2 trên (fan_in cộng fan_out) chính là điểm DUNG HOÀ giữa hai điều kiện đó.
>
> Về activation phù hợp: Xavier thường được dùng với Tanh, hoặc các activation có hệ số gain phù hợp với giả định tuyến tính. Tanh có thêm một lợi thế là ZERO-CENTERED — tức đầu ra của nó phân bố đối xứng quanh 0. Đây là điểm em xin nói CHÍNH XÁC vì rất hay bị phát biểu nhầm: **Sigmoid THÌ KHÔNG zero-centered** — đầu ra của Sigmoid luôn dương, nằm trong khoảng (0, 1), có kỳ vọng xấp xỉ 0.5 chứ không phải 0. Vì vậy không nên nói 'cả Tanh và Sigmoid đều zero-centered'.
>
> Về số liệu thực nghiệm: em cố tình KHÔNG đưa con số test accuracy lên slide lý thuyết này. Lý do: trong quá trình thực nghiệm, em từng có tới BA bộ số liệu accuracy khác nhau cho Xavier ở ba nơi khác nhau trong bài — từ lưới thực nghiệm chính 6-layer, từ thí nghiệm 1-seed trên kiến trúc 10-layer, và từ thí nghiệm 5-seed trên cùng kiến trúc đó — nếu đưa lên đây sẽ dễ gây nhầm lẫn giữa các con số. Toàn bộ số liệu thực nghiệm được dồn về đúng MỘT nơi duy nhất: phần Demo, bắt đầu từ Slide 18."

**Chuyển ý:** "Xavier phù hợp với Tanh. Còn với ReLU — activation phổ biến nhất hiện nay — công thức cần điều chỉnh như thế nào?"

---

### Slide 15 — He / Kaiming Initialization

**Nói:**

> "He Initialization, còn gọi là Kaiming Initialization theo tên tác giả Kaiming He, được thiết kế riêng cho ReLU. Công thức Normal:
>
> W_ij tuân theo phân phối N, trung bình 0, phương sai bằng 2 chia fan_in.
>
> So với Xavier, công thức này GẤP ĐÔI hệ số so với phiên bản forward-preserving thuần tuý — tức 1 chia fan_in.
>
> Lý do của hệ số gấp đôi này: dưới giả định pre-activation gần đối xứng quanh 0, hàm ReLU — vốn có công thức ReLU(z) bằng max của 0 và z — sẽ đặt KHOẢNG một nửa giá trị về 0, cụ thể là toàn bộ phần z âm. Điều này làm SUY GIẢM second moment — ký hiệu E[a²] (đọc: E của a bình phương, tức kỳ vọng của bình phương activation) — so với trước khi qua ReLU. He dùng hệ số 2 chia fan_in để BÙ lại sự suy giảm đó, dưới các giả định đơn giản hoá này.
>
> Em xin nhấn mạnh một điểm chính xác về mặt thống kê: ReLU có đầu ra LUÔN không âm, nên kỳ vọng của nó KHÁC 0 — tức KHÔNG zero-centered. Vì vậy, về mặt kỹ thuật, đại lượng mà He initialization thực sự đang kiểm soát gần đúng hơn là 'second moment', tức E[a²], chứ không hoàn toàn là 'variance' theo đúng định nghĩa Var(a) bằng E[a²] trừ E[a] bình phương. Ở mức trình bày của bài này, em vẫn dùng cách nói 'giữ scale của activation ổn định' cho dễ hiểu — nhưng nếu được hỏi sâu hơn về mặt thống kê, đây là điểm cần phân biệt.
>
> Một điểm quan trọng khác về công thức: với biến thể Leaky ReLU — tức ReLU có một độ dốc nhỏ khác 0 ở phần âm, gọi là negative slope, ký hiệu a — hệ số gain của He KHÔNG PHẢI cố định bằng 2/fan_in nữa, mà phụ thuộc vào giá trị a đó. Công thức 2/fan_in mà em trình bày ở đây chỉ là TRƯỜNG HỢP RIÊNG khi a bằng 0, tức đúng ReLU thường — KHÔNG áp dụng chính xác cho mọi biến thể Leaky ReLU.
>
> Tương tự slide Xavier, em cũng KHÔNG đưa test accuracy vào slide lý thuyết này — toàn bộ số liệu thực nghiệm, bao gồm cả so sánh trực tiếp Xavier với He qua nhiều seed, sẽ được trình bày đầy đủ ở Slide Experiment 4 và 5 trong phần Demo."

**Chuyển ý:** "Trước khi chuyển sang phần thực nghiệm, em xin tổng hợp lại toàn bộ các phương pháp khởi tạo đã trình bày trong một bảng so sánh, rồi chốt lại bằng một câu hỏi tổng hợp: rốt cuộc, Xavier và He đang cố GIỮ đại lượng nào?"

---

### Slide 16 — Comparison Table

**Nói:**

> "Bảng này tổng hợp lại 5 phương pháp khởi tạo đã và sẽ được nhắc tới, theo 4 cột: Initialization — tên phương pháp; Formula — công thức; Typical activation — activation thường đi kèm; và Ghi chú.
>
> Zero: công thức W bằng 0, không dùng cho hidden weight vì lý do symmetry đã trình bày.
> Small Random: phân phối N, trung bình 0, phương sai 0.01 bình phương — đây là một baseline ngây thơ (naive baseline), KHÔNG scale theo fan_in hay fan_out.
> Xavier/Glorot: 2 chia (fan_in cộng fan_out), phù hợp với Tanh.
> He/Kaiming: 2 chia fan_in, phù hợp với ReLU.
> Và cuối cùng, Orthogonal — trực giao — với công thức lý thuyết là ma trận SEMI-orthogonal, tức bán trực giao: với ma trận weight hình chữ nhật — không vuông — tính trực giao chỉ áp dụng được cho hàng HOẶC cột tuỳ theo hình dạng ma trận, viết là WᵀW bằng I (đọc: W chuyển vị nhân W bằng ma trận đơn vị I) hoặc WWᵀ bằng I tuỳ trường hợp.
>
> Em xin nói rõ: Orthogonal KHÔNG nằm trong lưới thực nghiệm của project này — chỉ Zero, Random, LeCun, Xavier, và He mới thực sự được chạy và đo. Em liệt kê Orthogonal ở đây chỉ để bức tranh lý thuyết được đầy đủ, chứ hoàn toàn không có số liệu thực nghiệm nào đi kèm cho phương pháp này. Đây là bảng quan trọng vì mọi thí nghiệm tiếp theo trong phần Demo đều nhằm mục đích KIỂM CHỨNG lại đúng những gì bảng này nói, bằng số liệu thật."

**Chuyển ý:** "Nhìn vào Xavier và He, có thể thấy công thức khác nhau — nhưng liệu chúng có đang cố gắng đạt được CÙNG một mục tiêu chung không?"

---

### Slide 17 — What are Xavier/He trying to preserve? (Synthesis)

**Nói:**

> "Đây là slide tổng hợp, đóng vai trò cầu nối trước khi bước sang phần thực nghiệm. Dù công thức khác nhau, Xavier và He đều đang cố gắng giữ HAI đại lượng, ở hai chiều khác nhau của mạng:
>
> Ở chiều Forward: Var(a⁽ˡ⁾) (đọc: Var của a mũ (l), tức phương sai của activation ở lớp thứ l) XẤP XỈ ổn định qua các layer — không co cụm về 0, cũng không bùng nổ khi tín hiệu đi qua nhiều lớp liên tiếp.
>
> Ở chiều Backward: Var(δ⁽ˡ⁾) (đọc: Var của delta mũ (l)) cũng XẤP XỈ ổn định qua các layer, trong đó δ (delta) chính là ∂L/∂z ở lớp đó — tức cùng logic ổn định variance, áp dụng cho gradient khi lan truyền ngược thay vì cho activation khi lan truyền tiến.
>
> Gói gọn lại thành một câu tổng kết, nguyên văn tiếng Anh mà em muốn khán giả nhớ: 'Good initialization attempts to prevent the scale of signals and gradients from systematically collapsing or exploding as depth increases' — tạm dịch: khởi tạo tốt cố gắng ngăn scale của tín hiệu và gradient khỏi việc sụp đổ hoặc bùng nổ một cách có hệ thống khi độ sâu tăng lên.
>
> Về sự khác biệt giữa Xavier và He, em xin phát biểu CHÍNH XÁC, tránh đơn giản hoá quá mức: Xavier suy ra một điểm DUNG HOÀ liên quan tới CẢ fan_in và fan_out, cố gắng cân bằng đồng thời cả forward lẫn backward; trong khi He/Kaiming ĐIỀU CHỈNH scale variance riêng cho đặc thù của rectifier nonlinearity — tức các hàm kích hoạt kiểu ReLU. Phép điều chỉnh của He tuy XUẤT PHÁT từ phân tích phía forward — cụ thể là việc ReLU cắt bỏ khoảng một nửa giá trị — nhưng CÙNG một hệ số scale đó cũng ảnh hưởng tới tín hiệu phía backward. Vì vậy, KHÔNG NÊN nói đơn giản rằng 'He chỉ quan tâm tới forward' — đó là một cách rút gọn quá mức.
>
> Cuối cùng, một lưu ý cần nhắc lại: cả hai đại lượng Var(a) và Var(δ) ở đây đều được phân tích TẠI THỜI ĐIỂM khởi tạo — đây là một initialization-time analysis, không phải một cam kết rằng variance sẽ giữ ổn định trong SUỐT quá trình huấn luyện, khi tham số đã bắt đầu thay đổi."

**Chuyển ý:** "Đến đây là toàn bộ phần lý thuyết. Phần còn lại — cũng là phần em đầu tư nhiều công sức nhất — là một thực nghiệm có kiểm soát, được thiết kế để kiểm chứng TRỰC TIẾP mọi điều vừa trình bày bằng số liệu đo được thật."

---

## ACT 3 — Experiment (Slide 18–27)

### Slide 18 — Thiết kế thực nghiệm

**Nói:**

> "Em xin đóng khung toàn bộ phần này như một MINI RESEARCH EXPERIMENT — một thực nghiệm nghiên cứu thu nhỏ — chứ không đơn thuần là 'train một mô hình rồi báo cáo accuracy'.
>
> Câu hỏi thực nghiệm cụ thể, nguyên văn tiếng Anh trên slide: 'How does weight initialization affect gradient flow and convergence?' — tạm dịch: cách khởi tạo weight ảnh hưởng thế nào tới dòng chảy gradient và khả năng hội tụ?
>
> Kiến trúc mạng: 784 tiến tới, trong ngoặc, Linear 128 tiến tới ReLU, đóng ngoặc, lặp lại 10 lần, tiến tới 10 — nói cách khác là một mạng fully-connected với 10 lớp ẩn, mỗi lớp 128 neuron, activation ReLU, đầu vào 784 chiều (tương ứng ảnh 28 nhân 28 pixel được làm phẳng), đầu ra 10 lớp phân loại. Em CỐ TÌNH chọn kiến trúc khá sâu — 10 hidden layer — để các vấn đề về gradient thể hiện RÕ RÀNG hơn so với một mạng nông chỉ vài lớp. Bias ở MỌI lớp được khởi tạo bằng 0 trong TẤT CẢ các cấu hình thực nghiệm, không đổi theo scheme khởi tạo weight.
>
> Dataset: một tập con của Fashion-MNIST, gồm 5.000 mẫu train, 1.000 mẫu validation, và 2.000 mẫu test. Dữ liệu pixel được CHUẨN HOÁ — normalize — bằng mean và độ lệch chuẩn tính TRỰC TIẾP từ chính tập train, KHÔNG dùng dữ liệu thô trong khoảng [0,1]. Ảnh được làm phẳng từ 28 nhân 28 thành vector 784 chiều.
>
> Optimizer: SGD thuần — Stochastic Gradient Descent — với learning rate bằng 0.05, batch size bằng 128, huấn luyện trong 15 epoch. Hàm Loss dùng CrossEntropyLoss của PyTorch — bên trong hàm này đã GỘP SẴN LogSoftmax và NLLLoss, nên KHÔNG cần áp dụng Softmax tường minh trước khi đưa vào hàm Loss.
>
> Về thiết kế thực nghiệm có kiểm soát: trong MỖI phép so sánh 1-seed, yếu tố thực nghiệm — experimental factor — DUY NHẤT thay đổi là cách khởi tạo weight, cụ thể là 5 lựa chọn: Zero, Random nhỏ, Random lớn, Xavier, và He. TẤT CẢ các thiết lập khác — kiến trúc, optimizer, learning rate, batch size, số epoch, cách khởi tạo bias, hàm Loss, cách tiền xử lý dữ liệu, và seed — đều được GIỮ CỐ ĐỊNH, để cô lập đúng MỘT biến duy nhất đang khảo sát.
>
> Về seed: dùng CÙNG một seed giúp tăng khả năng tái lập kết quả — reproducibility — và giảm bớt MỘT nguồn ngẫu nhiên khi so sánh giữa các cấu hình trong thí nghiệm 1-seed. Nhưng đây KHÔNG PHẢI là sự thay thế cho việc lặp lại thí nghiệm với nhiều seed khác nhau — ở phần sau, cụ thể là thí nghiệm so sánh Xavier và He, em sẽ CHỦ ĐỘNG thay đổi seed để có bằng chứng đáng tin cậy hơn."

**Chuyển ý:** "Với thiết kế thực nghiệm như vậy, ta cần đo những đại lượng gì để đánh giá kết quả một cách khoa học, thay vì chỉ nhìn vào accuracy cuối cùng?"

---

### Slide 19 — 4 nhóm metric được log

**Nói:**

> "Em log lại 4 nhóm metric cho MỖI cấu hình thực nghiệm, theo đúng thứ tự ưu tiên khi đọc và diễn giải kết quả — thứ tự này quan trọng, vì nó đi từ bằng chứng TRỰC TIẾP nhất tới bằng chứng GIÁN TIẾP nhất.
>
> Trước khi trình bày 4 nhóm, em xin thống nhất một quy ước thuật ngữ dùng xuyên suốt phần còn lại của bài: khi em nói 'Layer 1', ý em là hidden Linear layer ĐẦU TIÊN — tức lớp fully-connected ẩn gần input nhất — KHÔNG tính input layer hay output layer.
>
> Nhóm metric thứ nhất: Activation Variance theo layer — tức Var(A⁽ˡ⁾) (Var của A mũ (l)), đo TẠI bước khởi tạo, cụ thể là trên batch dữ liệu ĐẦU TIÊN. Đây là tín hiệu SỚM NHẤT cho thấy hiện tượng co cụm hay bão hoà, nên em ưu tiên đọc metric này ĐẦU TIÊN khi phân tích một cấu hình.
>
> Nhóm thứ hai: Gradient RMS theo layer. Công thức chính xác: RMS của ∂L/∂W⁽ˡ⁾ (del L trên del W mũ (l)) bằng grad.pow(2).mean().sqrt() trong code PyTorch — nói bằng lời: lấy bình phương từng phần tử gradient, tính trung bình, rồi lấy căn bậc hai. Đại lượng này ĐƯỢC ĐO tại khởi tạo, trên batch đầu tiên, TRƯỚC khi có bất kỳ bước cập nhật tham số nào xảy ra. Lý do dùng RMS thay vì norm thô — tức chỉ tính căn tổng bình phương mà không chia cho số phần tử: RMS đã được CHUẨN HOÁ theo số lượng phần tử của ma trận weight, nên cho phép so sánh CÔNG BẰNG giữa các layer có kích thước khác nhau — ví dụ Layer 1 có khoảng 100 nghìn phần tử weight trong khi các layer sau chỉ khoảng 16 nghìn phần tử; nếu dùng norm thô, Layer 1 sẽ luôn có vẻ 'lớn hơn' chỉ vì nó có nhiều phần tử hơn, chứ không phản ánh đúng độ lớn TRUNG BÌNH của mỗi trọng số.
>
> Nhóm thứ ba: Training Loss và Accuracy, đo mỗi epoch, cho cả tập train và tập validation, để theo dõi quá trình hội tụ theo thời gian. Tập test CHỈ được dùng để đánh giá cuối cùng, không dùng trong quá trình theo dõi và điều chỉnh.
>
> Nhóm thứ tư: Weight Variance theo layer, dùng để đối chiếu Var(W) đo được thực tế sau khi khởi tạo so với công thức lý thuyết đã trình bày ở các slide Xavier và He.
>
> Điểm quan trọng em muốn nhấn mạnh: việc log đủ 4 nhóm — thay vì chỉ nhìn accuracy — cho phép ta PHÂN BIỆT được NGUYÊN NHÂN thất bại, ví dụ phân biệt vanishing gradient, exploding gradient, và overfitting — thay vì chỉ kết luận chung chung 'mô hình học kém'."

**Chuyển ý:** "Với đầy đủ công cụ đo lường, giờ ta bắt đầu với thí nghiệm đầu tiên: điều gì THỰC SỰ xảy ra khi khởi tạo bằng Zero, so với khởi tạo Random với độ lệch chuẩn rất nhỏ?"

---

### Slide 20 — Experiment 1 & 2: Zero vs. Random nhỏ — HAI cơ chế khác nhau

**Nói:**

> "Experiment 1 chạy với `nn.init.zeros_(layer.weight)` — khởi tạo mọi weight bằng 0. Experiment 2 chạy với `nn.init.normal_(layer.weight, std=0.01)` — khởi tạo ngẫu nhiên với độ lệch chuẩn rất nhỏ, bằng 0.01.
>
> Kết quả đo được, trên đúng kiến trúc 10-hidden-layer, ReLU, 15 epoch: Zero cho gradient RMS lớp 1, tại khởi tạo, bằng ĐÚNG 0.0. Random nhỏ cho gradient RMS xấp xỉ 1.13 nhân 10 mũ trừ 13 (đọc: một chấm mười ba nhân mười luỹ thừa âm mười ba) — về mặt số học khác 0, nhưng nhỏ tới mức hoàn toàn vô dụng cho việc học. Cả hai đều kẹt đúng ở mức 10.0% test accuracy — đúng bằng mức đoán ngẫu nhiên của bài toán 10 lớp.
>
> Đây là điểm quan trọng nhất của slide này, và cũng là điểm em xin nhấn mạnh KỸ nhất trong toàn bài: mặc dù hai cấu hình cho ra KẾT QUẢ CUỐI giống hệt nhau về mặt con số, NGUYÊN NHÂN đằng sau lại HOÀN TOÀN KHÁC NHAU. Zero-init thất bại vì các hidden unit KHÔNG PHÁ ĐƯỢC symmetry — chúng khởi đầu giống hệt nhau và tiếp tục nhận gradient, nhận update giống hệt nhau trong suốt quá trình huấn luyện, dẫn tới gradient của lớp ẩn bằng đúng 0 trong kiến trúc cụ thể này. Random nhỏ thất bại vì một cơ chế HOÀN TOÀN KHÁC — vanishing gradient THẬT SỰ — do scale của tín hiệu bị co lại LẶP ĐI LẶP LẠI qua từng lớp trong số 10 lớp của mạng.
>
> Em xin nhắc lại một lần nữa, vì đây là lỗi phát biểu dễ mắc phải nhất: KHÔNG BAO GIỜ được nói 'Zero thất bại VÌ symmetry breaking' — đó là nói NGƯỢC nghĩa hoàn toàn. Phát biểu ĐÚNG là: Zero thất bại vì KHÔNG phá được symmetry — failure to break symmetry."

**Chuyển ý:** "Đó là trường hợp std quá nhỏ. Vậy trường hợp ngược lại — std quá lớn — sẽ cho kết quả như thế nào? Đây chính là slide 'kịch tính' nhất của toàn bộ phần thực nghiệm."

---

### Slide 21 — Experiment 3: Random LỚN — Exploding Gradient thật sự

**Nói:**

> "Experiment 3 chạy với `nn.init.normal_(layer.weight, mean=0, std=1.0)` — cùng phân phối chuẩn, nhưng độ lệch chuẩn bằng 1.0, lớn hơn Experiment 2 gấp 100 lần.
>
> Kết quả: NGAY TRƯỚC bước cập nhật tham số ĐẦU TIÊN — tức đo trên batch đầu tiên, khi weight vẫn còn nguyên giá trị khởi tạo — gradient RMS của lớp 1 đã bùng nổ tới 1.87 nhân 10 mũ 7 (đọc: một chấm tám bảy nhân mười luỹ thừa bảy) — một con số khổng lồ so với các trường hợp trước. Train loss trung bình của CẢ epoch 1 đã là NaN, và KHÔNG hề phục hồi trong suốt 15 epoch còn lại của quá trình huấn luyện.
>
> Ở đây em xin làm rõ hai điểm về mặt độ chính xác khoa học, tránh diễn đạt quá tay:
>
> Điểm thứ nhất: con số gradient RMS 1.87 nhân 10 mũ 7 được đo CHÍNH XÁC trên batch đầu tiên, TRƯỚC bất kỳ update nào — đây là bằng chứng trực tiếp và đáng tin cậy nhất. Ngược lại, giá trị 'train loss bằng NaN' mà em báo cáo là giá trị TRUNG BÌNH của CẢ epoch 1, gồm nhiều batch — log hiện tại của em KHÔNG tách được chính xác NaN xuất hiện từ batch thứ mấy trong epoch đó. Vì vậy, cách nói chính xác là 'NaN xuất hiện TRONG epoch 1', chứ em sẽ tránh khẳng định tuyệt đối 'NaN xuất hiện NGAY TỪ batch đầu tiên' khi chưa có bằng chứng ở mức độ chi tiết đó.
>
> Điểm thứ hai, cũng quan trọng không kém: NaN là một TRIỆU CHỨNG (symptom) của tình trạng mất ổn định số học — numerical instability — xảy ra ở một bước SAU đó, chứ bản thân NaN KHÔNG PHẢI là ĐỊNH NGHĨA của exploding gradient. Bằng chứng TRỰC TIẾP và đáng tin cậy nhất cho hiện tượng exploding vẫn là con số gradient RMS đo được, chứ không phải chính NaN.
>
> Nhìn rộng ra, đây chính là bằng chứng thực nghiệm trực tiếp cho hiện tượng đã trình bày ở slide lý thuyết Exploding Gradient — không phải minh hoạ, mà là số liệu THẬT xảy ra khi em chạy thí nghiệm này. Và nó đối lập hoàn toàn, rất rõ ràng, với Experiment 1 và 2: trong thiết lập cụ thể của em, CẢ HAI thái cực — std quá nhỏ và std quá lớn — của CÙNG một sai lầm là 'không scale weight theo fan_in' đều khiến mạng hoàn toàn không học được gì."

**Chuyển ý:** "Ba thí nghiệm đầu đều là những trường hợp THẤT BẠI. Bây giờ ta chuyển sang hai phương pháp ĐƯỢC THIẾT KẾ để tránh cả hai thái cực đó: Xavier và He."

---

### Slide 22 — Experiment 4 & 5: Xavier vs. He — 5 seed thô

**Nói:**

> "Experiment 4 dùng `nn.init.xavier_normal_(layer.weight)`, Experiment 5 dùng `nn.init.kaiming_normal_(layer.weight, mode='fan_in', nonlinearity='relu')`.
>
> Đây là phần em đặc biệt CẨN TRỌNG về phương pháp luận khoa học, vì đây chính là chỗ rất dễ đưa ra kết luận vội vàng. Nếu chỉ chạy 1 lần với 1 seed, kết quả là Xavier đạt 68.2% và He đạt 67.35% — nhìn qua có vẻ Xavier nhỉnh hơn. Nhưng 1 seed duy nhất KHÔNG đủ cơ sở khoa học để kết luận điều gì cả — vì chênh lệch đó hoàn toàn có thể chỉ là nhiễu ngẫu nhiên từ một lần chạy.
>
> Vì vậy, em chạy LẠI cả hai scheme, mỗi scheme lặp lại ĐỘC LẬP với 5 seed khác nhau — cụ thể là seed 42, 43, 44, 45, và 46 — rồi báo cáo kết quả dưới dạng mean cộng trừ độ lệch chuẩn, tức mean ± std (đọc: trung bình cộng trừ một std). Slide này còn in ra NGUYÊN VĂN cả 5 giá trị accuracy của từng seed, để đảm bảo tính minh bạch tuyệt đối, không chỉ dựa vào con số tổng hợp.
>
> Kết quả: Xavier đạt 69.1% cộng trừ 4.7 pp — pp là viết tắt của percentage points, đọc là 'điểm phần trăm', đơn vị dùng để đo CHÊNH LỆCH giữa hai tỉ lệ phần trăm, để tránh nhầm với '4.7 phần trăm CỦA 69.1%'. He đạt 70.5% cộng trừ 5.7 pp.
>
> Về mặt diễn giải khoa học, em xin phát biểu THẬT CẨN THẬN ở đây: khoảng mean cộng trừ 1 độ lệch chuẩn của Xavier và của He CHỒNG LẤN nhau đáng kể — nói cách khác, biến thiên giữa các lần chạy (run-to-run variability) LỚN so với chênh lệch giữa hai giá trị trung bình. Vì vậy, thực nghiệm này KHÔNG đủ cơ sở để xếp hạng scheme nào tốt hơn cho ReLU trong thiết lập này. Em xin lưu ý về mặt thuật ngữ: đây KHÔNG PHẢI một kiểm định thống kê chính thức — em không chạy hypothesis test hay tính confidence interval — nên em cũng sẽ KHÔNG dùng cụm từ 'không có ý nghĩa thống kê' (statistically insignificant), vì cụm đó ngụ ý đã có một phép kiểm định chính thức phía sau. Và vì em chỉ show mean cộng trừ std của 5 điểm dữ liệu, CHƯA show toàn bộ phân phối xác suất, nên em cũng tránh nói 'hai distribution chồng lấn' — cách nói chính xác hơn là 'khoảng mean cộng trừ 1 std chồng lấn đáng kể'.
>
> Ngược lại, ở khía cạnh gradient RMS lớp 1: He cho trung bình 1.5 nhân 10 mũ trừ 2, so với Xavier chỉ 4.2 nhân 10 mũ trừ 4 — chênh lệch khoảng 35 lần, và quan trọng là chênh lệch này NHẤT QUÁN, CÙNG CHIỀU ở CẢ 5 seed, không hề dao động qua lại. Đây là một khác biệt rõ ràng và đáng tin cậy hơn nhiều so với chênh lệch accuracy. Nhưng — và đây là điểm em muốn nhấn thật kỹ để tránh một kết luận sai lầm phổ biến — gradient RMS LỚN HƠN KHÔNG TỰ ĐỘNG nghĩa là optimization TỐT HƠN. Điều thực sự quan trọng là TRÁNH được hiện tượng collapse hoặc explosion mang tính bệnh lý, chứ không phải nguyên tắc 'gradient càng lớn càng tốt'."

**Chuyển ý:** "Sau 5 thí nghiệm riêng lẻ, hãy nhìn lại BỨC TRANH TỔNG THỂ bằng một biểu đồ duy nhất."

---

### Slide 23 — Biểu đồ tổng hợp 5 thí nghiệm

**Nói:**

> "Biểu đồ này gộp cả 5 đường cong Validation Accuracy theo Epoch của 5 thí nghiệm vừa trình bày vào MỘT hình duy nhất, cùng trên MỘT kiến trúc, cùng MỘT optimizer, chỉ khác cách khởi tạo.
>
> Có thể thấy ngay bằng mắt thường: Zero và Random nhỏ là hai đường THẲNG NGANG, nằm sát mức 10% — không hề học được gì trong suốt 15 epoch. Random lớn hoàn toàn KHÔNG xuất hiện trên biểu đồ, vì giá trị loss là NaN ngay từ epoch 1, không có dữ liệu số học hợp lệ nào để vẽ. Ngược lại, Xavier và He đều hội tụ RÕ RÀNG, đạt khoảng 67 đến 68 phần trăm, dù kiến trúc đã sâu tới 10 lớp — chứng minh trực quan rằng chỉ CÙNG một kiến trúc, cùng optimizer, cùng dataset, nhưng thay đổi DUY NHẤT cách khởi tạo, kết quả có thể lệch từ 'hoàn toàn không học được' sang 'học tốt', hoặc ngược lại."

**Chuyển ý:** "Biểu đồ accuracy cho ta bằng chứng GIÁN TIẾP. Bây giờ, hãy nhìn thẳng vào bằng chứng TRỰC TIẾP nhất — chính bản thân gradient — qua một visualization mà em coi là quan trọng nhất của toàn bộ phần Demo."

---

### Slide 24 — Gradient RMS Heatmap

**Nói:**

> "Đây là visualization mà em coi là QUAN TRỌNG NHẤT trong toàn bộ phần thực nghiệm, vì nó thể hiện TRỰC TIẾP gradient flow — dòng chảy gradient — qua từng layer, không thông qua bất kỳ đại lượng trung gian nào. Khác với accuracy, vốn là bằng chứng GIÁN TIẾP, chịu ảnh hưởng bởi rất nhiều yếu tố khác ngoài initialization — như random seed của việc chia batch, hay chính quá trình optimization.
>
> Em xin nhấn mạnh ngay từ đầu, đúng như dòng chữ đỏ trên slide: toàn bộ heatmap này được đo TẠI KHỞI TẠO — trên batch đầu tiên, TRƯỚC bất kỳ update tham số nào — chứ KHÔNG PHẢI một giá trị trung bình trong suốt quá trình huấn luyện. Đây là điểm rất dễ bị hiểu nhầm nếu không nói rõ.
>
> Trục dọc là 5 scheme khởi tạo, trục ngang là 11 layer — 10 hidden layer cộng 1 output layer — màu sắc thể hiện log₁₀ (đọc: log cơ số 10) của gradient RMS. Nhìn vào bảng số: hàng Zero toàn giá trị âm 20 — đây là quy ước em đặt để biểu diễn 'giá trị đúng bằng 0' trên thang log, vì log của 0 không xác định. Hàng Random nhỏ dao động quanh âm 12 tới âm 13. Hàng Random lớn dao động quanh dương 7 tới dương 9. Còn Xavier và He nằm ở vùng giữa, khoảng âm 1 tới âm 3.4 — MÀU sắc ở vùng này thể hiện gradient ở mức trung bình, và trong thực nghiệm cụ thể này, quan sát thấy ổn định hơn hẳn so với hai thái cực.
>
> Em xin lưu ý thêm một điểm phương pháp luận: vì tất cả các cấu hình trong slide này đều dùng CÙNG seed bằng 42 — bao gồm cả generator của DataLoader — nên CÙNG một batch đầu tiên được dùng cho MỌI scheme khi đo gradient RMS. Điều này loại bỏ được một nguồn nhiễu tiềm ẩn — cụ thể là sự khác biệt do việc lấy mẫu batch ngẫu nhiên — khi so sánh giữa các scheme với nhau.
>
> Cuối cùng, một lưu ý về màu sắc: ba vùng màu xanh dương, vàng cam, và đỏ chỉ là một MÔ TẢ TRỰC QUAN theo thang màu LIÊN TỤC, KHÔNG PHẢI một ngưỡng — threshold — toán học được định nghĩa chính thức để phân định đâu là 'vùng ổn định'."

**Chuyển ý:** "Heatmap vừa rồi cho bằng chứng ở chiều BACKWARD — tức gradient. Nhưng slide Synthesis trước đó có nói tới CẢ hai chiều — forward VÀ backward. Vậy bằng chứng ở chiều FORWARD nằm ở đâu?"

---

### Slide 25 — Activation Variance theo layer

**Nói:**

> "Slide này bổ sung bằng chứng ở chiều FORWARD, để hoàn thiện bức tranh đã nêu ở slide Synthesis. Biểu đồ thể hiện Var(a) — phương sai của activation — theo layer, đo tại khởi tạo, cho 4 trong số 5 scheme. Em KHÔNG vẽ Zero-init ở đây, vì mọi activation của nó đều đúng bằng 0 — không thể biểu diễn trên thang log, do log của 0 không xác định.
>
> Kết quả, và đây là chỗ em đã kiểm tra lại số liệu THẬT CẨN THẬN trước khi phát biểu, để tránh nói quá tay: Random nhỏ — Var(a) co lại dần đều qua từng layer, đúng câu chuyện vanishing đã thấy ở gradient, nhưng lần này quan sát được ở phía FORWARD PASS. Random lớn — Var(a) tăng theo cấp số mũ, tăng tới hàng chục bậc độ lớn chỉ sau 10 layer.
>
> Về He và Xavier — đây là điểm em xin nói CHÍNH XÁC, vì bản nháp trước của em từng mắc lỗi khái quát hoá quá mức: He thực sự gần như PHẲNG — từ layer 1 tới layer 10, giá trị chỉ đổi khoảng 0.8 lần, gần như không đáng kể. Nhưng Xavier thì KHÔNG phẳng — nó VẪN suy giảm thật, khoảng 395 lần từ layer 1 tới layer 10. Chỉ là mức suy giảm đó nằm trong một khoảng HẸP HƠN RẤT NHIỀU so với Random nhỏ, vốn suy giảm tới khoảng 10 mũ 19 lần. Vì vậy, em xin tránh dùng cụm từ 'Xavier và He đều phẳng' — cách nói chính xác hơn là: cả hai đều nằm trong một khoảng hẹp hơn nhiều so với random không scale, nhưng chỉ riêng He mới thực sự gần phẳng theo đúng nghĩa đen."

**Chuyển ý:** "Vậy hai visualization vừa rồi — heatmap gradient và biểu đồ activation variance — đều dừng lại ở kiến trúc 10 layer cố định. Câu hỏi tự nhiên tiếp theo: điều gì xảy ra khi ta tiếp tục TĂNG độ sâu mạng lên xa hơn nữa?"

---

### Slide 26 — Depth Experiment

**Nói:**

> "Thí nghiệm mở rộng này so sánh Random, Xavier, và He tại NHIỀU độ sâu khác nhau — từ 2 tới 50 hidden layer.
>
> Kết quả, luôn đi kèm với định ngữ 'trong thiết lập thực nghiệm này' — em xin nhấn mạnh cụm này vì đây chính xác là bài học về scientific wording mà em đã áp dụng xuyên suốt: Random naive — gradient RMS về xấp xỉ 0 từ độ sâu 20 trở lên. Xavier — suy giảm dần đều, cho gradient RMS rất nhỏ tại độ sâu 50, khoảng 3 nhân 10 mũ trừ 10. He — duy trì gradient RMS ở CÙNG bậc độ lớn, khoảng 10 mũ trừ 2, cho tới tận độ sâu 50, trong kiến trúc và thiết lập huấn luyện đang xét. Em xin tránh nói tuyệt đối kiểu 'He hoạt động ở MỌI độ sâu' — đây chỉ là quan sát TRONG phạm vi thực nghiệm cụ thể này.
>
> Và đây chính là insight quan trọng nhất của toàn bộ bài thuyết trình: gradient ổn định KHÔNG đồng nghĩa với việc học TỐT. Cụ thể, tại độ sâu 12 với He initialization: train loss chỉ 0.456 — tức mô hình khớp RẤT TỐT trên tập train — nhưng test loss lại vọt lên 5.41, và test accuracy chỉ còn 32.6%. Khoảng cách LỚN giữa train và test như vậy chính là BẰNG CHỨNG CỤ THỂ cho hiện tượng overfitting — tức mô hình học thuộc lòng tập train thay vì học ra quy luật tổng quát — chứ KHÔNG PHẢI một suy đoán chỉ dựa trên con số accuracy thấp đơn lẻ. Nếu chỉ nhìn test accuracy thấp mà KHÔNG so sánh với train loss, ta sẽ không đủ căn cứ để phân biệt đây là overfitting hay là một vấn đề gradient nào đó — chính vì có cả hai con số, train loss THẤP và test loss CAO, ta mới có thể tự tin gọi tên đúng hiện tượng.
>
> Nói tóm lại: stable gradient flow — dòng chảy gradient ổn định — là một ĐIỀU KIỆN QUAN TRỌNG cho việc optimization diễn ra ổn định, nhưng KHÔNG PHẢI là điều kiện ĐỦ để mô hình generalize — khái quát hoá — tốt trên dữ liệu chưa từng thấy."

**Chuyển ý:** "Trước khi kết thúc phần thực nghiệm, em xin tổng hợp lại toàn bộ 5 thí nghiệm chính trong một bảng số liệu duy nhất."

---

### Slide 27 — Bảng tổng hợp kết quả

**Nói:**

> "Bảng này tổng hợp cả 5 thí nghiệm, với thứ tự đọc cột được ghi rõ ngay phía trên bảng: Gradient RMS trước, rồi tới Final Train Loss, rồi mới tới Test Accuracy — đúng thứ tự ưu tiên bằng chứng đã trình bày ở slide Metrics.
>
> Em xin lưu ý cách đặt tên cột: cột thứ ba em ghi rõ là 'Final Train Loss' — tức train loss của epoch CUỐI CÙNG, epoch 15 — KHÔNG PHẢI validation loss, cũng KHÔNG PHẢI test loss, để tránh mập mờ về việc con số này đo trên tập dữ liệu nào.
>
> Zero và Random nhỏ: nhãn 'Vanishing'. Random lớn: nhãn 'Exploding (NaN)'. Xavier và He: em dùng nhãn 'Không vanish/explode rõ rệt' — thay vì nhãn 'Ổn định' như một tính chất tuyệt đối. Lý do em chọn cách diễn đạt thận trọng hơn này: nhãn 'Không vanish/explode rõ rệt' CHỈ đúng tại độ sâu 10 layer của bảng này — slide Depth Experiment vừa trình bày trước đó đã cho thấy Xavier suy giảm gradient RÕ RỆT hơn He khi kiến trúc tiếp tục sâu thêm. Nếu dùng nhãn 'Ổn định' cho cả hai một cách bừa bãi, người nghe có thể hiểu nhầm rằng tính chất này đúng ở MỌI độ sâu — điều mà chính thí nghiệm ngay trước đó đã bác bỏ.
>
> Số liệu trong bảng lấy NGUYÊN VĂN từ file CSV kết quả, kể cả dòng NaN của Random lớn — em không làm tròn để bảng 'đẹp' hơn, và không có kết quả nào bị bỏ sót hay che giấu."

**Chuyển ý:** "Trước khi đưa ra kết luận cuối cùng, với tinh thần trung thực khoa học của một mini research presentation, em xin dành một slide riêng để nói rõ những GIỚI HẠN của những gì em đã làm được."

---

## ACT 4 — Conclusion (Slide 28–31)

### Slide 28 — Limitations

**Nói:**

> "Em xin liệt kê 6 giới hạn chính của thực nghiệm này, không né tránh:
>
> Một, về dataset: em chỉ dùng một SUBSET của Fashion-MNIST — 5.000 mẫu train, 1.000 validation, 2.000 test — chứ không phải toàn bộ dataset đầy đủ. Kết luận rút ra chưa chắc mở rộng đúng sang quy mô dữ liệu lớn hơn nhiều.
>
> Hai, về kiến trúc: em chỉ thử nghiệm với MLP kết hợp ReLU — chưa đại diện được cho các kiến trúc khác như CNN, Transformer, hay RNN, vốn mỗi loại có đặc thù riêng về cách gradient lan truyền.
>
> Ba, optimizer và learning rate được giữ CỐ ĐỊNH — SGD, learning rate 0.05 — trong toàn bộ thực nghiệm, để cô lập đúng biến initialization. Điều này có nghĩa là em CHƯA khảo sát sự TƯƠNG TÁC giữa initialization và learning rate hay optimizer — một sự tương tác vốn có thể rất quan trọng trong thực tế.
>
> Bốn, Gradient RMS và Activation Variance đều được đo TẠI KHỞI TẠO, trên đúng MỘT batch, TRƯỚC khi có update nào — không phải giá trị trung bình trong suốt cả quá trình huấn luyện. Hành vi thực tế có thể thay đổi khác đi sau vài epoch.
>
> Năm, thí nghiệm multi-seed mới chỉ chạy với n bằng 5 cho Xavier và He — đủ để thấy được khoảng chồng lấn, nhưng vẫn còn khá ít để ước lượng CHÍNH XÁC mức độ biến thiên. Ba cấu hình còn lại — Zero, Random nhỏ, Random lớn — mới chạy 1 seed duy nhất; kết quả của chúng, cụ thể là 10% hoặc NaN, đủ RÕ RÀNG để không cần thiết phải chạy multi-seed, nhưng vẫn CHƯA được xác nhận lại một cách độc lập.
>
> Sáu, thí nghiệm Depth dùng 8 epoch thay vì 15 epoch như lưới chính, để giữ tổng thời gian chạy ở mức hợp lý — các con số tuyệt đối có thể sẽ khác đi nếu huấn luyện đủ 15 epoch cho mọi độ sâu.
>
> Nói tóm lại: mọi kết luận em đưa ra CHỈ đúng trong đúng phạm vi đã khảo sát — MLP, ReLU, tập con Fashion-MNIST, SGD cố định — và CHƯA CHẮC đúng khi mở rộng ra ngoài phạm vi đó."

**Chuyển ý:** "Với đầy đủ giới hạn đã nêu rõ, em xin tổng kết lại toàn bộ bài trình bày."

---

### Slide 29 — Conclusion

**Nói:**

> "Em xin tổng kết bằng đúng mạch lý luận đã đi qua trong toàn bài: Derivative, tiến tới Chain Rule, tiến tới Backpropagation, tiến tới Gradient Flow, tiến tới Vanishing hoặc Exploding Gradient, tiến tới Parameter Initialization, và cuối cùng dẫn tới Stable Training — huấn luyện ổn định.
>
> Trước khi liệt kê các takeaway cụ thể, em xin trả lời TRỰC TIẾP câu hỏi nghiên cứu đã đặt ra ngay từ Slide 2: Initialization quyết định SCALE khởi đầu của cả activation — ở chiều forward — lẫn gradient — ở chiều backward. Scale bị chọn sai có thể gây ra symmetry failure, vanishing, hoặc exploding; trong khi các scheme dựa trên fan-in và fan-out như Xavier và He cải thiện ĐÁNG KỂ khả năng huấn luyện được trên kiến trúc MLP sâu mà em đã khảo sát trong project này.
>
> Bốn takeaway cụ thể:
>
> Một, Backpropagation là một THUẬT TOÁN tính gradient một cách HIỆU QUẢ, bằng cách áp dụng Chain Rule ngược qua computational graph, TÁI SỬ DỤNG các đạo hàm cục bộ đã tính — đây gọi là reverse-mode automatic differentiation. Cách làm này đặc biệt hiệu quả khi một hàm Loss VÔ HƯỚNG duy nhất phụ thuộc vào một số lượng RẤT LỚN tham số — đúng chính xác bối cảnh của Deep Learning.
>
> Hai, trong mạng sâu, gradient phụ thuộc vào TÍCH của rất nhiều Jacobian và weight transformation nối tiếp nhau — nên SCALE của gradient có thể vanish hoặc explode tuỳ vào hành vi tích luỹ của chuỗi phép nhân đó.
>
> Ba, các scheme khởi tạo như Xavier và He CHỌN scale của initial weight dựa trên fan-in và fan-out, nhằm giữ activation và gradient trong một phạm vi hợp lý — dưới các giả định nhất định, tại thời điểm khởi tạo.
>
> Bốn, và đây là insight quan trọng nhất: good initialization CẢI THIỆN optimization và gradient flow, nhưng KHÔNG ĐẢM BẢO generalization tốt — đây chính xác là điều Depth Experiment vừa chứng minh bằng số liệu thật, không phải suy đoán lý thuyết."

**Chuyển ý:** "Nếu còn thời gian, em xin phép mở rộng ngắn gọn sang các kỹ thuật hiện đại hơn, xây dựng tiếp trên nền tảng của initialization."

---

### Slide 30 — Mở rộng (tham khảo)

**Nói:**

> "Initialization chỉ là BƯỚC KHỞI ĐẦU. Các kiến trúc mạng hiện đại còn kết hợp thêm nhiều kỹ thuật khác để giải quyết triệt để hơn vấn đề gradient flow:
>
> Batch Normalization hoặc Layer Normalization — CHUẨN HOÁ LẠI tín hiệu ở MỖI lớp, trong SUỐT quá trình huấn luyện, thay vì chỉ dựa vào một lần khởi tạo ban đầu duy nhất.
>
> Residual Networks — mạng phần dư — cho gradient một 'đường tắt', gọi là skip connection, để bỏ qua bớt sự tích luỹ qua nhiều lớp liên tiếp.
>
> Và Gradient Clipping — cắt ngưỡng gradient — chặn CỨNG hiện tượng exploding gradient bất kể nguyên nhân gốc rễ là gì.
>
> Em chỉ giới thiệu NGẮN GỌN ở đây, không đi sâu vào từng kỹ thuật, vì đây không phải trọng tâm chính của bài — trọng tâm chính vẫn là Backpropagation, Gradient Flow, và Parameter Initialization."

**Chuyển ý:** "Cuối cùng, em xin liệt kê các nguồn tài liệu tham khảo đã sử dụng."

---

### Slide 31 — References

**Nói:**

> "Em liệt kê 7 nguồn tham khảo — mỗi nguồn tương ứng TRỰC TIẾP với một phần lý thuyết hoặc thực nghiệm THỰC SỰ được dùng trong bài, không đưa vào những nguồn không liên quan chỉ để 'cho có vẻ đầy đủ':
>
> Rumelhart, Hinton, và Williams, năm 1986 — bài báo gốc đề xuất Backpropagation, đăng trên tạp chí Nature.
> LeCun, Bottou, Orr, và Müller — bài Efficient BackProp, liên quan tới việc chuẩn hoá input.
> Glorot và Bengio, năm 2010 — bài báo gốc đề xuất Xavier Initialization.
> He, Zhang, Ren, và Sun, năm 2015 — bài báo gốc đề xuất He hay Kaiming Initialization.
> Goodfellow, Bengio, và Courville — sách giáo trình Deep Learning, dùng làm nền tảng lý thuyết chung.
> Xiao, Rasul, và Vollgraf, năm 2017 — bài giới thiệu dataset Fashion-MNIST mà em dùng trong thực nghiệm.
> Và Paszke và cộng sự, năm 2019 — bài báo giới thiệu PyTorch, framework mà toàn bộ code thực nghiệm của em được xây dựng trên đó, bao gồm cơ chế autograd đã nhắc tới nhiều lần trong bài."

**Kết bài:**

> "Em xin dừng phần trình bày tại đây. Tóm lại, bài của em đi từ một viên gạch toán học đơn giản nhất — đạo hàm — qua Chain Rule, qua thuật toán Backpropagation, tới hiện tượng vanishing và exploding gradient trong mạng sâu, và cuối cùng tới các chiến lược khởi tạo tham số như Xavier và He — toàn bộ được KIỂM CHỨNG bằng một thực nghiệm có kiểm soát do chính em thiết kế và chạy, với số liệu thật, không có con số nào bị bịa hay làm tròn cho đẹp câu chuyện. Em cảm ơn thầy/cô và các bạn đã lắng nghe, và em sẵn sàng trả lời câu hỏi."

---

## 6. Demo sống project (nếu được yêu cầu / còn thời gian)

### 6.1. Giới thiệu cấu trúc project (30 giây)

Mở terminal, gõ (hoặc đã mở sẵn file explorer):
```bash
cd deep-learning-backprop-init
ls src/ experiments/ results/
```
**Nói:** "Project chia làm 3 phần chính: thư mục `src` chứa code lõi — định nghĩa model, các công thức initialization, các hàm đo metric, và training loop; thư mục `experiments` chứa các script chạy từng thí nghiệm cụ thể; và thư mục `results` chứa log JSON, bảng CSV, và hình PNG — tất cả đã có sẵn từ những lần chạy trước, nên em KHÔNG cần chạy lại khi demo hôm nay."

### 6.2. Chỉ code — nơi các con số trên slide đến từ đâu

Mở `src/initialization.py`, chỉ vào hàm `weight_variance`:
```python
if scheme == "he":
    return 2.0 / fan_in
if scheme == "xavier":
    return 2.0 / (fan_in + fan_out)
```
**Nói:** "Đây chính là công thức Var(W) — phương sai của weight — đã trình bày ở slide Xavier và slide He. Không phải lý thuyết suông trên slide — đây là code THẬT, trực tiếp tạo ra mọi con số xuất hiện trên slide."

Mở `src/metrics.py`, chỉ vào hàm `grad_norms_per_layer`:
```python
"grad_norm": float(np.linalg.norm(g)),
"grad_rms": float(np.linalg.norm(g) / np.sqrt(n_elem)),
```
**Nói:** "Và đây là công thức Gradient RMS — chuẩn hoá theo căn bậc hai của số phần tử, để so sánh công bằng giữa các layer có kích thước khác nhau, đúng công thức grad.pow(2).mean().sqrt() đã trình bày, và đúng thuật ngữ 'Gradient RMS' được dùng NHẤT QUÁN trên toàn bộ slide."

### 6.3. Chạy lại một thí nghiệm nhỏ trực tiếp (nếu chắc chắn máy/thời gian ổn, ~30–60 giây)

Chạy thí nghiệm nhẹ nhất — chỉ 2 scheme để tiết kiệm thời gian:
```bash
python experiments/run_initialization.py --quick
```
**Nói trong lúc chạy:** "Lệnh này chạy nhanh 2 scheme nhân 2 activation, 2 epoch, chỉ để chứng minh pipeline hoạt động thật — bản đầy đủ, 5 scheme nhân 4 activation nhân 15 epoch, đã chạy trước và log sẵn trong `results/logs`."

Nếu muốn tái hiện đúng slide Exploding Gradient (Experiment 3), có thể chạy (mất khoảng 5–10 giây):
```bash
python experiments/run_deep_demo.py
```
**Nói:** "Script này train cả 5 cấu hình trên kiến trúc 10 lớp — nếu để ý terminal, dòng Random large sẽ hiện `train_loss=nan` ngay từ epoch đầu tiên, đúng như slide vừa trình bày."

### 6.4. Mở kết quả thật

```bash
cat results/tables/deep_demo_summary.csv
cat results/tables/multiseed_xavier_he_summary.csv
```
**Nói:** "Đây chính là hai bảng CSV nguồn cho slide Bảng tổng hợp và slide 5-seed Xavier vs He — số liệu trên slide lấy TRỰC TIẾP từ đây, không qua chỉnh sửa."

Mở file hình bằng ứng dụng xem ảnh mặc định (hoặc đã mở sẵn tab trình duyệt):
```
results/figures/gradient_heatmap_slide.png
results/figures/activation_variance_slide.png
results/figures/depth_comparison_v2_slide.png
```

### 6.5. Nếu bị hỏi "làm sao build lại slide từ số liệu mới?"

```bash
node report/build_deck.js
```
**Nói:** "Toàn bộ số liệu trên slide được đọc TRỰC TIẾP từ file JSON và CSV trong thư mục `results` tại thời điểm build — không hề hardcode. Nếu chạy lại thí nghiệm với số liệu mới, chỉ cần chạy lại đúng lệnh này, file PPTX sẽ tự động cập nhật theo số liệu mới."

### Kế hoạch B — nếu không demo sống được

Chỉ cần nói:
> "Toàn bộ pipeline này đã chạy thật trên máy em trước buổi hôm nay — mọi số liệu trên slide đều đọc trực tiếp từ file kết quả này, em có thể mở file JSON hoặc CSV gốc ngay bây giờ nếu thầy/cô muốn kiểm tra." — rồi mở 1-2 file JSON trong `results/logs/` để chỉ tay.

---

## 7. Câu hỏi phản biện thường gặp — chuẩn bị sẵn câu trả lời

| Câu hỏi | Trả lời ngắn |
|---|---|
| Zero-init thất bại vì lý do gì, chính xác? | Vì các hidden unit KHÔNG PHÁ ĐƯỢC symmetry (failure to break symmetry) — chúng khởi đầu giống nhau và tiếp tục nhận gradient giống nhau. KHÔNG phải "vì symmetry breaking" — đó là nói ngược nghĩa. |
| Zero-init và Random nhỏ đều cho gradient ~0, vậy có phải cùng một hiện tượng không? | Không. Zero là vấn đề SYMMETRY (cấu trúc), Random nhỏ là VANISHING GRADIENT thật sự (do co scale lặp lại qua nhiều lớp). Cùng hệ quả, khác cơ chế — không nên gộp chung. |
| Vì sao slide Xavier/He không có số test accuracy? | Cố tình bỏ, vì project có tới 3 bộ số Xavier/He khác nhau ở 3 nơi (6-layer main grid, 10-layer 1-seed, 10-layer 5-seed) — để tránh nhầm lẫn, toàn bộ accuracy dồn về phần Demo. |
| Vì sao chỉ 1 seed cho phần lý thuyết mà không phải multi-seed hết? | Slide lý thuyết không show accuracy nữa (xem câu trên); phần Experiment 4&5 là nơi em chủ động chạy 5-seed để kiểm chứng nghiêm túc trước khi kết luận. |
| Sao không test Orthogonal initialization thật? | Ngoài phạm vi thời gian của đồ án này — em liệt kê trong bảng so sánh cho đầy đủ lý thuyết nhưng nói rõ không có thực nghiệm đi kèm, tránh nhận vơ. |
| Gradient RMS khác Gradient Norm thế nào? | Norm là L2-norm (Frobenius) của toàn ma trận; RMS = norm/√(số phần tử) — chuẩn hoá để so sánh công bằng giữa các layer có kích thước khác nhau (layer 1: 784×128 ≈ 100k phần tử, các layer sau chỉ 128×128 ≈ 16k). |
| Metric gradient/activation đo lúc nào trong quá trình training? | Tại bước KHỞI TẠO, trên batch dữ liệu đầu tiên, TRƯỚC bất kỳ update tham số nào — không phải trung bình suốt quá trình training. |
| Tại sao He@L=12 accuracy sụt xuống 32.6% nếu gradient vẫn ổn định? | Đã đo train loss vẫn thấp (0.456) trong khi test loss vọt lên (5.41) — dấu hiệu overfitting trên tập train nhỏ (5.000 mẫu) không regularization, không phải vanishing gradient. |
| Xavier hay He tốt hơn cho ReLU? | Về accuracy (5-seed): khoảng mean±std chồng lấn đáng kể, không đủ cơ sở xếp hạng. Về gradient RMS: He nhất quán lớn hơn Xavier ~35 lần ở mọi seed — nhưng "lớn hơn" không tự động nghĩa là "tốt hơn". |
| Kết quả có tái lập được không? | Có — cùng seed, cùng code sẽ ra đúng số liệu này (đã set `torch.manual_seed` + `deterministic_algorithms`, và DataLoader cũng dùng generator cùng seed). Toàn bộ code, log, và hướng dẫn chạy nằm trong project đính kèm. |
| Vì sao dùng Fashion-MNIST thay vì MNIST? | Bài toán khó hơn MNIST một chút (dễ thấy khác biệt giữa các scheme hơn) nhưng vẫn train rất nhanh trên CPU, không cần GPU. |
| Preprocessing dữ liệu như thế nào? | Pixel được chuẩn hoá (normalize) bằng mean/std tính từ chính tập train, không dùng thô trong khoảng [0,1]; ảnh 28×28 được flatten thành vector 784 chiều. |
| Bias được khởi tạo thế nào? | Luôn bằng 0, ở MỌI layer, trong TẤT CẢ cấu hình — không đổi theo scheme khởi tạo weight. |

---

*Kịch bản này khớp 100% với nội dung và số liệu trong `Slide_Backprop_Initialization.pptx` (31 slide) tại thời điểm soạn. Nếu slide được build lại với số liệu mới (`node build_deck.js`), hãy đối chiếu lại các con số cụ thể trong file này trước khi thuyết trình.*
