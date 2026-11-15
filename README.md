# baoduongmoto

Website tĩnh cho dịch vụ cho thuê xe máy điện tại Đà Nẵng (E-Moto).

## Cấu trúc

- `index.html` — trang chủ (đã build sẵn)
- `src/` — nguồn: `partials/` (head, header, footer) và `pages/home.html`
- `content/data.json` — dữ liệu nội dung của site
- `scripts/build.py` — build lại toàn bộ HTML từ `src/` + `content/`
- `assets/` — css, js, images
- `bai-viet/`, `san-pham/`, `tin-tuc/`, `danh-muc/` — các trang đã sinh (mỗi trang là `<dir>/index.html`)

## Build

```sh
python3 scripts/build.py
```

## Deploy

Deploy tĩnh lên Vercel (không cần build step), thư mục gốc là output:

```sh
vercel --prod
```
