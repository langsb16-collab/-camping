-- 카테고리 데이터
INSERT OR IGNORE INTO categories (id, name, description) VALUES 
  (1, '오지 캠핑', '인적이 드문 오지 지역 캠핑장'),
  (2, '무인도 캠핑', '섬 및 무인도 프라이빗 캠핑'),
  (3, '사유지 캠핑', '개인 소유 토지 캠핑'),
  (4, '산림 캠핑', '산림 및 계곡 캠핑'),
  (5, '해변 캠핑', '해변가 오지 캠핑');

-- 호스트 데이터
INSERT OR IGNORE INTO hosts (id, email, name, phone, description, verified) VALUES 
  (1, 'host1@wildcamp.kr', '김철수', '010-1234-5678', '전남 신안군 무인도 소유주. 안전하고 깨끗한 캠핑 환경 제공', 1),
  (2, 'host2@wildcamp.kr', '이영희', '010-2345-6789', '강원도 오지 사유지 보유. 차박 가능 평평한 부지', 1),
  (3, 'host3@wildcamp.kr', '박민수', '010-3456-7890', '경북 울진 해안가 사유지. 낚시와 캠핑을 동시에', 1);

-- 캠핑지 데이터 (GPS 좌표 포함)
INSERT OR IGNORE INTO campsites (
  id, host_id, category_id, name, description, 
  address, latitude, longitude, region,
  max_capacity, car_accessible, water_available, electricity_available, toilet_available,
  difficulty_level, wildlife_risk, 
  price_per_night, price_per_hour,
  pet_allowed, fire_allowed, smoking_allowed,
  status, views, rating, review_count
) VALUES 
  -- 전남 신안 무인도
  (1, 1, 2, '신안 비금도 오지 캠핑장', 
   '전남 신안군의 프라이빗 무인도 캠핑장입니다. 보트로 15분 거리에 위치하며, 완벽한 프라이버시와 별빛을 경험할 수 있습니다.',
   '전라남도 신안군 비금면 무인도', 34.8145, 126.0127, '전남',
   10, 0, 0, 0, 0,
   'extreme', 'medium',
   80000, NULL,
   0, 1, 0,
   'active', 1247, 4.8, 23),
   
  -- 강원 양양 오지
  (2, 2, 1, '양양 오색 오지 캠핑장',
   '강원도 양양 설악산 자락의 숨겨진 오지 캠핑장입니다. 계곡물 소리를 들으며 힐링할 수 있는 최고의 장소입니다.',
   '강원도 양양군 서면 오색리 산42', 38.1456, 128.4789, '강원',
   15, 1, 1, 0, 1,
   'hard', 'medium',
   50000, 15000,
   1, 1, 1,
   'active', 2341, 4.6, 45),
   
  -- 경북 울진 해변
  (3, 3, 5, '울진 후포 프라이빗 해변',
   '경북 울진의 사유지 해변 캠핑장입니다. 낚시와 캠핑을 동시에 즐길 수 있으며, 일출이 아름답습니다.',
   '경상북도 울진군 후포면 후포리 산128', 36.9234, 129.4156, '경북',
   20, 1, 1, 1, 1,
   'medium', 'low',
   60000, 20000,
   1, 1, 1,
   'active', 3421, 4.9, 67),
   
  -- 제주 오지
  (4, 1, 1, '제주 추자도 비밀 캠핑장',
   '제주 추자도의 숨겨진 오지 캠핑장입니다. 360도 바다 전망과 함께 특별한 추억을 만들어보세요.',
   '제주특별자치도 제주시 추자면 대서리', 33.9612, 126.3001, '제주',
   8, 0, 0, 0, 0,
   'extreme', 'low',
   90000, NULL,
   0, 1, 0,
   'active', 892, 4.7, 18),
   
  -- 충남 태안
  (5, 2, 3, '태안 안면도 사유지 캠핑',
   '충남 태안 안면도의 조용한 사유지 캠핑장입니다. 차박 가능하며 가족 단위 캠핑에 최적화되어 있습니다.',
   '충청남도 태안군 안면읍 승언리 산67', 36.5789, 126.3456, '충남',
   25, 1, 1, 1, 1,
   'easy', 'low',
   40000, 12000,
   1, 1, 1,
   'active', 4521, 4.5, 89);

-- 캠핑지 이미지
INSERT OR IGNORE INTO campsite_images (campsite_id, image_url, is_primary, display_order) VALUES 
  (1, 'https://picsum.photos/800/600?random=1', 1, 1),
  (1, 'https://picsum.photos/800/600?random=2', 0, 2),
  (2, 'https://picsum.photos/800/600?random=3', 1, 1),
  (2, 'https://picsum.photos/800/600?random=4', 0, 2),
  (3, 'https://picsum.photos/800/600?random=5', 1, 1),
  (3, 'https://picsum.photos/800/600?random=6', 0, 2),
  (4, 'https://picsum.photos/800/600?random=7', 1, 1),
  (5, 'https://picsum.photos/800/600?random=8', 1, 1);

-- 예약 데이터 (샘플)
INSERT OR IGNORE INTO bookings (
  id, campsite_id, user_name, user_email, user_phone,
  check_in_date, check_out_date, guests,
  total_price, payment_status, payment_method, booking_status
) VALUES 
  (1, 3, '홍길동', 'hong@example.com', '010-1111-2222', '2025-12-20', '2025-12-21', 4, 60000, 'confirmed', 'card', 'confirmed'),
  (2, 2, '김영수', 'kim@example.com', '010-3333-4444', '2025-12-22', '2025-12-23', 2, 50000, 'confirmed', 'transfer', 'confirmed');

-- 리뷰 데이터
INSERT OR IGNORE INTO reviews (
  campsite_id, booking_id, user_name, rating, comment,
  cleanliness_rating, location_rating, safety_rating
) VALUES 
  (3, 1, '홍길동', 5, '정말 최고의 캠핑 경험이었습니다! 바다 소리 들으며 하루를 보내니 힐링이 되었어요.', 5, 5, 5),
  (2, 2, '김영수', 5, '오지 캠핑의 진수를 느꼈습니다. 계곡물 소리가 너무 좋았어요.', 4, 5, 5);
