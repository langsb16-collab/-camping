import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// API Routes - 캠핑지 (Campsites)
// ============================================

// 캠핑지 목록 조회 (필터링 지원)
app.get('/api/campsites', async (c) => {
  const { env } = c
  const { 
    category, 
    region, 
    difficulty, 
    min_price, 
    max_price,
    car_accessible,
    water_available,
    electricity_available,
    pet_allowed 
  } = c.req.query()

  let query = `
    SELECT 
      c.*,
      cat.name as category_name,
      h.name as host_name,
      h.phone as host_phone,
      (SELECT image_url FROM campsite_images WHERE campsite_id = c.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM campsites c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN hosts h ON c.host_id = h.id
    WHERE c.status = 'active'
  `

  const params: any[] = []

  if (category) {
    query += ` AND c.category_id = ?`
    params.push(category)
  }

  if (region) {
    query += ` AND c.region = ?`
    params.push(region)
  }

  if (difficulty) {
    query += ` AND c.difficulty_level = ?`
    params.push(difficulty)
  }

  if (min_price) {
    query += ` AND c.price_per_night >= ?`
    params.push(min_price)
  }

  if (max_price) {
    query += ` AND c.price_per_night <= ?`
    params.push(max_price)
  }

  if (car_accessible) {
    query += ` AND c.car_accessible = 1`
  }

  if (water_available) {
    query += ` AND c.water_available = 1`
  }

  if (electricity_available) {
    query += ` AND c.electricity_available = 1`
  }

  if (pet_allowed) {
    query += ` AND c.pet_allowed = 1`
  }

  query += ` ORDER BY c.rating DESC, c.views DESC`

  const stmt = env.DB.prepare(query)
  const { results } = await stmt.bind(...params).all()

  return c.json({
    success: true,
    data: results,
    count: results?.length || 0
  })
})

// 캠핑지 상세 조회
app.get('/api/campsites/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')

  // 조회수 증가
  await env.DB.prepare(`
    UPDATE campsites SET views = views + 1 WHERE id = ?
  `).bind(id).run()

  // 캠핑지 정보
  const campsite = await env.DB.prepare(`
    SELECT 
      c.*,
      cat.name as category_name,
      cat.description as category_description,
      h.name as host_name,
      h.email as host_email,
      h.phone as host_phone,
      h.description as host_description,
      h.profile_image as host_profile_image
    FROM campsites c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN hosts h ON c.host_id = h.id
    WHERE c.id = ? AND c.status = 'active'
  `).bind(id).first()

  if (!campsite) {
    return c.json({ success: false, message: '캠핑지를 찾을 수 없습니다.' }, 404)
  }

  // 이미지 목록
  const { results: images } = await env.DB.prepare(`
    SELECT * FROM campsite_images WHERE campsite_id = ? ORDER BY display_order
  `).bind(id).all()

  // 리뷰 목록
  const { results: reviews } = await env.DB.prepare(`
    SELECT * FROM reviews WHERE campsite_id = ? ORDER BY created_at DESC LIMIT 10
  `).bind(id).all()

  return c.json({
    success: true,
    data: {
      ...campsite,
      images,
      reviews
    }
  })
})

// 지역별 캠핑지 조회 (지도용)
app.get('/api/campsites/map/all', async (c) => {
  const { env } = c

  const { results } = await env.DB.prepare(`
    SELECT 
      c.id,
      c.name,
      c.latitude,
      c.longitude,
      c.price_per_night,
      c.rating,
      c.category_id,
      cat.name as category_name,
      (SELECT image_url FROM campsite_images WHERE campsite_id = c.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM campsites c
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.status = 'active'
  `).all()

  return c.json({
    success: true,
    data: results
  })
})

// ============================================
// API Routes - 예약 (Bookings)
// ============================================

