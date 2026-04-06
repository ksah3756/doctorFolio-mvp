# 포트폴리오 닥터 — Design System

> Stitch 및 구현 참조용 단일 디자인 문서.
> 모든 결정은 `/plan-design-review` 세션에서 확정됨 (2026-04-05).

---

## 제품 분류

**APP UI** — 의사 리포트 느낌. 마케팅 랜딩 페이지 아님.
타겟: 모바일 MTS 유저 (375px 기준 설계, 768px+ 확장).

---

## 색상 시스템

메인 브랜드 컬러: `#1A237E` (딥 네이비)

```css
:root {
  /* 브랜드 */
  --navy:         #1A237E;  /* 메인 브랜드, CTA, 헤드라인 */
  --navy-dark:    #121858;  /* 호버, 눌림 상태 */
  --navy-mid:     #3949AB;  /* 보조 강조, 링크 */
  --navy-tint:    #E8EAF6;  /* 연한 배지 배경, 하이라이트 */

  /* 레이아웃 */
  --bg:           #F4F6FF;  /* 전체 배경 (네이비 틴트) */
  --surface:      #FFFFFF;  /* 카드, 패널 */
  --border:       #E0E4F0;  /* 기본 선 */
  --border-2:     #C7CEEA;  /* 강조 선, 입력 테두리 */

  /* 텍스트 */
  --text-1:       #111827;  /* 본문 primary */
  --text-2:       #4B5563;  /* secondary */
  --text-3:       #9CA3AF;  /* tertiary, 레이블 */

  /* 시맨틱 (변경 없음 — 네이비와 자연 대비) */
  --amber:        #D97706;  /* 개선 필요 (주의) */
  --amber-bg:     #FFFBEB;
  --amber-border: #FDE68A;

  --green:        #059669;  /* 양호, 매수 */
  --green-bg:     #ECFDF5;

  --red:          #DC2626;  /* 심각, 매도 */
  --red-bg:       #FEF2F2;
}
```

### 컬러 사용 규칙

| 요소 | 색상 |
|------|------|
| 로고, 브랜드 텍스트 | `--navy` |
| Primary CTA 버튼 | `--navy` (배경) / white (텍스트) |
| 진단 대형 숫자 (N가지) | `--navy` |
| 문제 카드 번호 (01/02/03) | `--text-3` |
| 문제 카드 왼쪽 선 | `--red` (심각) / `--amber` (주의) |
| 배분 막대 — 과초과 | `--red` |
| 배분 막대 — 부족 | `--amber` |
| 배분 막대 — 목표선 | `--navy` |
| 확인 화면 헤더 배경 | `--navy` (텍스트 white) |
| 인라인 에러 텍스트 | `--red` |
| 섹션 레이블 | `--text-3` |

**금지:** 네이비 그라디언트. `--navy`를 배경 전체에 깔기. 텍스트에 `--navy-tint` 사용.

---

## 타이포그래피

```
폰트: Pretendard Variable
CDN:  https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css
```

| 용도 | Size | Weight | 기타 |
|------|------|--------|------|
| 대형 헤드라인 (진단 숫자) | 42px | 800 | letter-spacing: -2px |
| 화면 헤드라인 | 28–30px | 800 | letter-spacing: -0.8px |
| 섹션 제목 | 19px | 800 | letter-spacing: -0.5px |
| 카드 제목 | 17–18px | 800 | letter-spacing: -0.4px |
| 종목명 | 16px | 700 | letter-spacing: -0.3px |
| 본문 | 14px | 400–500 | line-height: 1.6 |
| 설명 | 13px | 400 | color: --text-2 |
| 레이블/배지 | 10–12px | 700 | letter-spacing: 0.08–0.14em, uppercase |
| 금액 숫자 | — | — | font-variant-numeric: tabular-nums |

**금지:** Inter, Arial, system-ui 기본 스택.

---

## 레이아웃

```
모바일 기본: 375px, padding 16–24px
데스크탑 컨테이너: max-width 440px, 가운데 정렬
border-radius 기준: 카드 14px, 버튼 12px, 배지 20px, 인풋 8px
```

### 반응형

| 화면 | 375px | 768px+ |
|------|-------|--------|
| 업로드 | 전체 너비 | max-width 440px 중앙 |
| 확인 | ConfirmCard 리스트 | 전체 컬럼 테이블 전환 |
| 진단 | 수직 스택 카드 | 동일 (max-width 440px) |
| 하단 CTA | `position: fixed`, safe-area 대응 | 인라인 버튼 |

---

## 화면 플로우

```
업로드 (/) → OCR 로딩 → 확인 (/confirm) → 진단 (/diagnosis)
```

### 정보 계층

**업로드 (`/`)**
1. 업로드 존 (가장 크게, 압도적 중심)
2. 보조 문구 — "키움·삼성·미래에셋 MTS 지원"
3. 수동 입력 링크 (작게, 하단)
- 브랜드: 상단 좌측 "포트폴리오·닥터" 텍스트 로고

**확인 (`/confirm`)**
1. 상단 배너 "이렇게 인식했어요"
2. ConfirmCard 리스트
3. 하단 고정 CTA "진단 시작"

**진단 (`/diagnosis`)**
1. "최적화할 수 있는 N가지가 있습니다" 헤드라인
2. 현재 vs 목표 배분 미니 막대 차트
3. ProblemCard ×N (01/02/03)
4. 권장 조치 섹션
5. "왜 이 조언인가요?" 토글 (기본 접힘)
6. "다시 진단하기" 링크 (하단)

---

## 컴포넌트

### ConfirmCard

