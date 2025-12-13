// 전역 변수
let allCampsites = [];
let map = null;
let markers = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadCampsites();
});

// 카테고리 로드
async function loadCategories() {
  try {
    const response = await axios.get('/api/categories');
    const categories = response.data.data;

    const categoryIcons = {
      1: 'mountain',
      2: 'island-tropical',
      3: 'tree',
      4: 'trees',
      5: 'umbrella-beach'
    };

    const categoryColors = {
      1: 'bg-orange-100 text-orange-600',
      2: 'bg-blue-100 text-blue-600',
      3: 'bg-green-100 text-green-600',
      4: 'bg-emerald-100 text-emerald-600',
      5: 'bg-cyan-100 text-cyan-600'
    };

    const categoriesHtml = categories.map(cat => `
      <div class="p-2 sm:p-3 ${categoryColors[cat.id] || 'bg-gray-100 text-gray-600'} rounded-md text-center cursor-pointer hover:shadow-md transition"
           onclick="filterByCategory(${cat.id})">
        <i class="fas fa-${categoryIcons[cat.id] || 'campground'} text-base sm:text-xl mb-1"></i>
        <div class="font-semibold text-xs sm:text-sm">${cat.name}</div>
        <div class="text-xs mt-0.5">${cat.campsite_count}개</div>
      </div>
    `).join('');

    document.getElementById('categories').innerHTML = categoriesHtml;
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
  }
}

// 캠핑지 목록 로드
async function loadCampsites(filters = {}) {
  try {
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(`/api/campsites?${params}`);
    allCampsites = response.data.data;

    displayCampsites(allCampsites);
  } catch (error) {
    console.error('캠핑지 로드 실패:', error);
  }
}