// 예약 생성
app.post('/api/bookings', async (c) => {
  const { env } = c
  const body = await c.req.json()

  const {
    campsite_id,
    user_name,
    user_email,
    user_phone,
    check_in_date,
    check_out_date,
    guests,
    has_pet,
    special_requests
  } = body

  // 캠핑지 정보 확인
  const campsite = await env.DB.prepare(`
    SELECT * FROM campsites WHERE id = ? AND status = 'active'
  `).bind(campsite_id).first()

  if (!campsite) {
    return c.json({ success: false, message: '캠핑지를 찾을 수 없습니다.' }, 404)
  }

  // 날짜 계산
  const checkIn = new Date(check_in_date)
  const checkOut = new Date(check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const total_price = (campsite as any).price_per_night * nights

  // 예약 생성
  const result = await env.DB.prepare(`
    INSERT INTO bookings (
      campsite_id, user_name, user_email, user_phone,
      check_in_date, check_out_date, guests, total_price,
      has_pet, special_requests,
      payment_status, booking_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
  `).bind(
    campsite_id, user_name, user_email, user_phone,
    check_in_date, check_out_date, guests, total_price,
    has_pet ? 1 : 0, special_requests || ''
  ).run()

  return c.json({
    success: true,
    message: '예약이 성공적으로 생성되었습니다.',
    data: {
      booking_id: result.meta.last_row_id,
      total_price,
      nights
    }
  })
})

// 예약 조회
app.get('/api/bookings/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')

  const booking = await env.DB.prepare(`
    SELECT 
      b.*,
      c.name as campsite_name,
      c.address as campsite_address,
      c.latitude as campsite_latitude,
      c.longitude as campsite_longitude
    FROM bookings b
    LEFT JOIN campsites c ON b.campsite_id = c.id
    WHERE b.id = ?
  `).bind(id).first()

  if (!booking) {
    return c.json({ success: false, message: '예약을 찾을 수 없습니다.' }, 404)
  }

  return c.json({
    success: true,
    data: booking
  })
})

// ============================================
// API Routes - 카테고리 (Categories)
// ============================================

app.get('/api/categories', async (c) => {
  const { env } = c

  const { results } = await env.DB.prepare(`
    SELECT 
      cat.*,
      COUNT(c.id) as campsite_count
    FROM categories cat
    LEFT JOIN campsites c ON cat.id = c.category_id AND c.status = 'active'
    GROUP BY cat.id
  `).all()

  return c.json({
    success: true,
    data: results
  })
})

// ============================================
// API Routes - 호스트 (Hosts)
// ============================================

app.get('/api/hosts/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')

  const host = await env.DB.prepare(`
    SELECT * FROM hosts WHERE id = ?
  `).bind(id).first()

  if (!host) {
    return c.json({ success: false, message: '호스트를 찾을 수 없습니다.' }, 404)
  }

  // 호스트의 캠핑지 목록
  const { results: campsites } = await env.DB.prepare(`
    SELECT 
      c.*,
      (SELECT image_url FROM campsite_images WHERE campsite_id = c.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM campsites c
    WHERE c.host_id = ? AND c.status = 'active'
    ORDER BY c.rating DESC
  `).bind(id).all()

  return c.json({
    success: true,
    data: {
      ...host,
      campsites
    }
  })
})

// ============================================
// API Routes - 리뷰 (Reviews)
// ============================================

