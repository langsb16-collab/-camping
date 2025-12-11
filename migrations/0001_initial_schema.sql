-- 캠핑지 카테고리 (오지, 무인도, 사유지 등)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 호스트 (토지·도서 소유주)
CREATE TABLE IF NOT EXISTS hosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_number TEXT,
  profile_image TEXT,
  description TEXT,
  verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 캠핑지 정보
CREATE TABLE IF NOT EXISTS campsites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 위치 정보
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  region TEXT,
  
  -- 시설 정보
  max_capacity INTEGER DEFAULT 1,
  car_accessible INTEGER DEFAULT 0,
  water_available INTEGER DEFAULT 0,
  electricity_available INTEGER DEFAULT 0,
  toilet_available INTEGER DEFAULT 0,
  
  -- 위험도 및 난이도
  difficulty_level TEXT CHECK(difficulty_level IN ('easy', 'medium', 'hard', 'extreme')) DEFAULT 'medium',
  wildlife_risk TEXT CHECK(wildlife_risk IN ('low', 'medium', 'high')) DEFAULT 'low',
  
  -- 가격 정보
  price_per_night INTEGER NOT NULL,
  price_per_hour INTEGER,
  
  -- 규정
  pet_allowed INTEGER DEFAULT 0,
  fire_allowed INTEGER DEFAULT 0,
  smoking_allowed INTEGER DEFAULT 0,
  
  -- 상태
  status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  views INTEGER DEFAULT 0,
  rating REAL DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (host_id) REFERENCES hosts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 캠핑지 이미지
CREATE TABLE IF NOT EXISTS campsite_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campsite_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campsite_id) REFERENCES campsites(id)
);

-- 예약 정보
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campsite_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests INTEGER DEFAULT 1,
  
  total_price INTEGER NOT NULL,
  payment_status TEXT CHECK(payment_status IN ('pending', 'confirmed', 'cancelled', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  
  -- 추가 정보
  has_pet INTEGER DEFAULT 0,
  special_requests TEXT,
  
  -- 상태
  booking_status TEXT CHECK(booking_status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')) DEFAULT 'pending',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campsite_id) REFERENCES campsites(id)
);

-- 리뷰
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campsite_id INTEGER NOT NULL,
  booking_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  
  rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  
  -- 세부 평가
  cleanliness_rating INTEGER CHECK(cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  location_rating INTEGER CHECK(location_rating >= 1 AND location_rating <= 5),
  safety_rating INTEGER CHECK(safety_rating >= 1 AND safety_rating <= 5),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campsite_id) REFERENCES campsites(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 긴급 위치 공유 (SOS)
CREATE TABLE IF NOT EXISTS sos_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  message TEXT,
  
  status TEXT CHECK(status IN ('active', 'resolved', 'cancelled')) DEFAULT 'active',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_campsites_host_id ON campsites(host_id);
CREATE INDEX IF NOT EXISTS idx_campsites_category_id ON campsites(category_id);
CREATE INDEX IF NOT EXISTS idx_campsites_location ON campsites(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_campsites_status ON campsites(status);
CREATE INDEX IF NOT EXISTS idx_bookings_campsite_id ON bookings(campsite_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reviews_campsite_id ON reviews(campsite_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);