```
배경: --surface
border: 1px --border
border-radius: 14px

[종목명 700 16px]  [⚠ 중복 배지 — 같은 티커 여러 줄일 때만]  [✕ 삭제 44px]

2×2 그리드 (border 1px --border 구분선):
  ┌──────────────┬──────────────┐
  │ 보유금액      │ 비중          │
  │ 2,418,500    │ 24.2%        │
  ├──────────────┼──────────────┤
  │ 평균단가      │ 현재가        │
  │ 604,625      │ 604,625      │
  └──────────────┴──────────────┘
  셀 레이블: 10px 700 uppercase --text-3
  셀 값: 14px 700 tabular-nums (평균단가/현재가는 13px 600 --text-2)

[자산군 드롭다운 — 네이티브 select]  [섹터 읽기전용 텍스트]

▾ 상세보기 (탭하면 펼쳐짐)
  수량 / 출처(이미지 N)
```

**⚠ 중복 배지 동작:**
- 자동 제거 금지. 같은 티커가 여러 계좌(일반/ISA)에 있을 수 있음.
- 배지는 경고만. 삭제는 유저가 판단.
- 안내 배너: "서로 다른 계좌라면 그대로 두세요. 같은 계좌를 두 번 올렸다면 하나를 삭제해주세요."

### ProblemCard

```
배경: --surface
border: 1px --border
border-radius: 14px
padding: 18px 20px 18px 22px
border-left: 3px solid (--red 심각 | --amber 주의)

[번호] 01 · 자산 편중   — 10px 800 uppercase --text-3
[제목] 국내주식에 너무 쏠려 있습니다  — 17px 800
[수치] 81%  →  40% 목표
        ↑ 36px 800 tabular-nums (--red or --amber)
             ↑ 18px 700 --text-2
[설명] 13px --text-2 line-height 1.6
```

### ActionItem

```
배경: --surface (카드 컨테이너)
border: 1px --border
border-radius: 14px
각 항목 border-top: 1px --border

[매도 배지]  [종목명 14px 700]  [N주 / 약 N원]
 └ 10px 800 uppercase
   매도: --red-bg / --red
   매수: --green-bg / --green
```

### AllocationBar (배분 막대 차트)

```
트랙: height 7px, --border, border-radius 4px
채움: 자산군별 색상 (국내 --red 초과시, 해외 --amber 부족시)
목표선: width 2px, rgba(17,17,17,.35), 해당 % 위치에 수직선
레이블: 11px 700 --text-3, width 44px
수치: 12px 700 tabular-nums --text-2, width 30px
```

### OCR 로딩 애니메이션

```
종목명 하나씩 순서대로 등장 (opacity 0→1, translateY 5px→0, 0.25s)
체크 상태: 대기(border --border-2) → 처리중(spinning amber border) → 완료(--green fill + checkmark)
하단: 프로그레스 바 (height 2px --text-1) + "이미지 N 처리 중 (N/M)"
```

---

## 인터랙션 상태

| 기능 | 로딩 | 빈 상태 | 에러 | 성공 |
|------|------|---------|------|------|
| OCR 처리 | 종목명 체크 애니메이션 | — | "인식 실패: 주식잔고 화면이 맞나요? [다시 시도]" | 확인 화면으로 이동 |
| 업로드 | — | 점선 박스 "MTS 주식잔고 캡처를 올려주세요" | 5MB 초과 인라인 오류 | 썸네일 표시 |
| 목표 배분 합계 | — | 기본값 40/30/30 | "합계: N% (100%여야 합니다)" 인라인 빨강 | — |
| 진단 엔진 | "분석 중..." (< 1초) | ✓ + "포트폴리오가 양호합니다" + 현재 배분 차트 | — | ProblemCard 표시 |
| Claude 설명 토글 | "설명 불러오는 중..." (2–3초) | — | "불러오지 못했습니다 [다시 시도]" | 설명 텍스트 인라인 |

---

## Copy 원칙

- "문제" → "최적화할 수 있는 것" / "개선 포인트"
- 확인 화면: "자산군만 확인해주세요. 나머지는 수정 안 해도 됩니다."
- 액션 추천: "고려해볼 수 있습니다" (투자자문업 미등록 준수)
- 세금: "단순 참고용. 실제 세금은 증권사/세무사 확인 필요."
- 면책: "이 서비스는 투자자문업 등록 서비스가 아닙니다. 최종 투자 결정은 본인 책임입니다."
- 기준일: "캡처 시점 기준 데이터. 실제 주문 시 시세를 다시 확인해주세요."

---

## 접근성

- 터치 타겟: 최소 44×44px (삭제 버튼, 토글 등)
- 색상 대비: WCAG AA (--text-2 #555 on #FFF = 7.0:1 ✓)
- 색상만으로 상태 표현 금지: 배지는 아이콘 + 텍스트 병행
- 드롭다운: 네이티브 `<select>` (스크린리더 호환)
- 진단 카드: `role="article"`, `aria-label="진단 항목 1"`
- iOS: `padding-bottom: env(safe-area-inset-bottom)` for fixed CTA

---

## 금지 패턴

- ❌ 3컬럼 아이콘+제목+설명 그리드
- ❌ 보라/파란/인디고 그라디언트
- ❌ 모든 요소 동일한 큰 border-radius
- ❌ 장식용 blob, SVG wave divider
- ❌ "환영합니다", "강력한", "혁신적인" copy
- ❌ Inter, Arial, system-ui 폰트

---

## 참조 구현

`prototype.html` — 4개 화면 작동 프로토타입 (실제 데이터 기반)
