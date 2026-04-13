# 포트폴리오 닥터 — Design System

> AI 에이전트 및 구현 참조용 단일 디자인 문서.
> 모든 결정은 `/plan-design-review` 세션에서 확정됨 (2026-04-05).

---

## 1. Visual Theme & Atmosphere

포트폴리오 닥터는 의사 리포트 느낌의 진단 도구다 — 마케팅 랜딩 페이지가 아니다. 디자인 언어는 "당신의 포트폴리오를 정확하게 읽겠다"는 신뢰를 딥 네이비(`#1A237E`)로 전달한다. 배경은 네이비 틴트(`#F4F6FF`)로 미묘하게 브랜드를 물들이고, 카드와 패널은 흰색 표면 위에 올라앉아 정보 밀도를 높인다.

타이포그래피는 Pretendard Variable 단일 패밀리로 구성된다. 진단 숫자는 42px weight 800, 자간 -2px로 숫자가 화면을 압도한다. 이건 의도적이다 — 유저는 숫자를 먼저 읽고, 맥락을 뒤에 읽는다. 버튼은 border-radius 12px의 둥근 직사각형. 풀 필이 아닌 이유는 앱 도구의 정밀함을 표현하기 위해서다.

시맨틱 컬러는 진단 결과에 직접 매핑된다. 빨강(`--red`)은 심각한 편중, 앰버(`--amber`)는 개선 권고, 초록(`--green`)은 양호 상태. 그림자 없음 — 깊이는 색상 대비와 보더로 표현한다.

**핵심 특성:**
- 딥 네이비(`#1A237E`) 단일 브랜드 액센트 — 그라디언트 없음
- `#F4F6FF` 배경 + 흰색 카드 표면 — 정보 계층 분리
- 버튼 radius 12px — 도구적 정밀함, 풀 필 아님
- Pretendard Variable 단일 패밀리, weight 400–800
- 진단 숫자 42px 800 자간 -2px — 숫자가 먼저 읽힌다
- 그림자 없음 — 깊이는 색상 대비와 보더로만
- 시맨틱 3색(red/amber/green)이 진단 상태에 직접 대응

---

## 2. Color Palette & Roles

### 브랜드

| 토큰 | 값 | 역할 |
|------|-----|------|
| `--navy` | `#1A237E` | 메인 브랜드, CTA, 헤드라인, 진단 대형 숫자 |
| `--navy-dark` | `#121858` | 버튼 호버, 눌림 상태 |
| `--navy-mid` | `#3949AB` | 보조 강조, 링크 |
| `--navy-tint` | `#E8EAF6` | 배지 배경, 하이라이트 |

### 레이아웃

| 토큰 | 값 | 역할 |
|------|-----|------|
| `--bg` | `#F4F6FF` | 전체 배경 (네이비 틴트) |
| `--surface` | `#FFFFFF` | 카드, 패널 |
| `--border` | `#E0E4F0` | 기본 구분선 |
| `--border-2` | `#C7CEEA` | 강조 선, 입력 테두리 |

### 텍스트

| 토큰 | 값 | 역할 |
|------|-----|------|
| `--text-1` | `#111827` | 본문 primary |
| `--text-2` | `#4B5563` | secondary, 설명 |
| `--text-3` | `#9CA3AF` | tertiary, 레이블, 카드 번호 |

### 시맨틱 (진단 상태)

| 토큰 | 값 | 역할 |
|------|-----|------|
| `--red` | `#DC2626` | 심각 편중, 매도, 에러 |
| `--red-bg` | `#FEF2F2` | 심각 카드 배경 |
| `--amber` | `#D97706` | 개선 필요, 주의, 매수 부족 |
| `--amber-bg` | `#FFFBEB` | 주의 카드 배경 |
| `--amber-border` | `#FDE68A` | 주의 카드 보더 |
| `--green` | `#059669` | 양호, 매수 권장 |
| `--green-bg` | `#ECFDF5` | 양호 상태 배경 |

### 컬러 사용 규칙

| 요소 | 색상 |
|------|------|
| 로고, 브랜드 텍스트 | `--navy` |
| Primary CTA 버튼 배경 | `--navy` |
| 진단 대형 숫자 | `--navy` |
| 문제 카드 번호 (01/02/03) | `--text-3` |
| 문제 카드 왼쪽 선 — 심각 | `--red` |
| 문제 카드 왼쪽 선 — 주의 | `--amber` |
| 배분 막대 — 과초과 | `--red` |
| 배분 막대 — 부족 | `--amber` |
| 배분 막대 — 목표선 | `--navy` |
| 확인 화면 헤더 배경 | `--navy` (텍스트 white) |
| 인라인 에러 텍스트 | `--red` |
| 섹션 레이블 | `--text-3` |

