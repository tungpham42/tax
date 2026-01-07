import React, { useState } from "react";
import {
  Form,
  InputNumber,
  Button,
  Card,
  Typography,
  Layout,
  Space,
  Alert,
  Spin,
  ConfigProvider,
  Row,
  Col,
  Badge,
  Divider,
  DatePicker,
} from "antd";
import {
  BankOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import dayjs from "dayjs";
import "./App.css";

// [MỚI] Import locale Tiếng Việt cho Ant Design và Dayjs
import viVN from "antd/locale/vi_VN";
import "dayjs/locale/vi";

// Thiết lập ngôn ngữ mặc định cho dayjs
dayjs.locale("vi");

const { Title, Text } = Typography;
const { Content, Footer } = Layout;

// --- CẤU HÌNH GIAO DIỆN (THEME & STYLE) ---

const themeConfig = {
  token: {
    fontFamily: "'Lexend Deca', sans-serif",
    colorPrimary: "#1a365d",
    borderRadius: 8,
    colorTextHeading: "#1a365d",
  },
  components: {
    Button: {
      colorPrimary: "#1a365d",
      algorithm: true,
      controlHeightLG: 50,
      fontSizeLG: 16,
      fontWeight: 600,
    },
    Card: {
      headerFontSize: 18,
      headerFontWeight: 600,
    },
    InputNumber: {
      controlHeightLG: 45,
    },
    DatePicker: {
      controlHeightLG: 45,
    },
  },
};

// Style cho các khối nhập liệu
const sectionStyle: React.CSSProperties = {
  background: "#f8fafc", // Xám xanh nhạt
  padding: "24px",
  borderRadius: "12px",
  border: "1px solid #edf2f7",
  marginBottom: "24px",
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#2d3748",
  marginBottom: "8px",
  display: "block",
};

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU ---

interface TaxFormValues {
  income: number;
  dependents: number;
  period: dayjs.Dayjs;
}

interface ApiResponse {
  result: string;
  used_model: string;
}

// --- COMPONENT CHÍNH ---

const TaxCalculator: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [usedModel, setUsedModel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Mặc định chọn tháng hiện tại
  const currentMonth = dayjs();

  // Hàm chuẩn hóa dữ liệu từ AI để hiển thị Toán học đẹp hơn
  const preprocessContent = (content: string) => {
    if (!content) return "";

    return (
      content
        // Thay thế block math \[ ... \] thành $$ ... $$
        .replace(/\\\[/g, "$$")
        .replace(/\\\]/g, "$$")
        // Thay thế inline math \( ... \) thành $ ... $
        .replace(/\\\(/g, "$")
        .replace(/\\\)/g, "$")
        // Xử lý trường hợp AI trả về dấu ngoặc vuông đơn lẻ chứa công thức [ ... ]
        .replace(/^\[ /gm, "$$ ")
        .replace(/ \]$/gm, " $$")
    );
  };

  // --- LOGIC XỬ LÝ ---
  const onFinish = async (values: TaxFormValues) => {
    setLoading(true);
    setError(null);
    setResult("");
    setUsedModel("");

    // 1. Chuẩn bị dữ liệu
    const selectedPeriod = values.period
      ? values.period.format("MM/YYYY")
      : currentMonth.format("MM/YYYY");
    const selectedYear = values.period
      ? values.period.year()
      : currentMonth.year();
    const incomeStr = values.income.toLocaleString("vi-VN");

    // 2. Tạo Prompt (Câu lệnh gửi AI)
    const promptText = `
      Bạn là chuyên gia tư vấn thuế cao cấp (Senior Tax Consultant) tại Việt Nam. 
      Nhiệm vụ của bạn là tính toán Thuế Thu Nhập Cá Nhân (TNCN) cho kỳ tính thuế: **${selectedPeriod}**.

      *** YÊU CẦU VỀ DỮ LIỆU PHÁP LÝ (QUAN TRỌNG) ***
      Hãy xác định chính xác quy định pháp luật về thuế TNCN có hiệu lực tại thời điểm **${selectedPeriod}**:
      1. Xác định mức giảm trừ gia cảnh cho bản thân áp dụng tại năm ${selectedYear}.
      2. Xác định mức giảm trừ cho người phụ thuộc áp dụng tại năm ${selectedYear}.
      3. Áp dụng Biểu thuế lũy tiến từng phần tương ứng với thời điểm này.
      4. Tự động ước tính các khoản bảo hiểm bắt buộc (BHXH, BHYT, BHTN) trên lương nếu người dùng không cung cấp số liệu cụ thể (giả định lương nhập vào là lương Gross).

      *** THÔNG TIN KHÁCH HÀNG ***
      - Kỳ tính thuế: ${selectedPeriod}
      - Tổng thu nhập chịu thuế (Gross): ${incomeStr} VND
      - Số người phụ thuộc: ${values.dependents} người

      *** YÊU CẦU TRÌNH BÀY (MARKDOWN) ***
      Hãy lập một báo cáo chuyên nghiệp:
      1. **Căn cứ pháp lý**: Ghi rõ văn bản luật hoặc mức giảm trừ bạn đang áp dụng cho kỳ ${selectedPeriod}.
      2. **Tóm tắt hồ sơ**: Liệt kê lại thu nhập, kỳ tính thuế và số người phụ thuộc.
      3. **Diễn giải chi tiết**: Trình bày từng bước tính toán (bao gồm bước trừ bảo hiểm bắt buộc ước tính).
      4. **Bảng tính thuế chi tiết (Bắt buộc)**: Vẽ Table gồm các cột (Bậc, Khoảng thu nhập tính thuế, Thuế suất, Số tiền).
      5. **Kết luận**: Tổng số tiền thuế phải nộp (In đậm, size lớn) và Lương Net (Sau khi trừ thuế và bảo hiểm).
      
      [QUAN TRỌNG] Quy tắc hiển thị công thức toán học:
      - BẮT BUỘC sử dụng dấu $$ bao quanh công thức (Ví dụ: $$ a + b = c $$).
      - TUYỆT ĐỐI KHÔNG sử dụng ký hiệu \\[ hoặc \\] hoặc ( ).
    `;

    try {
      // 3. Gọi API
      const response = await axios.post<ApiResponse>(
        "https://groqprompt.netlify.app/api/ai",
        { prompt: promptText },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data) {
        setResult(response.data.result);
        setUsedModel(response.data.used_model);
      }
    } catch (err) {
      setError(
        "Không thể kết nối đến server tính toán. Vui lòng kiểm tra lại mạng hoặc cấu hình API."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- GIAO DIỆN (JSX) ---
  return (
    // [CẬP NHẬT] Thêm prop locale={viVN} vào ConfigProvider
    <ConfigProvider theme={themeConfig} locale={viVN}>
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        {/* Header - Thiết kế vát chéo */}
        <div
          style={{
            background: "#1a365d",
            padding: "40px 20px 80px",
            textAlign: "center",
            clipPath: "polygon(0 0, 100% 0, 100% 85%, 0 100%)",
          }}
        >
          <Title
            level={2}
            style={{ color: "#fff", margin: 0, letterSpacing: "1px" }}
          >
            <BankOutlined style={{ marginRight: 15, color: "#c5a572" }} />
            CỔNG THÔNG TIN TÍNH THUẾ TNCN
          </Title>
          <Text
            style={{
              color: "#a0aec0",
              fontSize: "16px",
              marginTop: 10,
              display: "block",
            }}
          >
            Hỗ trợ tính toán chính xác theo từng kỳ thuế
          </Text>
        </div>

        <Content style={{ padding: "0 20px", marginTop: -50 }}>
          <Space
            direction="vertical"
            size="large"
            style={{
              width: "100%",
              maxWidth: 1000,
              margin: "0 auto",
              display: "flex",
            }}
          >
            {/* --- KHU VỰC NHẬP LIỆU (REDESIGNED) --- */}
            <Card
              className="legal-paper"
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <SafetyCertificateOutlined
                    style={{ color: "#1a365d", fontSize: 20 }}
                  />
                  <span style={{ fontSize: 18 }}>Thông Tin Kê Khai</span>
                </div>
              }
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  dependents: 0,
                  period: currentMonth,
                }}
                size="large"
              >
                {/* NHÓM 1: CẤU HÌNH CƠ BẢN (THỜI GIAN & CON NGƯỜI) */}
                <div style={sectionStyle}>
                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <span style={labelStyle}>1. Kỳ tính thuế</span>
                      <Form.Item
                        name="period"
                        rules={[
                          { required: true, message: "Vui lòng chọn kỳ thuế" },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <DatePicker
                          picker="month"
                          format="MM/YYYY" // Định dạng hiển thị kiểu Việt Nam
                          style={{ width: "100%", height: 50, borderRadius: 8 }}
                          placeholder="Chọn tháng/năm"
                          suffixIcon={
                            <CalendarOutlined style={{ color: "#1a365d" }} />
                          }
                        />
                      </Form.Item>
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, marginTop: 4, display: "block" }}
                      >
                        *Hệ thống tự động áp dụng luật thuế tương ứng thời điểm
                        này.
                      </Text>
                    </Col>

                    <Col xs={24} md={12}>
                      <span style={labelStyle}>2. Người phụ thuộc</span>
                      <Form.Item name="dependents" style={{ marginBottom: 0 }}>
                        <InputNumber
                          style={{
                            width: "100%",
                            height: 50,
                            borderRadius: 8,
                            paddingTop: 4,
                          }}
                          min={0}
                          max={20}
                          prefix={
                            <UsergroupAddOutlined
                              style={{ color: "#a0aec0", marginRight: 8 }}
                            />
                          }
                          placeholder="Số lượng (người)"
                        />
                      </Form.Item>
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, marginTop: 4, display: "block" }}
                      >
                        *Giảm trừ theo luật hiện hành (VD: 4.4tr hoặc
                        6.2tr/người).
                      </Text>
                    </Col>
                  </Row>
                </div>

                {/* NHÓM 2: TÀI CHÍNH (THU NHẬP) */}
                <div
                  style={{
                    ...sectionStyle,
                    background: "#fff",
                    border: "1px dashed #cbd5e0",
                  }}
                >
                  <Row gutter={24}>
                    {/* Thu nhập - Hero Input */}
                    <Col xs={24}>
                      <span
                        style={{
                          ...labelStyle,
                          fontSize: 16,
                          color: "#1a365d",
                        }}
                      >
                        3. Tổng thu nhập chịu thuế (VND){" "}
                        <span style={{ color: "red" }}>*</span>
                      </span>
                      <Form.Item
                        name="income"
                        rules={[
                          { required: true, message: "Vui lòng nhập thu nhập" },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          style={{
                            width: "100%",
                            height: 60,
                            fontSize: 24,
                            fontWeight: 600,
                            color: "#1a365d",
                            borderRadius: 8,
                            paddingTop: 8,
                            border: "2px solid #e2e8f0",
                          }}
                          formatter={(v) =>
                            `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          }
                          parser={(v) => v?.replace(/\$\s?|(,*)/g, "") as any}
                          prefix={
                            <span
                              style={{
                                color: "#a0aec0",
                                fontSize: 20,
                                marginRight: 10,
                              }}
                            >
                              ₫
                            </span>
                          }
                          placeholder="Ví dụ: 30,000,000"
                          variant="filled"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* Submit Button */}
                <Form.Item style={{ marginTop: 30, marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<RocketOutlined />}
                    loading={loading}
                    block
                    size="large"
                    style={{
                      height: 55,
                      fontSize: 18,
                      borderRadius: 12,
                      background:
                        "linear-gradient(135deg, #1a365d 0%, #2a4365 100%)",
                      boxShadow: "0 10px 20px -10px rgba(26, 54, 93, 0.5)",
                      border: "none",
                    }}
                  >
                    {loading ? "ĐANG TÍNH TOÁN..." : "TÍNH THUẾ NGAY"}
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* --- KHU VỰC HIỂN THỊ LỖI --- */}
            {error && (
              <Alert
                message="Thông báo lỗi"
                description={error}
                type="error"
                showIcon
                closable
                style={{ borderRadius: 8 }}
              />
            )}

            {/* --- KHU VỰC KẾT QUẢ (REPORT) --- */}
            {result && (
              <div className="fade-in-up">
                <Badge.Ribbon text="Official Report" color="#c5a572">
                  <Card
                    className="legal-paper"
                    bordered={false}
                    title={
                      <div style={{ textAlign: "center", width: "100%" }}>
                        KẾT QUẢ TÍNH TOÁN
                      </div>
                    }
                    style={{ minHeight: 200 }}
                  >
                    <Spin spinning={loading} tip="Đang phân tích dữ liệu...">
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeRaw, rehypeKatex]}
                          components={{
                            table: ({ node, ...props }) => <table {...props} />,
                            th: ({ node, ...props }) => <th {...props} />,
                            td: ({ node, ...props }) => <td {...props} />,
                          }}
                        >
                          {preprocessContent(result)}
                        </ReactMarkdown>
                      </div>

                      <Divider />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#a0aec0",
                          fontSize: "12px",
                        }}
                      >
                        <span>Mô hình xử lý: {usedModel}</span>
                        <span>
                          Ngày lập: {new Date().toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </Spin>
                  </Card>
                </Badge.Ribbon>
              </div>
            )}
          </Space>
        </Content>

        <Footer
          style={{
            textAlign: "center",
            background: "transparent",
            color: "#718096",
          }}
        >
          Vietnam Personal Income Tax Calculator ©{new Date().getFullYear()}{" "}
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Designed for Professionals
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default TaxCalculator;
