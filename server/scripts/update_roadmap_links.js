import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn tới thư mục chứa data roadmaps
const DATA_DIRS = [
  path.join(__dirname, '../../crawldata/roadmaps_json'),
  path.join(__dirname, '../../crawldata/roadmaps_json_jp')
];

// Regex để bắt các URL có dạng https://roadmap.sh/<tên-roadmap>
// (Bỏ qua các link guides kiểu https://roadmap.sh/guides/...)
const ROADMAP_URL_REGEX = /^https:\/\/roadmap\.sh\/([^/?#]+)$/;
const NEW_BASE_URL = 'http://localhost:3000/roadmap/';

function updateLinksInFile(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);
    let isModified = false;

    if (data && data.nodes && Array.isArray(data.nodes)) {
      data.nodes.forEach(node => {
        if (node.content && node.content.links && Array.isArray(node.content.links)) {
          node.content.links.forEach(link => {
            const match = ROADMAP_URL_REGEX.exec(link.url);
            // Kiểm tra link type là roadmap hoặc dựa trên regex URL
            if (match) {
              const roadmapId = match[1];
              // Đổi URL
              const newUrl = `${NEW_BASE_URL}${roadmapId}`;
              console.log(`[${path.basename(filePath)}] Update link: ${link.url} -> ${newUrl}`);
              link.url = newUrl;
              isModified = true;
            }
          });
        }
      });
    }

    // Nếu có sự thay đổi thì ghi đè lại file
    if (isModified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error(`Lỗi khi xử lý file ${filePath}:`, error);
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`Thư mục không tồn tại: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    if (file.endsWith('.json')) {
      const fullPath = path.join(dirPath, file);
      updateLinksInFile(fullPath);
    }
  });
}

console.log('Bắt đầu cập nhật URL roadmap...');
DATA_DIRS.forEach(processDirectory);
console.log('Hoàn tất!');