**금지:** 네이비 그라디언트. `--navy`를 배경 전체에 깔기. 텍스트에 `--navy-tint` 사용.

---

## 3. Typography Rules

### Font Family

```
Pretendard Variable (단일 패밀리)
CDN: https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css
```

### Hierarchy

| 용도 | Size | Weight | Line Height | Letter Spacing | 비고 |
|------|------|--------|-------------|----------------|------|
| 진단 대형 숫자 | 42px | 800 | 1.0 | -2px | N가지 헤드라인 |
| 화면 헤드라인 | 28–30px | 800 | 1.1 | -0.8px | 페이지 제목 |
| 섹션 제목 | 19px | 800 | 1.2 | -0.5px | 섹션 구분 |
| 카드 제목 | 17–18px | 800 | 1.2 | -0.4px | ConfirmCard, ProblemCard |
| 종목명 | 16px | 700 | 1.4 | -0.3px | 종목 식별자 |
| 본문 | 14px | 400–500 | 1.6 | 0px | 설명 텍스트 |
| 설명 | 13px | 400 | 1.6 | 0px | 보조 설명 |
| 레이블/배지 | 10–12px | 700 | 1.5 | 0.08–0.14em | uppercase |
| 금액 숫자 | 14px | 700 | 1.4 | 0px | `font-variant-numeric: tabular-nums` |

### Principles

- **Weight 800 as display default**: 진단 숫자와 헤드라인은 모두 800. 크기와 자간으로 임팩트를 주고, 더 굵은 weight는 없다.
- **타이트 트래킹**: 큰 숫자(-2px)와 제목(-0.4px~-0.8px)은 자간을 줄여 스캔하기 좋게 만든다.
- **tabular-nums**: 모든 금액, 비중, 수량에 적용. 숫자 정렬이 흔들리면 신뢰를 잃는다.

**금지:** Inter, Arial, system-ui 기본 스택.

---

## 4. Component Stylings

### Buttons

**Primary (네이비 기본)**
- Background: `--navy` (`#1A237E`)
- Text: `#ffffff`, 14px 700
- Padding: 14px 24px
- Radius: 12px
- Hover: `--navy-dark` (`#121858`)
- Focus: `0 0 0 2px #3949AB` 링

**Secondary (아웃라인)**
- Background: `--surface`
- Text: `--navy`, 14px 700
- Border: `1.5px solid --navy`
- Padding: 14px 24px
- Radius: 12px
- Hover: `--navy-tint` 배경

**Danger 배지 (매도)**
- Background: `--red-bg`
- Text: `--red`, 10px 800 uppercase
- Padding: 4px 10px
- Radius: 20px

**Success 배지 (매수)**
- Background: `--green-bg`
- Text: `--green`, 10px 800 uppercase
- Padding: 4px 10px
- Radius: 20px

**Fixed CTA (하단 고정)**
- Background: `--navy`
- Text: white, 16px 800
- Width: 100%
- Padding: 16px 24px
- Radius: 12px
- `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)`

---

### ConfirmCard

```
배경: --surface
border: 1px solid --border
border-radius: 14px
padding: 16px

[종목명 16px 700]  [⚠ 중복 배지 — 같은 티커 여러 줄일 때만]  [✕ 삭제 44×44px]

2×2 그리드 (border: 1px --border 구분선):
  ┌──────────────┬──────────────┐
  │ 보유금액      │ 비중          │
  │ 2,418,500    │ 24.2%        │
  ├──────────────┼──────────────┤
  │ 평균단가      │ 현재가        │
  │ 604,625      │ 604,625      │
  └──────────────┴──────────────┘

  셀 레이블: 10px 700 uppercase --text-3
  셀 값: 14px 700 tabular-nums
  평균단가/현재가: 13px 600 --text-2

[자산군 드롭다운 — 네이티브 select]  [섹터 읽기전용 --text-2]

▾ 상세보기 (탭하면 펼쳐짐): 수량 / 출처(이미지 N)
```