// 캠핑지 표시
function displayCampsites(campsites) {
  const difficultyLabels = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
    extreme: '극한'
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-orange-100 text-orange-700',
    extreme: 'bg-red-100 text-red-700'
  };

  const campsitesHtml = campsites.map(site => `
    <div class="bg-white rounded-md shadow-sm overflow-hidden card-hover transition-all duration-300 cursor-pointer"
         onclick="viewCampsiteDetail(${site.id})">
      <div class="relative">
        <img src="${site.primary_image || 'https://picsum.photos/400/300?random=' + site.id}" 
             alt="${site.name}" 
             class="w-full h-32 sm:h-40 object-cover">
        <div class="absolute top-2 right-2 ${difficultyColors[site.difficulty_level]} px-2 py-0.5 rounded-full text-xs font-semibold">
          ${difficultyLabels[site.difficulty_level]}
        </div>
        <div class="absolute top-2 left-2 bg-white px-2 py-0.5 rounded-full text-xs font-semibold">
          ${site.category_name}
        </div>
      </div>
      <div class="p-2.5 sm:p-3">
        <h3 class="text-sm sm:text-base font-bold text-gray-900 mb-1.5 truncate">${site.name}</h3>
        <div class="flex items-center text-xs text-gray-600 mb-1.5">
          <i class="fas fa-map-marker-alt mr-0.5 text-xs"></i>
          <span class="truncate">${site.region}</span>
          <span class="mx-1">·</span>
          <i class="fas fa-eye mr-0.5 text-xs"></i>
          <span>${site.views}</span>
        </div>
        <div class="flex items-center mb-2">
          <div class="flex items-center text-yellow-500 text-xs">
            <i class="fas fa-star mr-0.5 text-xs"></i>
            <span class="font-semibold">${site.rating.toFixed(1)}</span>
          </div>
          <span class="text-gray-500 text-xs ml-1">(${site.review_count})</span>
        </div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-purple-600 font-bold text-sm sm:text-base">
            ${site.price_per_night.toLocaleString()}원
            <span class="text-xs text-gray-500 font-normal">/박</span>
          </div>
          <button class="bg-purple-600 text-white px-2 py-1 rounded-md hover:bg-purple-700 transition text-xs">
            예약
          </button>
        </div>
        <div class="flex flex-wrap gap-1">
          ${site.car_accessible ? '<span class="text-xs bg-gray-100 px-2 py-1 rounded"><i class="fas fa-car mr-1"></i>차량진입</span>' : ''}
          ${site.water_available ? '<span class="text-xs bg-gray-100 px-2 py-1 rounded"><i class="fas fa-water mr-1"></i>물</span>' : ''}
          ${site.electricity_available ? '<span class="text-xs bg-gray-100 px-2 py-1 rounded"><i class="fas fa-bolt mr-1"></i>전기</span>' : ''}
          ${site.pet_allowed ? '<span class="text-xs bg-gray-100 px-2 py-1 rounded"><i class="fas fa-paw mr-1"></i>반려동물</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('campsitesList').innerHTML = campsitesHtml || `
    <div class="col-span-full text-center py-12 text-gray-500">
      <i class="fas fa-search text-4xl mb-4"></i>
      <p>검색 결과가 없습니다.</p>
    </div>
  `;
}

// 카테고리별 필터링
function filterByCategory(categoryId) {
  loadCampsites({ category: categoryId });
  document.getElementById('campsites').scrollIntoView({ behavior: 'smooth' });
}

// 필터링
function filterCampsites() {
  const region = document.getElementById('regionFilter').value;
  const difficulty = document.getElementById('difficultyFilter').value;

  const filters = {};
  if (region) filters.region = region;
  if (difficulty) filters.difficulty = difficulty;

  loadCampsites(filters);
}

// 캠핑지 상세보기
async function viewCampsiteDetail(id) {
  try {
    const response = await axios.get(`/api/campsites/${id}`);
    const campsite = response.data.data;

    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    const difficultyLabels = {
      easy: '쉬움',
      medium: '보통',
      hard: '어려움',
      extreme: '극한'
    };

    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="relative">
          <img src="${campsite.images[0]?.image_url || 'https://picsum.photos/800/400?random=' + id}" 
               class="w-full h-80 object-cover">
          <button onclick="this.closest('.fixed').remove()" 
                  class="absolute top-4 right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-8">
          <div class="mb-6">
            <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
              ${campsite.category_name}
            </span>
          </div>
          
          <h2 class="text-3xl font-bold mb-4">${campsite.name}</h2>
          
          <div class="flex items-center mb-6">
            <div class="flex items-center text-yellow-500 mr-4">
              <i class="fas fa-star mr-1"></i>
              <span class="font-semibold">${campsite.rating.toFixed(1)}</span>
              <span class="text-gray-500 ml-1">(${campsite.review_count}개 리뷰)</span>
            </div>
            <div class="text-gray-600">
              <i class="fas fa-eye mr-1"></i>
              <span>${campsite.views}회</span>
            </div>
          </div>

          <div class="bg-gray-50 p-6 rounded-lg mb-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <i class="fas fa-users text-2xl text-purple-600 mb-2"></i>
                <div class="text-sm text-gray-600">최대 인원</div>
                <div class="font-semibold">${campsite.max_capacity}명</div>
              </div>
              <div class="text-center">
                <i class="fas fa-signal text-2xl text-purple-600 mb-2"></i>
                <div class="text-sm text-gray-600">난이도</div>
                <div class="font-semibold">${difficultyLabels[campsite.difficulty_level]}</div>
              </div>
              <div class="text-center">
                <i class="fas fa-won-sign text-2xl text-purple-600 mb-2"></i>
                <div class="text-sm text-gray-600">1박 가격</div>
                <div class="font-semibold">${campsite.price_per_night.toLocaleString()}원</div>
              </div>
              ${campsite.price_per_hour ? `
              <div class="text-center">
                <i class="fas fa-clock text-2xl text-purple-600 mb-2"></i>
                <div class="text-sm text-gray-600">시간당</div>
                <div class="font-semibold">${campsite.price_per_hour.toLocaleString()}원</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-xl font-bold mb-3">캠핑지 설명</h3>
            <p class="text-gray-700 leading-relaxed">${campsite.description || '상세 설명이 없습니다.'}</p>
          </div>

          <div class="mb-6">
            <h3 class="text-xl font-bold mb-3">위치</h3>
            <div class="flex items-center text-gray-700 mb-2">
              <i class="fas fa-map-marker-alt mr-2 text-purple-600"></i>
              <span>${campsite.address}</span>
            </div>
            <div class="text-sm text-gray-600">
              GPS: ${campsite.latitude}, ${campsite.longitude}
            </div>
            <div class="mt-4 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <button onclick="showMapForCampsite(${campsite.latitude}, ${campsite.longitude})" 
                      class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                <i class="fas fa-map mr-2"></i>지도에서 위치 보기
              </button>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-xl font-bold mb-3">편의시설</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="flex items-center ${campsite.car_accessible ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.car_accessible ? 'check' : 'times'}-circle mr-2"></i>
                <span>차량 진입</span>
              </div>
              <div class="flex items-center ${campsite.water_available ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.water_available ? 'check' : 'times'}-circle mr-2"></i>
                <span>물 공급</span>
              </div>
              <div class="flex items-center ${campsite.electricity_available ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.electricity_available ? 'check' : 'times'}-circle mr-2"></i>
                <span>전기 공급</span>
              </div>
              <div class="flex items-center ${campsite.toilet_available ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.toilet_available ? 'check' : 'times'}-circle mr-2"></i>
                <span>화장실</span>
              </div>
              <div class="flex items-center ${campsite.pet_allowed ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.pet_allowed ? 'check' : 'times'}-circle mr-2"></i>
                <span>반려동물</span>
              </div>
              <div class="flex items-center ${campsite.fire_allowed ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.fire_allowed ? 'check' : 'times'}-circle mr-2"></i>
                <span>화기 사용</span>
              </div>
              <div class="flex items-center ${campsite.smoking_allowed ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${campsite.smoking_allowed ? 'check' : 'times'}-circle mr-2"></i>
                <span>흡연</span>
              </div>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-xl font-bold mb-3">호스트 정보</h3>
            <div class="flex items-center">
              <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <i class="fas fa-user text-2xl text-purple-600"></i>
              </div>
              <div>
                <div class="font-semibold text-lg">${campsite.host_name}</div>
                <div class="text-gray-600">${campsite.host_phone}</div>
                ${campsite.host_description ? `<div class="text-sm text-gray-500 mt-1">${campsite.host_description}</div>` : ''}
              </div>
            </div>
          </div>

          ${campsite.reviews && campsite.reviews.length > 0 ? `
          <div class="mb-6">
            <h3 class="text-xl font-bold mb-3">리뷰 (${campsite.reviews.length}개)</h3>
            <div class="space-y-4">
              ${campsite.reviews.map(review => `
                <div class="border-b pb-4">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-semibold">${review.user_name}</div>
                    <div class="flex items-center text-yellow-500">
                      ${Array(review.rating).fill('<i class="fas fa-star"></i>').join('')}
                    </div>
                  </div>
                  <p class="text-gray-700">${review.comment}</p>
                  <div class="text-xs text-gray-500 mt-2">${new Date(review.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="flex space-x-4">
            <button onclick="showBookingForm(${id})" 
                    class="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition">
              <i class="fas fa-calendar-check mr-2"></i>예약하기
            </button>
            <button onclick="this.closest('.fixed').remove()" 
                    class="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
              닫기
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('캠핑지 상세 정보 로드 실패:', error);
    alert('캠핑지 정보를 불러오는데 실패했습니다.');
  }
}

// 예약 폼 표시
function showBookingForm(campsiteId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-md w-full p-8">
      <h2 class="text-2xl font-bold mb-6">예약하기</h2>
      <form id="bookingForm" onsubmit="submitBooking(event, ${campsiteId})">
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">이름</label>
          <input type="text" name="user_name" required 
                 class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">이메일</label>
          <input type="email" name="user_email" required 
                 class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">연락처</label>
          <input type="tel" name="user_phone" required 
                 class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">체크인</label>
          <input type="date" name="check_in_date" required 
                 class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">체크아웃</label>
          <input type="date" name="check_out_date" required 
                 class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">인원</label>
          <input type="number" name="guests" min="1" value="2" required 
                 class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600">
        </div>
        <div class="mb-4">
          <label class="flex items-center">
            <input type="checkbox" name="has_pet" class="mr-2">
            <span class="text-sm">반려동물 동반</span>
          </label>
        </div>
        <div class="mb-6">
          <label class="block text-sm font-semibold mb-2">특별 요청사항</label>
          <textarea name="special_requests" rows="3" 
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"></textarea>
        </div>
        <div class="flex space-x-3">
          <button type="submit" 
                  class="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition">
            예약 확인
          </button>
          <button type="button" onclick="this.closest('.fixed').remove()" 
                  class="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
            취소
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

// 예약 제출
async function submitBooking(event, campsiteId) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const bookingData = {
    campsite_id: campsiteId,
    user_name: formData.get('user_name'),
    user_email: formData.get('user_email'),
    user_phone: formData.get('user_phone'),
    check_in_date: formData.get('check_in_date'),
    check_out_date: formData.get('check_out_date'),
    guests: parseInt(formData.get('guests')),
    has_pet: formData.get('has_pet') === 'on',
    special_requests: formData.get('special_requests')
  };

  try {
    const response = await axios.post('/api/bookings', bookingData);
    
    if (response.data.success) {
      alert(`예약이 완료되었습니다!\n예약 번호: ${response.data.data.booking_id}\n총 금액: ${response.data.data.total_price.toLocaleString()}원`);
      form.closest('.fixed').remove();
      
      // 상세 모달도 닫기
      const detailModal = document.querySelector('.fixed');
      if (detailModal) detailModal.remove();
    }
  } catch (error) {
    console.error('예약 실패:', error);
    alert('예약 처리 중 오류가 발생했습니다.');
  }
}

// 지도 로드
async function loadMap() {
  try {
    const response = await axios.get('/api/campsites/map/all');
    const campsites = response.data.data;

    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = `
      <div class="w-full h-full bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div class="text-center max-w-2xl p-8">
          <i class="fas fa-map-marked-alt text-6xl text-purple-600 mb-6"></i>
          <h3 class="text-2xl font-bold text-gray-900 mb-4">대한민국 전국 캠핑지 지도</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            ${campsites.map(site => `
              <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
                   onclick="viewCampsiteDetail(${site.id})">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-semibold text-purple-600">${site.category_name}</span>
                  <span class="text-xs text-gray-500">⭐ ${site.rating.toFixed(1)}</span>
                </div>
                <div class="font-semibold text-sm mb-1">${site.name}</div>
                <div class="text-xs text-gray-600 mb-2">
                  <i class="fas fa-map-marker-alt mr-1"></i>
                  ${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}
                </div>
                <div class="text-purple-600 font-bold text-sm">
                  ${site.price_per_night.toLocaleString()}원/박
                </div>
              </div>
            `).join('')}
          </div>
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-gray-700 mb-2">
              <i class="fas fa-info-circle mr-2 text-blue-600"></i>
              <strong>네이버/카카오 지도 API 연동</strong>을 통해 실제 위치를 확인할 수 있습니다.
            </p>
            <p class="text-xs text-gray-600">
              GPS 좌표를 클릭하면 해당 위치로 이동합니다.
            </p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('지도 로드 실패:', error);
  }
}

// 특정 캠핑지 위치 지도에 표시
function showMapForCampsite(lat, lng) {
  // 네이버 지도 또는 카카오맵으로 새 창 열기
  const naverMapUrl = `https://map.naver.com/v5/?c=${lng},${lat},15,0,0,0,dh`;
  window.open(naverMapUrl, '_blank');
}
