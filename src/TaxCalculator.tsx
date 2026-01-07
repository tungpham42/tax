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
} from "antd";
import {
  BankOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import "./App.css"; // Đảm bảo đã import CSS

const { Title, Text } = Typography;
const { Content, Footer } = Layout;

// Theme config cho Ant Design
const themeConfig = {
  token: {
    fontFamily: "'Lexend Deca', sans-serif",
    colorPrimary: "#1a365d", // Màu xanh than
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
  },
};

interface TaxFormValues {
  income: number;
  dependents: number;
  insurance: number;
}

interface ApiResponse {
  result: string;
  used_model: string;
}

const TaxCalculator: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [usedModel, setUsedModel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const onFinish = async (values: TaxFormValues) => {
    setLoading(true);
    setError(null);
    setResult("");

    const incomeStr = values.income.toLocaleString("vi-VN");
    const insuranceStr = values.insurance.toLocaleString("vi-VN");
    const promptText = `
      Bạn là chuyên gia tư vấn thuế cao cấp (Senior Tax Consultant) tại Việt Nam. 
      Nhiệm vụ của bạn là tính toán Thuế Thu Nhập Cá Nhân (TNCN) cho kỳ tính thuế năm ${currentYear}.

      *** YÊU CẦU VỀ DỮ LIỆU PHÁP LÝ (QUAN TRỌNG) ***
      Thay vì sử dụng các con số định sẵn, hãy tự xác định các quy định pháp luật mới nhất về thuế TNCN đang có hiệu lực tại Việt Nam trong năm ${currentYear}:
      1. Xác định mức giảm trừ gia cảnh cho bản thân hiện hành.
      2. Xác định mức giảm trừ cho người phụ thuộc hiện hành.
      3. Áp dụng Biểu thuế lũy tiến từng phần hiện hành (xác định rõ số bậc và mức thuế suất tương ứng).

      *** THÔNG TIN KHÁCH HÀNG ***
      - Tổng thu nhập chịu thuế: ${incomeStr} VND
      - Số người phụ thuộc: ${values.dependents} người
      - Bảo hiểm bắt buộc đã trừ: ${insuranceStr} VND

      *** YÊU CẦU TRÌNH BÀY (MARKDOWN) ***
      Hãy lập một báo cáo chuyên nghiệp, minh bạch:
      1. **Căn cứ áp dụng**: Ghi rõ mức giảm trừ bản thân, giảm trừ người phụ thuộc và biểu thuế bạn đang sử dụng để tính toán (Ví dụ: Theo Nghị quyết số... hoặc Quy định hiện hành năm ${currentYear}).
      2. **Tóm tắt hồ sơ**: Liệt kê lại thu nhập và số người phụ thuộc.
      3. **Diễn giải chi tiết**: Trình bày từng bước (Thu nhập chịu thuế -> Tổng các khoản giảm trừ -> Thu nhập tính thuế).
      4. **Bảng tính thuế chi tiết (Bắt buộc)**: Vẽ Table gồm các cột (Bậc, Khoảng thu nhập tính thuế, Thuế suất, Số tiền thuế).
      5. **Kết luận**: Tổng số tiền thuế phải nộp (In đậm, size lớn).
    `;

    try {
      const response = await axios.post<ApiResponse>(
        "https://groqprompt.netlify.app/",
        { prompt: promptText }
      );
      if (response.data.result) setResult(response.data.result);
      if (response.data.used_model) setUsedModel(response.data.used_model);
    } catch (err) {
      setError("Hệ thống đang bận. Vui lòng thử lại sau giây lát.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        {/* Header Section */}
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
            Hỗ trợ tính toán chính xác theo Luật Thuế {currentYear}
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
            {/* Input Section */}
            <Card
              className="legal-paper"
              title={
                <>
                  <SafetyCertificateOutlined style={{ color: "#1a365d" }} />{" "}
                  Thông Tin Khách Hàng
                </>
              }
            >
              <Alert
                title="Cập nhật chính sách mới"
                description={`Hệ thống đã tự động áp dụng mức giảm trừ gia cảnh mới cho kỳ tính thuế ${currentYear}.`}
                type="info"
                showIcon
                style={{
                  marginBottom: 24,
                  border: "1px solid #91d5ff",
                  background: "#e6f7ff",
                }}
              />

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ dependents: 0, insurance: 0 }}
                size="large"
              >
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Tổng thu nhập chịu thuế (VND)"
                      name="income"
                      rules={[
                        { required: true, message: "Vui lòng nhập thu nhập" },
                      ]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/\$\s?|(,*)/g, "") as any}
                        addonAfter={<DollarCircleOutlined />}
                        placeholder="VD: 30,000,000"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Bảo hiểm bắt buộc đã đóng (VND)"
                      name="insurance"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/\$\s?|(,*)/g, "") as any}
                        placeholder="VD: 1,500,000"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Số người phụ thuộc" name="dependents">
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        max={20}
                        addonBefore={<UsergroupAddOutlined />}
                      />
                    </Form.Item>
                  </Col>
                  <Col
                    xs={24}
                    md={12}
                    style={{ display: "flex", alignItems: "end" }}
                  >
                    <Form.Item style={{ width: "100%" }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<RocketOutlined />}
                        loading={loading}
                        block
                        style={{
                          background:
                            "linear-gradient(90deg, #1a365d 0%, #2a4365 100%)",
                          border: "none",
                          boxShadow: "0 4px 14px 0 rgba(26, 54, 93, 0.39)",
                        }}
                      >
                        Lập Bảng Tính Thuế
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* Error Message */}
            {error && (
              <Alert
                title="Thông báo lỗi"
                description={error}
                type="error"
                showIcon
                closable
              />
            )}

            {/* Result Section */}
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
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            // Giữ nguyên logic render components nhưng CSS đã được xử lý ở App.css
                            table: ({ node, ...props }) => <table {...props} />,
                            th: ({ node, ...props }) => <th {...props} />,
                            td: ({ node, ...props }) => <td {...props} />,
                          }}
                        >
                          {result}
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
                        <span>{new Date().toLocaleDateString("vi-VN")}</span>
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
          Vietnam Personal Income Tax Calculator ©{currentYear} <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Designed for Professionals
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default TaxCalculator;
