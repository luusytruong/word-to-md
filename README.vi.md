# 📄 Word to Markdown Converter (word-to-md)

[🇺🇸 English](./README.md) | 🇻🇳 Tiếng Việt

_Công cụ gọn nhẹ, tốc độ chớp nhoáng để chuyển đổi tự động văn bản từ định dạng Word (DOCX) sang định dạng Markdown._

---

Nếu bộ công cụ này tiết kiệm thời gian cho bạn, đừng quên cho mình xin một **⭐ Star** nhé! Sự ủng hộ của bạn là động lực rất lớn để những solo dev như mình tiếp tục phát triển package này! 🙏

## 🌟 Giới thiệu

**word-to-md** không chỉ là một thư viện nhỏ gọn mà còn là một CLI siêu cấp để giúp bạn easily extract nội dung trong tệp DOCX và chuyển hóa nó hoàn hảo sang Markdown (`.md`). Trọng tâm của bộ công cụ là tối ưu hiệu suất với tốc độ xử lý đỉnh cao, logic chuyển đổi chính xác, và tương thích mọi môi trường (Web, Node.js, CLI).

## 🚀 Tính năng nổi bật

- **Nhanh & Xử lý đồng thời (Multi-threading)**: Kết hợp công nghệ `p-limit` để convert n-files cùng lúc mà không lo nghẽn bộ nhớ.
- **CLI Đẳng Cấp**: Chấp hết mọi edge case từ xử lý folder đệ quy (nested directories), tự động check path collision, bypass các file trùng tên cho đến thống kê conversion log cực xịn.
- **Chính xác (Fidelity)**: Giữ vững cấu trúc cơ bản như: **In đậm**, _In nghiêng_, Heading, Table (Bảng có padding),...
- **Đa môi trường**: Chạy nguyên bản trên trình duyệt lẫn Node.js (Isomorphic library).
- **Type-safe**: Code hoàn toàn bằng TypeScript, chặt chẽ tới từng object.

## 📦 Cài đặt

Cài đặt global để dùng được CLI lệnh `word2md` mọi lúc, hoặc cài đặt local vào project:

```bash
# Cài đặt global dùng dạng lệnh CLI
npm install -g word-to-md

# Cài đặt local vào project NodeJS của bạn
npm install word-to-md
# hoặc pnpm add word-to-md
# hoặc yarn add word-to-md
```

## � Hướng dẫn CLI (Siêu năng lực)

CLI được thiết kế với tư duy hệ thống cao, giải quyết tất cả edge cases một cách tinh tế: xử lý song song folder cực nặng, bảo vệ ghi đè dữ liệu, output cấu trúc phẳng (flat) hoặc in-place.

```bash
# Convert 1 file đơn giản
word2md ./document.docx

# Convert toàn bộ hàng chục files trong 1 directory song song với tốc độ siêu nhanh
word2md ./my-folder -o ./output-folder

# Options chuyên sâu:
word2md <input> [options]
  -o, --output <path>       Thư mục đích hoặc tên file .md
  --in-place                Lưu file .md ngay tại chỗ cùng thư mục với file docx
  --flat                    Phẳng hoá đường dẫn xuất ra (không giữ cấu trúc thư mục con)
  --overwrite               Cho phép ghi đè lên file đã tồn tại
  --verbose                 Hiển thị log conversion chi tiết
  --concurrency <n>         Số lượng luồng (file) xử lý song song cùng lúc (mặc định: "5")
```

Khi chạy xong, CLI có log Summary tóm tắt siêu đẹp về số liệu Success, Failed, Skipped và thời gian chạy!

## 🛠 Hướng dẫn SDK (Cho Dev)

Nếu bạn dùng JS/TS, chỉ với 1 lệnh import:

```typescript
import { convertBufferToMarkdown } from "word-to-md";
import fs from "fs";

async function main() {
  const fileBuffer = fs.readFileSync("./my-document.docx");
  const markdownText = await convertBufferToMarkdown(fileBuffer);

  console.log(markdownText);
}

main();
```

## 🤝 Đóng góp (Contributing)

Hoan nghênh mọi ý kiến đóng góp, Bug report hay Pull Request mới từ mọi người. Kể cả góp ý nhỏ nhất mình cũng rất trân trọng! Hãy tạo Issue trước nhé!

## 📜 Giấy phép

Dự án được mã nguồn mở dưới giấy phép **MIT**. Khuyến khích mọi người sử dụng, đóng góp và support nhiệt tình.
