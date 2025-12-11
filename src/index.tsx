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
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center">
                        <i class="fas fa-campground text-purple-600 text-2xl mr-2"></i>
                        <span class="text-2xl font-bold text-gray-900">WildCamp</span>
                    </div>
                    <div class="hidden md:flex space-x-8">
                        <a href="#campsites" class="text-gray-700 hover:text-purple-600 transition">캠핑지 찾기</a>
                        <a href="#map" class="text-gray-700 hover:text-purple-600 transition">지도 보기</a>
                        <a href="#about" class="text-gray-700 hover:text-purple-600 transition">서비스 소개</a>
                        <a href="#contact" class="text-gray-700 hover:text-purple-600 transition">문의하기</a>
                    </div>
                    <button class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
                        <i class="fas fa-user mr-2"></i>로그인
                    </button>
                </div>
            </nav>
        </header>

        <!-- 히어로 섹션 -->
        <section class="hero-gradient text-white py-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 class="text-5xl font-bold mb-6">지도의 끝, 나만의 캠핑을 찾다</h1>
                <p class="text-xl mb-8 opacity-90">전국의 오지·무인도·사유지 캠핑 가능 지역을 한곳에</p>
                <div class="flex justify-center space-x-4">
                    <button onclick="loadCampsites()" class="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                        <i class="fas fa-search mr-2"></i>캠핑지 탐색하기
                    </button>
                    <button onclick="loadMap()" class="bg-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-400 transition">
                        <i class="fas fa-map-marked-alt mr-2"></i>지도에서 찾기
                    </button>
                </div>
            </div>
        </section>

        <!-- 카테고리 -->
        <section class="py-12 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div id="categories" class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <!-- 카테고리 동적 로딩 -->
                </div>
            </div>
        </section>

        <!-- 캠핑지 목록 -->
        <section id="campsites" class="py-16 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-bold text-gray-900">인기 캠핑지</h2>
                    <div class="flex space-x-2">
                        <select id="regionFilter" onchange="filterCampsites()" class="border border-gray-300 rounded-lg px-4 py-2">
                            <option value="">전체 지역</option>
                            <option value="강원">강원</option>
                            <option value="경북">경북</option>
                            <option value="전남">전남</option>
                            <option value="제주">제주</option>
                            <option value="충남">충남</option>
                        </select>
                        <select id="difficultyFilter" onchange="filterCampsites()" class="border border-gray-300 rounded-lg px-4 py-2">
                            <option value="">모든 난이도</option>
                            <option value="easy">쉬움</option>
                            <option value="medium">보통</option>
                            <option value="hard">어려움</option>
                            <option value="extreme">극한</option>
                        </select>
                    </div>
                </div>
                <div id="campsitesList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- 캠핑지 동적 로딩 -->
                </div>
            </div>
        </section>

        <!-- 지도 섹션 -->
        <section id="map" class="py-16 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-3xl font-bold text-gray-900 mb-8">지도에서 캠핑지 찾기</h2>
                <div id="mapContainer" class="h-[600px] bg-gray-200 rounded-lg flex items-center justify-center">
                    <div class="text-center">
                        <i class="fas fa-map-marked-alt text-6xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 text-lg">지도를 불러오는 중...</p>
                        <button onclick="loadMap()" class="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
                            지도 로드하기
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- 서비스 소개 -->
        <section id="about" class="py-16 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">왜 WildCamp인가?</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="bg-white p-8 rounded-lg shadow-sm text-center">
                        <i class="fas fa-island-tropical text-4xl text-purple-600 mb-4"></i>
                        <h3 class="text-xl font-bold mb-3">오지·무인도 전문</h3>
                        <p class="text-gray-600">상업 캠핑장이 아닌, 진짜 자연 그대로의 프라이빗 공간</p>
                    </div>
                    <div class="bg-white p-8 rounded-lg shadow-sm text-center">
                        <i class="fas fa-shield-alt text-4xl text-purple-600 mb-4"></i>
                        <h3 class="text-xl font-bold mb-3">안전 보장 시스템</h3>
                        <p class="text-gray-600">SOS 알림, 위치 공유, 보험 자동 가입으로 안전한 캠핑</p>
                    </div>
                    <div class="bg-white p-8 rounded-lg shadow-sm text-center">
                        <i class="fas fa-handshake text-4xl text-purple-600 mb-4"></i>
                        <h3 class="text-xl font-bold mb-3">호스트 직접 연결</h3>
                        <p class="text-gray-600">토지·도서 소유주와 직접 연결되어 합리적인 가격</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 푸터 -->
        <footer class="bg-gray-900 text-white py-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <div class="flex items-center mb-4">
                            <i class="fas fa-campground text-2xl mr-2"></i>
                            <span class="text-xl font-bold">WildCamp</span>
                        </div>
                        <p class="text-gray-400">전국 오지·캠핑·무인도 전문<br/>O2O 중개 플랫폼</p>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">서비스</h4>
                        <ul class="space-y-2 text-gray-400">
                            <li><a href="#" class="hover:text-white">캠핑지 찾기</a></li>
                            <li><a href="#" class="hover:text-white">호스트 등록</a></li>
                            <li><a href="#" class="hover:text-white">예약 관리</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">고객지원</h4>
                        <ul class="space-y-2 text-gray-400">
                            <li><a href="#" class="hover:text-white">FAQ</a></li>
                            <li><a href="#" class="hover:text-white">이용약관</a></li>
                            <li><a href="#" class="hover:text-white">개인정보처리방침</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold mb-4">문의</h4>
                        <ul class="space-y-2 text-gray-400">
                            <li><i class="fas fa-envelope mr-2"></i>info@wildcamp.kr</li>
                            <li><i class="fas fa-phone mr-2"></i>1588-1234</li>
                            <li><i class="fas fa-map-marker-alt mr-2"></i>서울시 강남구</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                    <p>&copy; 2025 WildCamp. All rights reserved.</p>
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
