/**
 * Hàm kiểm tra chuỗi có phải JSON hợp lệ không.
 * Chỉ chấp nhận nếu kết quả parse ra là Object hoặc Array (bỏ qua number/boolean đơn lẻ).
 */
const tryParseJSON = (jsonString) => {
  try {
    const o = JSON.parse(jsonString);
    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(123) throw an error, but we only want Objects/Arrays
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) { }
  return false;
};

/**
 * Hàm đệ quy để format Object thành Text theo yêu cầu:
 * - Key nằm riêng 1 dòng (dạng list item).
 * - Value nằm dòng dưới, thụt vào trong.
 */
const formatObjectToCustomText = (data, level = 0) => {
  // Sử dụng 2 spaces cho indentation của markdown list
  const indentSpace = "  ";
  const currentIndent = indentSpace.repeat(level);

  let result = "";

  // Xử lý trường hợp data là null
  if (data === null) return `${currentIndent}- null\n`;

  // Duyệt qua từng key trong object (hoặc index trong array)
  for (const [key, value] of Object.entries(data)) {
    // 1. In ra Key ở dòng hiện tại (dạng list item, in đậm)
    result += `${currentIndent}- **${key}**:\n`;

    // 2. Kiểm tra Value
    if (typeof value === 'object' && value !== null) {
      // Nếu Value là Object/Array -> Thêm một dòng trống để tách rõ sections
      result += '\n' + formatObjectToCustomText(value, level + 1);
    } else {
      // Nếu Value là dữ liệu thô (string, number...)
      const valueStr = value === null || value === undefined ? '' : String(value);

      // Detect nếu value là multiline hoặc có định dạng bảng markdown (dòng bắt đầu bằng '|')
      const isMultiline = valueStr.includes('\n');
      const looksLikeTable = /^\s*\|/.test(valueStr) || valueStr.trim().startsWith('|');

      if (isMultiline || looksLikeTable) {
        // Đặt một dòng trống rồi chèn value nguyên trạng (không thụt lề) để markdown block/table được nhận diện chính xác
        result += '\n' + valueStr + '\n';
      } else {
        // Một dòng đơn lẻ: thụt lề 1 level và in ra
        const valueIndent = indentSpace.repeat(level + 1);
        result += `\n${valueIndent}${valueStr}\n`;
      }
    }
  }

  return result;
};

/**
 * HÀM CHÍNH: Sử dụng hàm này trong Component
 * Xử lý response: nếu là JSON thì format lại, nếu là text thì giữ nguyên
 * Trả về object: { content: string, metadata: object | null, hasMetadata: boolean }
 */
export const processResponse = (inputString) => {
  if (!inputString) return { content: "", metadata: null, hasMetadata: false };

  // Bước 1: Thử parse JSON
  const jsonObject = tryParseJSON(inputString);

  // Bước 2: Nếu không phải JSON -> Trả về text gốc
  if (!jsonObject) {
    return { content: inputString, metadata: null, hasMetadata: false };
  }

  // Bước 3: Kiểm tra xem có key "metadata" không
  let metadata = null;
  let hasMetadata = false;
  let dataToFormat = jsonObject;

  if (jsonObject.metadata && typeof jsonObject.metadata === 'object') {
    metadata = jsonObject.metadata;
    hasMetadata = true;
    
    // Tạo bản copy và loại bỏ metadata key để format phần còn lại
    dataToFormat = { ...jsonObject };
    delete dataToFormat.metadata;
  }

  // Bước 4: Nếu là JSON -> Format lại theo yêu cầu
  const formattedContent = formatObjectToCustomText(dataToFormat);
  
  return { 
    content: formattedContent, 
    metadata, 
    hasMetadata 
  };
};
