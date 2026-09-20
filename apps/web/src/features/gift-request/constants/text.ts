export const TEXT = {
  vi: {
    fields: {
      name: { label: "Họ & tên *", placeholder: "Nguyễn Văn A" },
      phone: { label: "Số điện thoại / Zalo *", placeholder: "0901 234 567" },
      interest: { label: "Bạn quan tâm điều gì? *" },
    },
    interests: {
      gift: "Chọn vật phẩm minh chứng làm quà",
      workshop: "Workshop cuối tuần tại Cần Thơ",
      "handbook-updates": "Nhận tin về Cẩm nang xanh số",
    },
    consent: "Tôi đồng ý cho LAVIECO xử lý thông tin liên hệ này để phản hồi yêu cầu của tôi.",
    submit: "Gửi lời nhắn",
    submitting: "Đang gửi...",
    errors: {
      name: "Vui lòng nhập họ tên.",
      phone: "Số điện thoại chưa hợp lệ.",
      interest: "Vui lòng chọn một mục quan tâm.",
      consent: "Vui lòng đồng ý xử lý dữ liệu để gửi yêu cầu.",
    },
    status: {
      unavailable:
        "Hệ thống tiếp nhận chưa kết nối được nên lời nhắn của bạn chưa được gửi. Vui lòng thử lại sau hoặc liên hệ trực tiếp qua email/điện thoại ở cuối trang.",
      invalid: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường.",
      success: "Cảm ơn bạn. Đội ngũ LAVIECO sẽ liên hệ lại sớm.",
    },
  },
} as const;
