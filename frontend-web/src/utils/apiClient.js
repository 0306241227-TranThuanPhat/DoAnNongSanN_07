import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 12000,
});

// Tự động đính kèm token nếu có
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor bắt lỗi Session / Token hết hạn (401 Unauthorized hoặc 419 CSRF Expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 419) {
      window.dispatchEvent(
        new CustomEvent('session-expired', {
          detail: {
            code: status,
            message:
              status === 419
                ? 'Phiên làm việc (CSRF Token) đã hết hạn do mở tab quá lâu.'
                : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục thao tác!',
          },
        })
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;