**⚠ 중복 배지 동작:**
- 자동 제거 금지. 같은 티커가 여러 계좌(일반/ISA)에 있을 수 있음.
- 배지는 경고만. 삭제는 유저가 판단.
- 안내 배너: "서로 다른 계좌라면 그대로 두세요. 같은 계좌를 두 번 올렸다면 하나를 삭제해주세요."

---

### ProblemCard

```
배경: --surface
border: 1px solid --border
border-radius: 14px
padding: 18px 20px 18px 22px
border-left: 3px solid (--red 심각 | --amber 주의)

[번호] 01 · 자산 편중         10px 800 uppercase --text-3
[제목] 국내주식에 너무 쏠려 있습니다   17px 800 --text-1
[수치] 81%  →  40% 목표
        ↑ 36px 800 tabular-nums (--red or --amber)
               ↑ 18px 700 --text-2
[설명] 13px 400 --text-2 line-height 1.6
```

---

### ActionItem

```
컨테이너: --surface, border 1px --border, border-radius 14px
각 항목: border-top 1px --border, padding 12px 16px

[배지]         [종목명 14px 700]    [N주 / 약 N원 13px --text-2]
 └ 10px 800 uppercase
   매도: --red-bg / --red
   매수: --green-bg / --green
```

---

### AllocationBar (배분 막대 차트)

```
트랙:    height 7px, background --border, border-radius 4px
채움:    자산군별 색상 (과초과 --red, 부족 --amber)
목표선:  width 2px, rgba(17,17,17,.35), 해당 % 위치 수직선
레이블:  11px 700 --text-3, width 44px
수치:    12px 700 tabular-nums --text-2, width 30px
```

---

### OCR 로딩 애니메이션

```
종목명 하나씩 순서대로 등장: opacity 0→1, translateY 5px→0, 0.25s ease-out
체크 상태:
  대기     → border: 1px solid --border-2
  처리중   → spinning amber border
  완료     → --green fill + checkmark icon
하단 프로그레스:
  height 2px, background --text-1
  레이블: "이미지 N 처리 중 (N/M)" 12px --text-3
```

---

## 5. Layout Principles

### Spacing System

기본 단위: 8px

| 단계 | 값 | 용도 |
|------|-----|------|
| xs | 4px | 아이콘-텍스트 간격 |
| sm | 8px | 내부 여백 최소 |
| md | 16px | 카드 내부 패딩 |
| lg | 24px | 섹션 내부 |
| xl | 32px | 섹션 간격 |
| 2xl | 48px | 화면 간 여백 |

### Border Radius Scale

| 용도 | 값 |
|------|-----|
| 인풋, 셀렉트 | 8px |
| 버튼, CTA | 12px |
| 카드, 패널 | 14px |
| 배지, 태그 | 20px |

### 컨테이너

```
모바일 기본: 375px, padding 16–24px
데스크탑: max-width 440px, 가운데 정렬
```

---

## 6. Depth & Elevation

| 레벨 | 처리 | 사용처 |
|------|------|--------|
| Flat (0) | 없음 | 기본 배경 위 요소 |
| Subtle | `border: 1px solid --border` | ConfirmCard, ProblemCard, ActionItem |
| Emphasis | `border-left: 3px solid --red/--amber` | 심각/주의 상태 ProblemCard |
| Focus | `0 0 0 2px #3949AB` 링 | 키보드 접근성 |

**Shadow Philosophy**: 그림자 없음. 깊이는 색상 대비(`--bg` vs `--surface`)와 보더로만 표현한다. 그림자는 의료 리포트 느낌과 맞지 않는다.

---

## 7. Do's and Don'ts

### Do
- Pretendard Variable weight 800을 모든 헤드라인에 사용
- 시맨틱 컬러(red/amber/green)를 진단 상태에만 사용 — UI 장식에 쓰지 않음
- 금액/수량/비중에 `font-variant-numeric: tabular-nums` 적용
- 터치 타겟 최소 44×44px (삭제 버튼, 토글)
- 배지에 아이콘 + 텍스트 병행 — 색상만으로 상태 표현 금지
- 네이티브 `<select>` 사용 — 스크린리더 호환
- `env(safe-area-inset-bottom)` for iOS fixed CTA

### Don't
- ❌ 네이비 그라디언트
- ❌ `--navy`를 배경 전체에 깔기
- ❌ 텍스트에 `--navy-tint` 사용
- ❌ 그림자 사용
- ❌ 3컬럼 아이콘+제목+설명 그리드
- ❌ 장식용 blob, SVG wave divider
- ❌ "환영합니다", "강력한", "혁신적인" 카피
- ❌ Inter, Arial, system-ui 폰트
- ❌ 중복 티커 자동 제거 — 다른 계좌에 같은 종목 있을 수 있음

