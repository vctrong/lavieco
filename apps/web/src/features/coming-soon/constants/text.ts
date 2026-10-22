export const TEXT = {
  vi: {
    metaTitle: "Sắp ra mắt | LAVIECO",
    badge: "Nº 00 · ĐANG TÁC TẠO · 2026",
    title: { lead: "Câu chuyện này đang được kể ", emphasis: "dở" },
    subtitle: "Sắp ra mắt.",
    progress: { label: "Tiến độ chuẩn bị ra mắt", start: "KHỞI NGUYÊN", end: "RA MẮT" },
    form: {
      emailLabel: "Địa chỉ email",
      emailPlaceholder: "Nhập email của bạn...",
      consent:
        "Tôi đồng ý để LAVIECO lưu địa chỉ email này và gửi thông báo khi trang trưng bày mở cửa.",
      submit: "Nhận tin khi ra mắt",
      submitting: "Đang gửi...",
      done: "Đã ghi nhận",
      note: "Chúng tôi sẽ gửi thông báo khi trang trưng bày chính thức mở cửa.",
    },
    errors: {
      emailRequired: "Bạn vui lòng nhập địa chỉ email.",
      email: "Địa chỉ email chưa đúng định dạng, ví dụ ten@example.com.",
      consent: "Bạn vui lòng đồng ý để chúng tôi có thể gửi thông báo.",
    },
    status: {
      success: "Địa chỉ lưu trữ thành công. Chúng tôi sẽ liên lạc khi trang ra mắt.",
      unavailable: "Chưa thể ghi nhận địa chỉ lúc này. Bạn vui lòng thử lại sau ít phút.",
      invalid: "Thông tin chưa hợp lệ. Bạn vui lòng kiểm tra lại email.",
    },
    /** Pages not built yet, inside the site chrome (`ComingSoonSection`). */
    section: {
      eyebrow: "Sắp ra mắt",
      home: "Về trang chủ",
      waitlistTitle: "Nhận thông báo khi trang ra mắt",
      metaTitle: (page: string) => `${page} (sắp ra mắt) | LAVIECO`,
    },
    suggestions: {
      programs: "Xem các chương trình",
      contact: "Gửi yêu cầu hợp tác",
      lookup: "Tra cứu vé",
    },
    pages: {
      story: {
        title: "Câu chuyện",
        description:
          "Hành trình của LAVIECO, từ những vỏ hải sản bị bỏ lại sau bữa ăn ở Cần Thơ đến lớp học mỹ thuật xanh, đang được viết lại cho trang này.",
      },
      collection: {
        title: "Bộ sưu tập",
        description:
          "Những tác phẩm làm từ vỏ hải sản tái sinh, mỗi tác phẩm là một minh chứng kèm câu chuyện và lối dẫn về Cẩm nang xanh số.",
      },
      handbook: {
        title: "Cẩm nang xanh số",
        description:
          "Cẩm nang đọc qua mã QR trên sản phẩm: cách vỏ hải sản trở thành chất liệu nghệ thuật, miễn phí trong giai đoạn ra mắt.",
      },
      impact: {
        title: "Tác động",
        description:
          "Những con số về vật liệu được tái sinh và các lớp học đã diễn ra, chỉ công bố khi đã có nguồn và được kiểm chứng.",
      },
      partnership: {
        title: "Hợp tác",
        description:
          "Trang dành cho trường học, doanh nghiệp và đối tác đang được chuẩn bị. Bạn vẫn có thể gửi yêu cầu hợp tác ngay ở trang chủ.",
      },
      tickets: {
        title: "Vé của tôi",
        description:
          "Danh sách vé trong tài khoản đang được hoàn thiện. Trong lúc chờ, bạn tra cứu vé bằng email đã dùng khi đặt.",
      },
      registrations: {
        title: "Chương trình đã đăng ký",
        description:
          "Lịch sử đăng ký chương trình trong tài khoản đang được hoàn thiện. Vé vẫn được gửi qua email như thường lệ.",
      },
    },
    facts: [
      { label: "KHÔNG GIAN", value: "Bảo tàng xanh" },
      { label: "TRIỂN LÃM", value: "LAVIECO" },
      { label: "NIÊN ĐẠI", value: "2026" },
    ],
  },
} as const;