app.post('/api/reviews', async (c) => {
  const { env } = c
  const body = await c.req.json()

  const {
    campsite_id,
    booking_id,
    user_name,
    rating,
    comment,
    cleanliness_rating,
    location_rating,
    safety_rating
  } = body

  // 리뷰 생성
  await env.DB.prepare(`
    INSERT INTO reviews (
      campsite_id, booking_id, user_name, rating, comment,
      cleanliness_rating, location_rating, safety_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    campsite_id, booking_id, user_name, rating, comment,
    cleanliness_rating, location_rating, safety_rating
  ).run()

  // 캠핑지 평점 업데이트
  await env.DB.prepare(`
    UPDATE campsites 
    SET rating = (SELECT AVG(rating) FROM reviews WHERE campsite_id = ?),
        review_count = (SELECT COUNT(*) FROM reviews WHERE campsite_id = ?)
    WHERE id = ?
  `).bind(campsite_id, campsite_id, campsite_id).run()

  return c.json({
    success: true,
    message: '리뷰가 성공적으로 등록되었습니다.'
  })
})

// ============================================
// API Routes - SOS 알림
// ============================================

app.post('/api/sos', async (c) => {
  const { env } = c
  const body = await c.req.json()

  const {
    booking_id,
    user_name,
    user_phone,
    latitude,
    longitude,
    message
  } = body

  const result = await env.DB.prepare(`
    INSERT INTO sos_alerts (
      booking_id, user_name, user_phone, latitude, longitude, message, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).bind(booking_id, user_name, user_phone, latitude, longitude, message || '').run()

  return c.json({
    success: true,
    message: 'SOS 알림이 전송되었습니다.',
    data: {
      alert_id: result.meta.last_row_id
    }
  })
})

// ============================================
// 메인 페이지
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WildCamp - 전국 오지·캠핑·무인도 전문 O2O 중개 플랫폼</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .hero-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card-hover:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          }
          /* 모바일 최적화 - 70% 이상 축소 */
          @media (max-width: 768px) {
            body { font-size: 12px; }
            h1 { font-size: 1.1rem !important; line-height: 1.25 !important; }
            h2 { font-size: 1rem !important; }
            h3 { font-size: 0.95rem !important; }
            p { font-size: 0.75rem !important; line-height: 1.3 !important; }
            .btn-text { font-size: 0.75rem !important; }
            .hero-tagline { font-size: 0.7rem !important; }
            section { padding-top: 1rem !important; padding-bottom: 1rem !important; }
          }
          /* 다국어 버튼 눈에 띄는 색상 */
          .lang-btn {
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            box-shadow: 0 3px 10px rgba(245, 158, 11, 0.5);
            font-weight: 600;
          }
          .lang-btn:hover {
            background: linear-gradient(135deg, #fb923c 0%, #fb7185 100%);
            transform: scale(1.05);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <nav class="max-w-7xl mx-auto px-2 sm:px-4">
                <div class="flex justify-between h-9 sm:h-12 items-center">
                    <div class="flex items-center">
                        <i class="fas fa-campground text-purple-600 text-xs sm:text-base mr-1"></i>
                        <span class="text-xs sm:text-base font-bold text-gray-900">WildCamp</span>
                    </div>
                    <div class="flex items-center space-x-1.5">
                        <button class="lang-btn text-white px-2 py-1 rounded-md transition text-xs font-bold">
                            <i class="fas fa-language mr-0.5"></i>KO
                        </button>
                        <button class="bg-purple-600 text-white px-2 py-1 rounded-md hover:bg-purple-700 transition text-xs font-medium">
                            <i class="fas fa-sign-in-alt text-xs mr-0.5"></i>로그인
                        </button>
                    </div>
                </div>
            </nav>
        </header>

        <!-- 히어로 섹션 -->
        <section class="hero-gradient text-white py-4 sm:py-8">
            <div class="max-w-7xl mx-auto px-3 text-center">
                <h1 class="text-base sm:text-xl md:text-2xl font-bold mb-1.5 sm:mb-2 leading-tight">지도의 끝, 나만의 캠핑을 찾다</h1>
                <p class="hero-tagline text-xs sm:text-sm mb-0.5 sm:mb-1 opacity-90 leading-tight">주민이 만드는 정책, 지자체가 응답하는 플랫폼</p>
                <p class="hero-tagline text-xs sm:text-sm mb-3 sm:mb-4 opacity-90 leading-tight">실명 기반의 책임 있는 공론장으로 행정 신뢰도를 높입니다</p>
                <div class="flex flex-col sm:flex-row justify-center gap-1.5 sm:gap-2 px-3">
                    <button onclick="loadCampsites()" class="bg-white text-purple-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-medium hover:bg-gray-100 transition text-xs sm:text-sm btn-text">
                        <i class="fas fa-search mr-1 text-xs"></i>탐색
                    </button>
                    <button onclick="loadMap()" class="bg-purple-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-medium hover:bg-purple-400 transition text-xs sm:text-sm btn-text">
                        <i class="fas fa-map-marked-alt mr-1 text-xs"></i>지도
                    </button>
                </div>
            </div>
        </section>

        <!-- 카테고리 -->
        <section class="py-2 sm:py-4 bg-white">
            <div class="max-w-7xl mx-auto px-2 sm:px-4">
                <div id="categories" class="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                    <!-- 카테고리 동적 로딩 -->
                </div>
            </div>
        </section>

        <!-- 캠핑지 목록 -->
        <section id="campsites" class="py-3 sm:py-6 bg-gray-50">
            <div class="max-w-7xl mx-auto px-2 sm:px-4">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-1.5">
                    <h2 class="text-sm sm:text-base md:text-lg font-bold text-gray-900">인기 캠핑지</h2>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <select id="regionFilter" onchange="filterCampsites()" class="border border-gray-300 rounded-md px-2 py-1.5 text-sm flex-1 sm:flex-none">
                            <option value="">전체 지역</option>
                            <option value="강원">강원</option>
                            <option value="경북">경북</option>
                            <option value="전남">전남</option>
                            <option value="제주">제주</option>
                            <option value="충남">충남</option>
                        </select>
                        <select id="difficultyFilter" onchange="filterCampsites()" class="border border-gray-300 rounded-md px-2 py-1.5 text-sm flex-1 sm:flex-none">
                            <option value="">난이도</option>
                            <option value="easy">쉬움</option>
                            <option value="medium">보통</option>
                            <option value="hard">어려움</option>
                            <option value="extreme">극한</option>
                        </select>
                    </div>
                </div>
                <div id="campsitesList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    <!-- 캠핑지 동적 로딩 -->
                </div>
            </div>
        </section>

        <!-- 지도 섹션 -->
        <section id="map" class="py-3 sm:py-6 bg-white">
            <div class="max-w-7xl mx-auto px-2 sm:px-4">
                <h2 class="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-2 sm:mb-4">지도에서 캠핑지 찾기</h2>
                <div id="mapContainer" class="h-[300px] sm:h-[400px] bg-gray-200 rounded-lg flex items-center justify-center">
                    <div class="text-center px-4">
                        <i class="fas fa-map-marked-alt text-4xl sm:text-5xl text-gray-400 mb-3"></i>
                        <p class="text-gray-600 text-sm sm:text-base mb-3">지도를 불러오는 중...</p>
                        <button onclick="loadMap()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                            지도 로드하기
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- 서비스 소개 -->
        <section id="about" class="py-3 sm:py-6 bg-gray-50">
            <div class="max-w-7xl mx-auto px-2 sm:px-4">
                <h2 class="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-2 sm:mb-4 text-center">왜 WildCamp인가?</h2>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm text-center">
                        <i class="fas fa-island-tropical text-lg sm:text-2xl text-purple-600 mb-1.5 sm:mb-2"></i>
                        <h3 class="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5">오지·무인도 전문</h3>
                        <p class="text-xs text-gray-600 leading-tight">진짜 자연 그대로의 프라이빗 공간</p>
                    </div>
                    <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm text-center">
                        <i class="fas fa-shield-alt text-lg sm:text-2xl text-purple-600 mb-1.5 sm:mb-2"></i>
                        <h3 class="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5">안전 보장 시스템</h3>
                        <p class="text-xs text-gray-600 leading-tight">SOS 알림, 위치 공유, 보험 자동 가입</p>
                    </div>
                    <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm text-center">
                        <i class="fas fa-handshake text-lg sm:text-2xl text-purple-600 mb-1.5 sm:mb-2"></i>
                        <h3 class="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5">호스트 직접 연결</h3>
                        <p class="text-xs text-gray-600 leading-tight">토지·도서 소유주와 직접 연결</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 푸터 -->
        <footer class="bg-gray-900 text-white py-4 sm:py-6">
            <div class="max-w-7xl mx-auto px-2 sm:px-4">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div class="col-span-2 sm:col-span-1">
                        <div class="flex items-center mb-1.5 sm:mb-2">
                            <i class="fas fa-campground text-sm sm:text-base mr-1"></i>
                            <span class="text-sm sm:text-base font-bold">WildCamp</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-tight">전국 오지·캠핑·무인도 전문 O2O 중개 플랫폼</p>
                    </div>
                    <div>
                        <h4 class="font-bold mb-1.5 sm:mb-2 text-xs sm:text-sm">서비스</h4>
                        <ul class="space-y-0.5 sm:space-y-1 text-gray-400 text-xs">
                            <li><a href="#" class="hover:text-white">캠핑지 찾기</a></li>
                            <li><a href="#" class="hover:text-white">호스트 등록</a></li>
                            <li><a href="#" class="hover:text-white">예약 관리</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-1.5 sm:mb-2 text-xs sm:text-sm">고객지원</h4>
                        <ul class="space-y-0.5 sm:space-y-1 text-gray-400 text-xs">
                            <li><a href="#" class="hover:text-white">FAQ</a></li>
                            <li><a href="#" class="hover:text-white">이용약관</a></li>
                            <li><a href="#" class="hover:text-white">개인정보</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-1.5 sm:mb-2 text-xs sm:text-sm">문의</h4>
                        <ul class="space-y-0.5 sm:space-y-1 text-gray-400 text-xs">
                            <li><i class="fas fa-envelope mr-1 text-xs"></i>info@wildcamp.kr</li>
                            <li><i class="fas fa-phone mr-1 text-xs"></i>1588-1234</li>
                            <li><i class="fas fa-map-marker-alt mr-1 text-xs"></i>서울 강남</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 mt-3 sm:mt-4 pt-3 sm:pt-4 text-center text-gray-400">
                    <p class="text-xs">&copy; 2025 WildCamp. All rights reserved.</p>
                </div>
            </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