---

## 8. Responsive Behavior

### Breakpoints

| 이름 | 너비 | 주요 변화 |
|------|------|----------|
| Mobile | < 768px | 단일 컬럼, fixed CTA |
| Tablet+ | 768px+ | max-width 440px 중앙 정렬, 인라인 버튼 |

### 화면별 반응형

| 화면 | Mobile (375px) | Tablet+ (768px+) |
|------|---------------|-----------------|
| 업로드 | 전체 너비 | max-width 440px 중앙 |
| 확인 | ConfirmCard 리스트 | 전체 컬럼 테이블 전환 |
| 진단 | 수직 스택 카드 | 동일 (max-width 440px) |
| 하단 CTA | `position: fixed`, safe-area 대응 | 인라인 버튼 |

---

## 9. Agent Prompt Guide

### 화면 플로우

```
업로드 (/) → OCR 로딩 → 확인 (/confirm) → 진단 (/diagnosis)
```

### Quick Color Reference

```
브랜드:  --navy #1A237E  /  --navy-dark #121858
배경:    --bg #F4F6FF  /  --surface #FFFFFF
텍스트:  --text-1 #111827  /  --text-2 #4B5563  /  --text-3 #9CA3AF
심각:    --red #DC2626  /  --red-bg #FEF2F2
주의:    --amber #D97706  /  --amber-bg #FFFBEB
양호:    --green #059669  /  --green-bg #ECFDF5
```

### Example Component Prompts

- "ProblemCard: --surface 배경, border-left 3px --red, border-radius 14px, 번호 10px 800 uppercase --text-3, 제목 17px 800, 수치 36px 800 tabular-nums --red, 설명 13px --text-2."
- "Primary CTA: --navy 배경, white 16px 800, border-radius 12px, padding 14px 24px, hover --navy-dark."
- "ConfirmCard: --surface, border 1px --border, border-radius 14px, 2×2 그리드, 셀 레이블 10px 700 uppercase --text-3, 셀 값 14px 700 tabular-nums."
- "AllocationBar: 트랙 7px --border, 채움 --red(과초과)/--amber(부족), 목표선 2px rgba(17,17,17,.35)."

### Interaction States

| 기능 | 로딩 | 빈 상태 | 에러 | 성공 |
|------|------|---------|------|------|
| OCR 처리 | 종목명 체크 애니메이션 | — | "인식 실패: 주식잔고 화면이 맞나요? [다시 시도]" | 확인 화면으로 이동 |
| 업로드 | — | 점선 박스 "MTS 주식잔고 캡처를 올려주세요" | 5MB 초과 인라인 오류 | 썸네일 표시 |
| 목표 배분 합계 | — | 기본값 40/30/30 | "합계: N% (100%여야 합니다)" 인라인 --red | — |
| 진단 엔진 | "분석 중..." (< 1초) | ✓ + "포트폴리오가 양호합니다" | — | ProblemCard 표시 |
| Claude 설명 토글 | "설명 불러오는 중..." | — | "불러오지 못했습니다 [다시 시도]" | 설명 텍스트 인라인 |

### Copy Principles

- "문제" → "최적화할 수 있는 것" / "개선 포인트"
- 확인 화면: "자산군만 확인해주세요. 나머지는 수정 안 해도 됩니다."
- 액션 추천: "고려해볼 수 있습니다" (투자자문업 미등록 준수)
- 면책: "이 서비스는 투자자문업 등록 서비스가 아닙니다. 최종 투자 결정은 본인 책임입니다."
- 기준일: "캡처 시점 기준 데이터. 실제 주문 시 시세를 다시 확인해주세요."

### Iteration Guide

1. 헤드라인은 항상 Pretendard 800 — weight를 낮추지 않는다
2. 진단 숫자는 42px 이상, 자간 -2px — 임팩트가 곧 신뢰다
3. 시맨틱 컬러(red/amber/green)는 진단 상태 전용 — UI 장식에 쓰지 않는다
4. 그림자 없음 — 의료 리포트는 그림자가 아닌 정보로 신뢰를 만든다
5. tabular-nums 빠뜨리지 않기 — 숫자가 춤추면 신뢰를 잃는다

---

## 참조 구현

`prototype.html` — 4개 화면 작동 프로토타입 (실제 데이터 기반)
