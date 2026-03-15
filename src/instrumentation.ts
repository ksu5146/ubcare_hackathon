/**
 * Next.js Instrumentation — 서버 프로세스 시작 시 실행.
 * next.config.ts는 CLI 부모 프로세스에서 실행되지만,
 * route handler는 별도 자식 프로세스(start-server.js)에서 실행되므로
 * 환경변수가 전파되지 않는다. instrumentation.ts는 서버 프로세스 내에서
 * 직접 실행되므로 여기서 설정해야 한다.
 */
export function register() {
  // Node.js v24+에서 ODsay 등 외부 API의 TLS 인증서 검증 실패 방지 (개발용)
  if (process.env.NODE_ENV === 'development' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
}
