# Cloudflare Pages 커스텀 도메인 설정 가이드

## 1단계: Cloudflare Pages 배포

### 프로덕션 배포
```bash
# Cloudflare 로그인 (브라우저에서 인증)
npx wrangler login

# D1 데이터베이스 생성
npx wrangler d1 create webapp-production

# 출력된 database_id를 복사하여 wrangler.jsonc에 업데이트

# 빌드
npm run build

# Pages 프로젝트 생성
npx wrangler pages project create webapp --production-branch main

# 배포
npx wrangler pages deploy dist --project-name webapp
```

배포 후 받게 될 URL 예시:
- `https://webapp.pages.dev`
- `https://main.webapp.pages.dev`

## 2단계: Cloudflare Dashboard에서 커스텀 도메인 추가

### Pages 대시보드에서:
1. Cloudflare Dashboard 로그인
2. **Workers & Pages** 선택
3. **webapp** 프로젝트 클릭
4. **Custom domains** 탭 선택
5. **Set up a custom domain** 클릭
6. 도메인 입력:
   - `www.feezone.store`
   - `feezone.store` (선택사항)
7. **Continue** → **Activate domain**

## 3단계: DNS 레코드 설정

### Cloudflare DNS 관리 페이지에서:

#### Option 1: 자동 설정 (권장)
- Cloudflare가 자동으로 DNS 레코드를 추가합니다
- "Add DNS record automatically" 선택

#### Option 2: 수동 설정
페이지에서 "Add record" 버튼 클릭 후:

**레코드 1: www 서브도메인**
```
Type: CNAME
Name: www
Target: webapp.pages.dev
Proxy status: Proxied (🟠 주황색)
TTL: Auto
```

**레코드 2: 루트 도메인 (선택사항)**
```
Type: CNAME
Name: @
Target: webapp.pages.dev
Proxy status: Proxied (🟠 주황색)
TTL: Auto
```

## 4단계: SSL/TLS 설정

1. Cloudflare Dashboard → **SSL/TLS**
2. 암호화 모드: **Full (strict)** 선택 (권장)
3. **Edge Certificates** → **Always Use HTTPS** 활성화

## 5단계: 배포 확인

### DNS 전파 확인 (최대 24시간)
```bash
# DNS 조회
nslookup www.feezone.store

# 또는
dig www.feezone.store
```

### 웹사이트 접속
- https://www.feezone.store
- https://feezone.store (루트 도메인 설정 시)

## 주의사항

### 🔒 HTTPS 필수
- Cloudflare Pages는 자동으로 HTTPS를 제공합니다
- HTTP → HTTPS 자동 리다이렉트 설정 권장

### 🌐 DNS 전파 시간
- 일반적으로 몇 분~몇 시간
- 최대 24-48시간까지 소요 가능

### 📊 성능 최적화
- Proxy status를 "Proxied"로 설정하면:
  - Cloudflare CDN 활용
  - DDoS 보호
  - 자동 SSL 인증서
  - 캐싱 최적화

## 트러블슈팅

### DNS 레코드가 보이지 않는 경우
1. Cloudflare Dashboard 새로고침
2. DNS 전파 대기 (5-10분)
3. 브라우저 캐시 삭제

### 연결 오류
1. SSL/TLS 모드 확인
2. Pages 프로젝트 배포 상태 확인
3. DNS 레코드 Type 확인 (CNAME)

### 무한 리다이렉트
1. SSL/TLS 모드를 "Full (strict)"로 변경
2. "Always Use HTTPS" 설정 확인
