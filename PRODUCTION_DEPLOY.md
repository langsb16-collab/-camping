# WildCamp - Cloudflare Pages 프로덕션 배포 가이드

## 🚀 1단계: Cloudflare Pages 배포

### A. Cloudflare 로그인
```bash
# 터미널에서 실행 (브라우저 인증 팝업)
npx wrangler login
```

### B. D1 프로덕션 데이터베이스 생성
```bash
# 프로덕션 D1 데이터베이스 생성
npx wrangler d1 create webapp-production

# 출력 예시:
# ✅ Successfully created DB 'webapp-production'!
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "webapp-production"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**중요**: `database_id`를 복사하세요!

### C. wrangler.jsonc 업데이트
복사한 `database_id`를 `wrangler.jsonc` 파일에 입력:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp",
  "compatibility_date": "2025-12-11",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "여기에-복사한-database-id-입력"
    }
  ]
}
```

### D. 프로덕션 DB 마이그레이션
```bash
# 로컬이 아닌 프로덕션 DB에 마이그레이션 적용
npx wrangler d1 migrations apply webapp-production

# 확인 메시지가 나오면 'yes' 입력
```

### E. 프로덕션 DB에 데이터 삽입
```bash
# 프로덕션 DB에 샘플 데이터 삽입
npx wrangler d1 execute webapp-production --file=./seed.sql

# 확인 메시지가 나오면 'yes' 입력
```

### F. 빌드
```bash
npm run build
```

### G. Pages 프로젝트 생성 및 배포
```bash
# Pages 프로젝트 생성
npx wrangler pages project create webapp --production-branch main

# 배포
npx wrangler pages deploy dist --project-name webapp
```

### H. 배포 완료! 🎉

배포 완료 후 다음과 같은 URL을 받게 됩니다:

```
✨ Success! Uploaded 2 files (3.45 sec)

✨ Deployment complete! Take a peek over at
   https://xxxxxxxx.webapp.pages.dev
   https://webapp.pages.dev
```

**이 URL을 복사하세요! DNS 설정에 필요합니다.**

---

## 🌐 2단계: www.feezone.store DNS 설정

### Cloudflare Dashboard에서 DNS 설정

#### 방법 1: 자동 설정 (가장 쉬움)

1. **Cloudflare Dashboard** 접속
2. **Workers & Pages** 메뉴 선택
3. **webapp** 프로젝트 클릭
4. **Custom domains** 탭 선택
5. **Set up a custom domain** 버튼 클릭
6. 도메인 입력:
   ```
   www.feezone.store
   ```
7. **Continue** 클릭
8. **Activate domain** 클릭

✅ Cloudflare가 자동으로 DNS 레코드를 추가합니다!

#### 방법 2: 수동 DNS 레코드 추가

1. **Cloudflare Dashboard** 접속
2. **도메인 선택**: feezone.store
3. **DNS** 탭 클릭
4. **Add record** 버튼 클릭

**레코드 1: www 서브도메인**
```
Type: CNAME
Name: www
Target: webapp.pages.dev
Proxy status: Proxied (🟠 주황색 구름)
TTL: Auto
```

**레코드 2: 루트 도메인 (선택사항)**
```
Type: CNAME
Name: @
Target: webapp.pages.dev
Proxy status: Proxied (🟠 주황색 구름)
TTL: Auto
```

5. **Save** 클릭

---

## 📋 완성된 DNS 레코드 예시

설정 완료 후 다음과 같이 보여야 합니다:

| Type  | Name | Content            | Proxy status | TTL  |
|-------|------|--------------------|--------------|------|
| CNAME | www  | webapp.pages.dev   | Proxied 🟠   | Auto |
| CNAME | @    | webapp.pages.dev   | Proxied 🟠   | Auto |

---

## 🔒 3단계: SSL/TLS 설정

1. **Cloudflare Dashboard** → **SSL/TLS** 메뉴
2. **암호화 모드**: **Full (strict)** 선택
3. **Edge Certificates** 탭
4. **Always Use HTTPS**: 활성화 (ON)

---

## ✅ 4단계: 배포 확인

### DNS 전파 확인 (5~30분)
```bash
# 터미널에서 실행
nslookup www.feezone.store

# 또는
dig www.feezone.store
```

### 웹사이트 접속
```
https://www.feezone.store
https://feezone.store (루트 도메인 설정 시)
```

---

## 🎯 최종 체크리스트

- [ ] Cloudflare 로그인 완료
- [ ] D1 프로덕션 데이터베이스 생성
- [ ] wrangler.jsonc에 database_id 업데이트
- [ ] 프로덕션 DB 마이그레이션 완료
- [ ] 프로덕션 DB 데이터 삽입 완료
- [ ] 빌드 완료
- [ ] Cloudflare Pages 배포 완료
- [ ] DNS 레코드 추가 (www)
- [ ] DNS 레코드 추가 (루트 도메인 - 선택)
- [ ] SSL/TLS 설정 완료
- [ ] https://www.feezone.store 접속 확인

---

## 🔧 빠른 배포 명령어 (한번에)

```bash
# 1. Cloudflare 로그인
npx wrangler login

# 2. D1 데이터베이스 생성 (database_id 복사 필수!)
npx wrangler d1 create webapp-production

# 3. wrangler.jsonc에 database_id 업데이트 후...

# 4. 프로덕션 DB 설정
npx wrangler d1 migrations apply webapp-production
npx wrangler d1 execute webapp-production --file=./seed.sql

# 5. 빌드 및 배포
npm run build
npx wrangler pages project create webapp --production-branch main
npx wrangler pages deploy dist --project-name webapp

# 6. Cloudflare Dashboard에서 커스텀 도메인 추가
#    → Workers & Pages → webapp → Custom domains → www.feezone.store
```

---

## 🌟 완료!

모든 설정이 완료되면:
- ✅ https://www.feezone.store 에서 WildCamp 접속 가능
- ✅ 자동 HTTPS (Cloudflare SSL)
- ✅ CDN 가속 (전 세계 빠른 속도)
- ✅ DDoS 보호
- ✅ 프로덕션 D1 데이터베이스 연동

---

## 📞 문제 해결

### "database_id가 없습니다" 오류
→ `npx wrangler d1 create webapp-production` 실행 후 database_id 복사

### "DNS_PROBE_FINISHED_NXDOMAIN" 오류
→ DNS 전파 대기 (최대 24시간, 보통 10-30분)

### "ERR_TOO_MANY_REDIRECTS" 오류
→ SSL/TLS 모드를 "Full (strict)"로 변경

### 배포 시 인증 오류
→ `npx wrangler login` 다시 실행

---

**🎊 WildCamp를 www.feezone.store 도메인으로 배포 성공!**
