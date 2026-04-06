# Progress

## 2026-04-05
- [x] 진단 엔진(`engine.ts`), 타입 정의(`types.ts`), 섹터 분류 로직(`sectors.ts`) 구현
- [x] 3개 페이지 구현: 이미지 업로드(`/`), 종목 확인(`/confirm`), 진단 결과(`/diagnosis`)
- [x] OCR API(`/api/ocr`), 진단 설명 API(`/api/explain`) 구현
- [x] 4개 컴포넌트 구현: ConfirmCard, ProblemCard, AllocationBar, ActionItem
- [x] Vitest 단위 테스트 7개 작성 (`engine.test.ts`)
- [x] ESLint 9 + eslint-config-next 세팅, `bun run verify` 스크립트 추가
- [x] `confirm/page.tsx` useEffect 내 setState → lazy state 초기화로 린트 오류 수정
- [x] CLAUDE.md를 `@../AGENTS.md` import 단일 라인으로 축소
- [x] Rate limit 로직을 `src/lib/rateLimit.ts`로 분리하고 Upstash env 미설정 시 안전하게 우회
- [x] Vitest 단위 테스트 4개 추가 (`rateLimit.test.ts`)
- [x] OCR 정규화/설명 프롬프트/섹터 분류 로직을 테스트 가능한 helper로 분리
- [x] Vitest 단위 테스트 9개 추가 (`ocr.test.ts`, `explain.test.ts`, `sectors.test.ts`)
- [x] OCR 응답 파싱을 malformed JSON/비정상 수량에 대해 방어적으로 보강
- [x] Vitest 회귀 테스트 2개 추가 (`ocr.test.ts`)

## 2026-04-06
- [x] 진단 결과 하단에 면책/기준일 고지문을 추가
- [ ] 목표 배분 합계가 100%가 아닐 때 진단 화면에 인라인 오류 메시지를 표시
- [ ] OCR 실패 시 빈 500 대신 원인별 오류 메시지를 반환하도록 보강
- [ ] OCR 필드 매핑을 평가금액·매입가·현재가 기준으로 재정렬
