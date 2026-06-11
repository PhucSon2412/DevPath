import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server/.env so we can set the deployed base URL
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Đường dẫn tới thư mục chứa data roadmaps
const DATA_DIRS = [
  path.join(__dirname, '../../crawldata/roadmaps_json'),
  path.join(__dirname, '../../crawldata/roadmaps_json_jp'),
  path.join(__dirname, '../../crawldata/roadmaps_json_vi')
];

// Regex để bắt các URL roadmap (roadmap.sh hoặc app đã deploy)
// (Bỏ qua các link guides kiểu https://roadmap.sh/guides/...)
const ROADMAP_SH_REGEX = /^https:\/\/roadmap\.sh\/([^/?#]+)$/;
const APP_ROADMAP_REGEX = /^https?:\/\/[^/]+\/roadmap\/([^/?#]+)$/;
const DEFAULT_BASE_URL = 'http://localhost:3000';
const RAW_BASE_URL = (process.env.ROADMAP_APP_URL || process.env.APP_BASE_URL || process.env.FRONTEND_URL || DEFAULT_BASE_URL).trim();
const BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;
const NEW_BASE_URL = `${BASE_URL}/roadmap/`;

function updateLinksInFile(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);
    let isModified = false;

    if (data && data.nodes && Array.isArray(data.nodes)) {
      data.nodes.forEach(node => {
        if (node.content && node.content.links && Array.isArray(node.content.links)) {
          node.content.links.forEach(link => {
            if (!link || typeof link.url !== 'string') return;

            const roadmapMatch = ROADMAP_SH_REGEX.exec(link.url);
            const appMatch = APP_ROADMAP_REGEX.exec(link.url);
            const roadmapId = roadmapMatch?.[1] || appMatch?.[1];

            if (roadmapId) {
              const newUrl = `${NEW_BASE_URL}${roadmapId}`;
              if (link.url !== newUrl) {
                console.log(`[${path.basename(filePath)}] Update link: ${link.url} -> ${newUrl}`);
                link.url = newUrl;
                isModified = true;
              }
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
