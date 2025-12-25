# DUT Schedule Generator

A Chrome extension for extracting table data from web pages and generating schedule images.

## Features

- 🔍 **Table Detection**: Automatically scans and identifies tables on web pages
- 🎯 **Smart Highlighting**: Visual highlighting of selected tables with smooth animations
- 📊 **Data Extraction**: Converts table data to structured JSON format
- 🖼️ **Schedule Generation**: Generates schedule images via API integration
- 🧹 **Auto Cleanup**: Automatically clears highlights when extension is not in use
- **Clear highlights**: Xóa tất cả các highlight
- **Extra Feature**: Nút mở rộng để thêm chức năng tùy chỉnh
- **Dynamic content**: Tự động cập nhật khi có table mới được thêm vào trang

## Cách sử dụng

1. **Cài đặt extension**:
   - Mở Chrome/Edge và vào `chrome://extensions/` hoặc `edge://extensions/`
   - Bật "Developer mode"
   - Click "Load unpacked" và chọn thư mục chứa extension này

2. **Sử dụng**:
   - Click vào icon extension trên thanh toolbar
   - Click "Refresh Tables" để quét lại các table
   - Chọn table từ dropdown (sẽ tự động highlight)
   - Click "Clear All" để xóa tất cả highlight
   - Click "Extra Feature" để thử chức năng mở rộng

## Cấu trúc files

- `manifest.json`: Cấu hình extension
- `popup.html`: Giao diện popup
- `popup.js`: Logic xử lý popup
- `content.js`: Script chạy trên trang web để quét và highlight
- `content.css`: Styles cho highlight effect

## Chức năng chi tiết

### Quét table
- Tự động detect tất cả `<table>` elements
- Hiển thị thông tin: số hàng, số cột, preview text
- Cập nhật realtime khi có table mới

### Highlight effect
- Tự động highlight khi chọn từ dropdown
- Border màu xanh (0,255,0) với độ dày 3px
- Box shadow với hiệu ứng glow
- Animation pulse khi highlight
- Auto scroll đến table được chọn

### Extra Feature
- Nút "Extra Feature" để mở rộng chức năng
- Hiện tại hiển thị outline màu cam tạm thời
- Sẵn sàng để thêm các tính năng như:
  - Export table to CSV
  - Copy table data
  - Analyze table structure
  - Custom styling

### Responsive
- Hoạt động với mọi website
- Tương thích với dynamic content
- Không ảnh hưởng đến layout gốc của trang

## Browser Support

- Chrome (Manifest V3)
- Microsoft Edge
- Các trình duyệt Chromium khác
