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

// Import locale Tiếng Việt cho Ant Design và Dayjs
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

const sectionStyle: React.CSSProperties = {
  background: "#f8fafc",
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

interface TavilyResponse {
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

// --- COMPONENT CHÍNH ---

const TaxCalculator: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [usedModel, setUsedModel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>("");

  const currentMonth = dayjs();

  const preprocessContent = (content: string) => {
    if (!content) return "";
    return content
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$")
      .replace(/^\[ /gm, "$$ ")
      .replace(/ \]$/gm, " $$");
  };

  // --- LOGIC XỬ LÝ CHÍNH ---
  const onFinish = async (values: TaxFormValues) => {
    setLoading(true);
    setError(null);
    setResult("");
    setUsedModel("");
    setSearchStatus("Đang tra cứu luật thuế mới nhất từ Internet...");

    const selectedPeriod = values.period
      ? values.period.format("MM/YYYY")
      : currentMonth.format("MM/YYYY");
    const selectedYear = values.period
      ? values.period.year()
      : currentMonth.year();
    const incomeStr = values.income.toLocaleString("vi-VN");

    let liveContext = "";

    // BƯỚC 1: Gọi Tavily API để lấy thông tin luật thuế cập nhật nhất
    try {
      // TODO: Điền API Key của bạn vào đây. Trong thực tế, nên đưa key này ra Backend.
      const TAVILY_API_KEY = process.env.REACT_APP_TAVILY_API_KEY;
      const searchQuery = `Luật thuế TNCN mới nhất năm ${selectedYear} Việt Nam mức giảm trừ gia cảnh, người phụ thuộc và biểu thuế lũy tiến từng phần`;

      const tavilyRes = await axios.post<TavilyResponse>(
        "https://api.tavily.com/search",
        {
          api_key: TAVILY_API_KEY,
          query: searchQuery,
          search_depth: "advanced",
          include_answer: true,
          max_results: 3,
        },
      );

      if (tavilyRes.data.answer) {
        liveContext = tavilyRes.data.answer;
      } else if (tavilyRes.data.results && tavilyRes.data.results.length > 0) {
        liveContext = tavilyRes.data.results.map((r) => r.content).join("\n\n");
      } else {
        throw new Error("Không tìm thấy dữ liệu từ Internet");
      }

      setSearchStatus("Đang phân tích và tính toán thuế...");
    } catch (err) {
      console.error("Tavily API Error:", err);
      setError(
        "Không thể tra cứu luật thuế mới nhất qua Tavily. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.",
      );
      setLoading(false);
      setSearchStatus("");
      return;
    }

    // BƯỚC 2: Tạo Prompt nhồi Live Context vào cho AI
    const promptText = `
      Bạn là chuyên gia tư vấn thuế cao cấp (Senior Tax Consultant) tại Việt Nam. 
      Nhiệm vụ của bạn là tính toán chính xác Thuế Thu Nhập Cá Nhân (TNCN) cho kỳ tính thuế: **${selectedPeriod}**.

      *** DỮ LIỆU PHÁP LÝ THỰC TẾ (LIVE CONTEXT TỪ INTERNET) ***
      Bạn BẮT BUỘC phải sử dụng các thông tin luật thuế sau đây (vừa được tra cứu trên mạng cho năm ${selectedYear}) để tính toán, tuyệt đối KHÔNG ĐƯỢC tự bịa số liệu hay dùng dữ liệu cũ:
      ---
      ${liveContext}
      ---
      *Lưu ý: Nếu dữ liệu trên không đề cập chi tiết đến tỷ lệ trích nộp bảo hiểm bắt buộc đối với người lao động, hãy mặc định trừ 10,5% trên tổng thu nhập (BHXH 8%, BHYT 1,5%, BHTN 1%).*

      *** THÔNG TIN KHÁCH HÀNG ***
      - Kỳ tính thuế: ${selectedPeriod}
      - Tổng thu nhập chịu thuế (Gross): ${incomeStr} VND
      - Số người phụ thuộc: ${values.dependents} người

      *** YÊU CẦU TRÌNH BÀY (MARKDOWN) ***
      Hãy lập một báo cáo chuyên nghiệp:
      1. **Căn cứ pháp lý**: Tóm tắt các mức giảm trừ và quy định thuế bạn vừa trích xuất được từ dữ liệu Internet ở trên.
      2. **Tóm tắt hồ sơ**: Liệt kê lại thu nhập, kỳ tính thuế và số người phụ thuộc.
      3. **Diễn giải chi tiết**: Trình bày từng bước tính toán (bao gồm bước trừ bảo hiểm bắt buộc).
      4. **Bảng tính thuế chi tiết (Bắt buộc)**: Vẽ Table Markdown gồm các cột (Bậc, Khoảng thu nhập tính thuế, Thuế suất, Số tiền).
      5. **Kết luận**: Tổng số tiền thuế phải nộp (In đậm, size lớn) và Lương Net cuối cùng.
      
      [QUAN TRỌNG] Quy tắc hiển thị công thức toán học:
      - BẮT BUỘC sử dụng dấu $$ bao quanh công thức (Ví dụ: $$ a + b = c $$).
      - TUYỆT ĐỐI KHÔNG sử dụng ký hiệu \\[ hoặc \\] hoặc ( ).
    `;

    // BƯỚC 3: Gọi API AI (Netlify Function / Groq)
    try {
      const response = await axios.post<ApiResponse>(
        "https://groqprompt.netlify.app/api/ai",
        { prompt: promptText },
        { headers: { "Content-Type": "application/json" } },
      );

      if (response.data) {
        setResult(response.data.result);
        setUsedModel(response.data.used_model);
      }
    } catch (err) {
      setError(
        "Không thể kết nối đến server tính toán AI. Vui lòng kiểm tra lại mạng hoặc cấu hình API.",
      );
      console.error("Groq API Error:", err);
    } finally {
      setLoading(false);
      setSearchStatus("");
    }
  };

  return (
    <ConfigProvider theme={themeConfig} locale={viVN}>
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
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
            CỔNG TÍNH THUẾ TNCN THÔNG MINH
          </Title>
          <Text
            style={{
              color: "#a0aec0",
              fontSize: "16px",
              marginTop: 10,
              display: "block",
            }}
          >
            Hệ thống tự động tra cứu luật thuế mới nhất theo thời gian thực
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
                          format="MM/YYYY"
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
                        *AI sẽ tự động quét Internet để tìm luật tương ứng với
                        thời điểm này.
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
                        *Số người phụ thuộc hợp lệ đã đăng ký mã số thuế.
                      </Text>
                    </Col>
                  </Row>
                </div>

                <div
                  style={{
                    ...sectionStyle,
                    background: "#fff",
                    border: "1px dashed #cbd5e0",
                  }}
                >
                  <Row gutter={24}>
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

                <Form.Item style={{ marginTop: 30, marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={loading ? null : <RocketOutlined />}
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
                    {searchStatus || "TÍNH THUẾ NGAY"}
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {error && (
              <Alert
                message="Thông báo hệ thống"
                description={error}
                type="error"
                showIcon
                closable
                style={{ borderRadius: 8 }}
              />
            )}

            {result && (
              <div className="fade-in-up">
                <Badge.Ribbon text="Live Data Report" color="#c5a572">
                  <Card
                    className="legal-paper"
                    bordered={false}
                    title={
                      <div style={{ textAlign: "center", width: "100%" }}>
                        BÁO CÁO CHI TIẾT
                      </div>
                    }
                    style={{ minHeight: 200 }}
                  >
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
                      <span>
                        AI Model: {usedModel} (Tích hợp Tavily Web Search)
                      </span>
                      <span>
                        Thời gian lập: {new Date().toLocaleString("vi-VN")}
                      </span>
                    </div>
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
            Powered by React & AI
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default TaxCalculator;
