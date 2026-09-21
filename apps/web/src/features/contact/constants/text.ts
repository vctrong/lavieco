export const TEXT = {
  vi: {
    fields: {
      name: { label: "Họ & tên *", placeholder: "Nguyễn Văn A" },
      organization: { label: "Đơn vị / Tổ chức *", placeholder: "Trường học / Công ty..." },
      phone: { label: "Số điện thoại / Zalo *", placeholder: "0901 234 567" },
      interest: { label: "Mục tiêu quan tâm *" },
      message: {
        label: "Lời nhắn bổ sung",
        placeholder: "Chia sẻ số lượng người tham gia dự kiến hoặc khu vực tổ chức...",
      },
    },
    interests: {
      "ngoai-khoa": "Gói ngoại khóa học đường",
      workshop: "Workshop trải nghiệm tập thể",
      esg: "Tài trợ giáo dục ESG",
      combo: "Đặt combo quà tặng xanh",
    },
    consent:
      "Tôi đồng ý cho LAVIECO xử lý thông tin liên hệ này để phản hồi yêu cầu hợp tác. Chúng tôi chỉ thu thông tin tối thiểu và không thu thông tin cá nhân của học sinh.",
    submit: "Gửi yêu cầu hợp tác",
    submitting: "Đang gửi...",
    errors: {
      name: "Vui lòng nhập họ tên.",
      organization: "Vui lòng nhập đơn vị hoặc tổ chức.",
      phone: "Số điện thoại chưa hợp lệ.",
      interest: "Vui lòng chọn một mục quan tâm.",
      message: "Lời nhắn quá dài (tối đa 1000 ký tự).",
      consent: "Vui lòng đồng ý xử lý dữ liệu để gửi yêu cầu.",
    },
    status: {
      unavailable:
        "Hệ thống tiếp nhận chưa kết nối được nên yêu cầu của bạn chưa được gửi. Vui lòng thử lại sau hoặc liên hệ trực tiếp qua email/điện thoại ở cuối trang.",
      invalid: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường.",
      success: "Cảm ơn bạn. Đội ngũ LAVIECO sẽ liên hệ lại sớm.",
    },
  },
} as const;
