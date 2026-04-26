# Sound Archive & Launchpad — PLAN

## 0. 프로젝트 개요

- 3개 메인 메뉴: **아카이브 / 런치패드 / 스테이지**
- **아카이브**: 사용자들이 3초 이내 짧은 사운드를 업로드하고 카테고리/태그로 분류된 목록
- **런치패드**: 12개 패드(모바일 3×4, iPad 4×3)에 사운드 배치 → 즉시 트리거로 연주, 최대 1분 믹스 녹음 가능
- **스테이지**: 런치패드에서 녹음한 믹스를 공유하는 공간 (선택적 공개)
- 로그인 없이 device_id 기반으로 "내가 올린 소리" / "내 런치패드" 구분
- 모바일 친화적인 웹 서비스 / 무료 호스팅 (Cloudflare Pages)

---

## 1. 기술 스택 (확정)

### 1-1. 최종 구성

```
Frontend:       Next.js 15 (App Router) + TypeScript + Tailwind CSS
i18n:           next-intl (한국어 / 영어)
Audio:          Howler.js (클라이언트 트리거)
                  + Pitchfinder (업로드 시 음정 감지)
사용자 식별:    로그인 없음. localStorage UUID (device_id) 기반
DB:             Supabase (Postgres only — Auth/Storage 미사용)
Object Storage: Cloudflare R2 (오디오 파일, S3 호환 API)
Hosting:        Cloudflare Pages (Next.js + @cloudflare/next-on-pages)
도메인:         xxx.pages.dev (무료)
```

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js | 자료 풍부, 모바일 친화 SSR/CSR 혼합 가능 |
| 다국어 | **next-intl** | edge runtime 호환, App Router 지원, 라이트한 라이브러리 |
| 오디오 | **Howler.js** | 단순 샘플 트리거 + 폴리포니 + 모바일 unlock 자동 처리. 번들 ~10KB |
| 사용자 식별 | **device_id (UUID)** | 로그인 없이 "내가 올린 소리" / "내 런치패드" 구분 가능 |
| DB | **Supabase** | Postgres 직관적, JS SDK 풍부. Auth/Storage는 사용 안 함 |
| 파일 저장 | **Cloudflare R2** | egress 무료(무제한), 10GB 저장 무료. S3 호환 API |
| 호스팅 | **Cloudflare Pages** | 대역폭 무제한, GitHub 연결 자동 배포 |

### 1-2. 확정된 결정 사항

**(1) 오디오 라이브러리 — Howler.js**
- 디제잉 = "샘플 합주" 수준으로 정의 (BPM 동기/이펙트 X)
- 추후 BPM/이펙트가 필요해지면 그때 Tone.js로 마이그레이션 (둘 다 Web Audio API 위라 호환)

**(2) 카테고리 — 15개 고정 (14 + 기타) + 자유 태그 최대 3개 (상세는 §3-5)**
- 소리 종류: 업로드 시 사용자가 15개 중 1개 선택 + 자유 태그 **최대 3개** (쉼표 구분 입력)
- 카테고리 키/라벨은 `lib/categories.ts` 한 곳에 정의 → 추후 라벨 수정 1파일로 끝
- 음정: 업로드 시 클라이언트에서 [Pitchfinder](https://github.com/peterkhayes/pitchfinder) (YIN 알고리즘)로 자동 감지 → DB에 노트(C4, D#5)와 주파수(Hz) 저장
- 음정 감지 실패 시 `pitch nullable` 처리

**(3) 인프라 — Cloudflare 풀스택**
- 핵심 트래픽 부담은 오디오 egress → R2가 정답
- Pages도 같이 쓰면 대역폭/배포 하나로 통일
- Supabase는 DB 용도로만 사용 (Auth/Storage 미사용)

**(4) 사용자 식별 — 로그인 없이 device 기반**
- 첫 방문 시 클라이언트가 UUID v4 생성 → `localStorage['device_id']`에 저장 → 모든 업로드/추천/런치패드에 첨부
- "내가 올린 소리", "내 런치패드"는 동일 device_id 기준 필터
- **닉네임**: `localStorage['nickname']`에 마지막 입력값 저장. 업로드 폼에 자동 채움(편집 가능). 사운드 row에 `uploader_nickname`으로 저장 → 사운드 카드에 표시
- **한계 (UI에 명시)**:
  - 브라우저 데이터 삭제 / 시크릿 모드 / 다른 기기 → device_id가 달라져 "내 사운드"가 사라짐
  - 같은 기기를 여러 사람이 쓰면 구분 불가
- **보안**: 로그인이 없어 RLS만으로는 본인 검증 불가 → 모든 쓰기는 서버 API 경유 (서버에서 device_id 검증 + Supabase service_role 키로 쓰기). 클라이언트는 anon 키로 읽기만.

**(5) 공개 범위 — 모든 사운드 공개**
- 비공개 옵션 없음. 업로드 = 즉시 공개

**(6) 다국어 — 한국어 / 영어**
- `next-intl` + middleware 라우팅 (`/ko/...`, `/en/...`)
- 카테고리/태그도 ko/en 양쪽 라벨 보유 (DB는 영문 키로 저장, 표시는 i18n 메시지)
- 기본 로케일은 브라우저 `Accept-Language` 기반, 헤더에 토글 버튼

**(7) 메뉴 구조 — 3개 메인 탭 (하단 탭바)**
- **아카이브** (`/archive`): 사운드 목록, 카테고리 탭(`전체` / 카테고리들 / `내가 등록한 소리`), 정렬/필터, 우하단 `+` 업로드 버튼, 카드 클릭 시 상세
- **런치패드** (`/launchpad`): 12 패드(모바일 3×4, iPad 4×3), 우상단 녹음 시작/종료 (최대 1분), 드래그&드롭 위치 변경
- **스테이지** (`/stage`): 런치패드에서 공유 선택한 믹스 목록, 정렬(들은 순/좋아요 순/등록 순)

**(8) 런치패드 녹음 동작**
- 우상단 ► / ◼︎ 버튼으로 시작/종료
- 최대 1분 녹음 (UI에 "최대 1분, 1분 초과 시 자동 종료" 명시)
- 1분 도달 시 자동 종료 + "도로롱" 알림 사운드 재생
- 종료 후 모달: ① 본인 기기에 다운로드 여부 ② 스테이지 공유 여부 (제목/소개 입력)
- **공유 안 하면 DB/스토리지에 저장하지 않음** (로컬 다운로드만, 안 하면 즉시 폐기)
- 녹음 안 켜고 그냥 가지고 노는 것도 자유

### 1-3. Cloudflare 환경에서 주의할 점

**(a) Edge Runtime 제약**
- `@cloudflare/next-on-pages` 사용 시 모든 API 라우트는 edge runtime에서 동작
- 각 API 라우트 파일에 `export const runtime = 'edge';` 명시 필요
- `fs`, `child_process` 등 Node API 불가 — 이 프로젝트는 단순 CRUD라 영향 없음
- Supabase JS SDK는 edge에서 정상 동작
- CPU 시간 제한 (free 10ms, paid 50ms) — CRUD에는 충분

**(b) R2 접근 방식**
- **개발 중**: S3 호환 API + Access Key 방식 (`@aws-sdk/client-s3`) — 로컬 `next dev`에서도 동작
- **배포 후**: R2 Binding 방식도 가능하나, S3 호환 방식이 환경 일관성 면에서 유리
- 업로드는 **클라이언트가 R2로 직접 PUT** (presigned URL) → 서버는 metadata만 받음

**(c) 빌드/배포 절차**
- GitHub repo → Cloudflare Pages 연결
- 빌드 명령: `npx @cloudflare/next-on-pages@latest`
- 환경 변수: Pages 대시보드에서 Supabase URL/Key, R2 access key 등 설정

### 1-4. 그 외 고려사항

**모바일 오디오의 함정**
- iOS Safari: 사용자 제스처 없이 AudioContext 시작 불가 → 런치패드 진입 시 "탭해서 시작" 오버레이
- Howler.js는 자동 unlock 처리 → 첫 터치/클릭 이후 자유롭게 재생
- 런치패드 진입 시 12개 사운드 **사전 로드 + 디코딩** → 0ms 트리거 보장
- 클라이언트에서 한 번 로드한 샘플은 메모리 상주 + IndexedDB 캐시 고려

**브라우저 녹음 (3초 제한)**
- `MediaRecorder` API (Chrome → webm/opus, Safari → mp4/aac)
- 클라이언트에서 webm/mp4 → mp3 96kbps 변환 (lamejs) → R2 업로드 (~50KB 목표)
- 3초 자동 컷 + 앞뒤 무음 트리밍

**파일 크기/수량 추정**
- mp3 96kbps × 3초 ≈ 36KB
- R2 무료 10GB → 약 280,000개 사운드 수용 가능 (초기 차고 넘침)
- Class A operations(업로드 등) 1M/월, Class B operations(다운로드) 10M/월 무료

---

## 2. 폴더 구조

```
/everysounds
├── app/
│   ├── [locale]/                       # next-intl 라우팅 (ko, en)
│   │   ├── (tabs)/                     # 하단 탭바를 공유하는 그룹
│   │   │   ├── archive/
│   │   │   │   ├── page.tsx            # 아카이브 (탭+정렬+검색+업로드 FAB)
│   │   │   │   ├── upload/page.tsx     # 업로드 풀스크린 폼
│   │   │   │   └── [id]/page.tsx       # 사운드 상세
│   │   │   ├── launchpad/
│   │   │   │   └── page.tsx            # 런치패드 (12 패드 + 녹음)
│   │   │   ├── stage/
│   │   │   │   ├── page.tsx            # 스테이지 (공유 믹스 목록)
│   │   │   │   └── [id]/page.tsx       # 믹스 상세 (재생/좋아요)
│   │   │   └── layout.tsx              # 하단 탭바 레이아웃
│   │   ├── page.tsx                    # 루트 → /archive로 redirect
│   │   ├── layout.tsx                  # 전역 레이아웃
│   │   └── providers.tsx               # Supabase, AudioContext, DeviceId, Locale
│   ├── api/
│   │   ├── sounds/
│   │   │   ├── route.ts                # GET 목록(필터/정렬/탭) / POST 메타데이터 등록
│   │   │   ├── upload-url/route.ts     # POST: R2 presigned PUT URL 발급
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET 상세 / DELETE (device_id 검증)
│   │   │       ├── play/route.ts       # POST: play_count 증가
│   │   │       └── recommend/route.ts  # POST/DELETE 추천 토글
│   │   ├── launchpad/route.ts          # GET/PUT 내 런치패드 구성 (device_id 기준)
│   │   └── stage/
│   │       ├── route.ts                # GET 공유 믹스 목록 / POST 새 공유
│   │       ├── upload-url/route.ts     # POST: 믹스 R2 presigned URL
│   │       └── [id]/
│   │           ├── route.ts            # GET 상세 / DELETE
│   │           ├── play/route.ts       # POST: play_count 증가
│   │           └── like/route.ts       # POST/DELETE 좋아요 토글
│   ├── globals.css
│   └── middleware.ts                   # next-intl 로케일 라우팅
├── messages/
│   ├── ko.json                         # 한국어 번역
│   └── en.json                         # 영어 번역
├── components/
│   ├── nav/
│   │   └── BottomTabBar.tsx            # 아카이브/런치패드/스테이지 하단 탭
│   ├── launchpad/
│   │   ├── LaunchpadGrid.tsx           # 반응형 그리드 (3×4 모바일 / 4×3 iPad)
│   │   ├── Pad.tsx                     # 개별 패드 (트리거 + 색상 + 드래그)
│   │   ├── MixRecorder.tsx             # 1분 믹스 녹음 (시작/종료/타이머)
│   │   ├── PostRecordModal.tsx         # 녹음 후 다운로드/공유 선택 모달
│   │   └── Controls.tsx                # 마스터 볼륨
│   ├── recorder/
│   │   ├── AudioRecorder.tsx           # MediaRecorder 래퍼 (3초 cap)
│   │   └── WaveformPreview.tsx         # 파형 시각화
│   ├── archive/
│   │   ├── ArchiveTabs.tsx             # 전체/카테고리/내가등록 탭
│   │   ├── SortDropdown.tsx            # 들은순/적용순/등록순
│   │   ├── PitchFilterChip.tsx         # 음정 필터
│   │   └── UploadFab.tsx               # 우하단 + 버튼
│   ├── sound/
│   │   ├── SoundCard.tsx               # 카드 (카테고리/음정 칩, 제목, 요약, 태그칩, 듣기/추가 버튼)
│   │   ├── SoundPlayer.tsx             # 단일 재생 위젯
│   │   └── RecommendButton.tsx
│   ├── stage/
│   │   ├── StageList.tsx               # 믹스 목록
│   │   ├── StageCard.tsx               # 카드 (제목/소개/Play 버튼)
│   │   └── LikeButton.tsx
│   ├── upload/
│   │   ├── UploadForm.tsx              # 풀스크린 업로드 (제목*/카테고리*/요약*/녹음*/태그/상세)
│   │   ├── CategoryPicker.tsx          # 15개 카테고리 선택
│   │   └── TagInput.tsx                # 자유 태그 (최대 3개)
│   └── ui/                             # 버튼, 입력 등 공통
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # 브라우저용 (anon key, 읽기 전용)
│   │   ├── server.ts                   # 서버용 (service_role, 쓰기용, edge 호환)
│   │   └── types.ts                    # DB 타입 (supabase gen types)
│   ├── r2/
│   │   ├── client.ts                   # @aws-sdk/client-s3로 R2 접근
│   │   └── presign.ts                  # presigned URL 발급
│   ├── audio/
│   │   ├── engine.ts                   # Howler 래퍼 (preload, polyphony, 마스터 출력 노드)
│   │   ├── mix-recorder.ts             # MediaRecorder + AudioContext 라우팅 (런치패드 1분 녹음)
│   │   ├── pitch-detect.ts             # Pitchfinder + Hz→note 변환
│   │   └── encoder.ts                  # webm/mp4 → mp3 (lamejs)
│   ├── device/
│   │   └── identity.ts                 # localStorage device_id, nickname 관리
│   ├── categories.ts                   # 15개 카테고리 키/i18n 매핑 (한 곳)
│   ├── i18n/
│   │   └── config.ts                   # next-intl 설정
│   └── utils/
├── hooks/
│   ├── useLaunchpad.ts
│   ├── useAudioPlayer.ts
│   ├── useRecorder.ts
│   └── useDeviceId.ts                  # device_id, nickname React 훅
├── types/
│   └── index.ts
├── public/
├── .env.local                          # Supabase + R2 키
├── wrangler.toml                       # Cloudflare Pages 설정
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. DB 테이블 설계 (Supabase / Postgres)

### 3-1. ERD 요약 (로그인 없음 — `device_id` 기반)

```
device_id (클라이언트 localStorage UUID, 인증 X)
    ├─ sounds (1:N)               ─┐
    ├─ recommendations (N:M sounds)│
    ├─ launchpads (1:1)            │
    │      └─ launchpad_sounds ────┘
    ├─ stage_recordings (1:N)
    └─ stage_likes (N:M stage_recordings)
```

### 3-2. 테이블 정의

**`sounds`** — 업로드된 소리
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid (PK) | gen_random_uuid() |
| device_id | uuid (NOT NULL) | 업로더 식별 (클라이언트 localStorage UUID) |
| uploader_nickname | text (nullable) | 업로드 시 입력한 닉네임 (없으면 "익명") |
| title | text (NOT NULL) | 제목* (예: "와우") |
| summary | text (NOT NULL) | 요약* (한 줄 설명, 카드에 표시) |
| description | text (nullable) | 상세 설명 (옵션) |
| audio_key | text | R2 객체 키 (`sounds/{device_id}/{sound_id}.mp3`) |
| duration_ms | int | 최대 3000 (CHECK) |
| category | text (NOT NULL) | §3-5의 15개 영문 키 중 하나 |
| tags | text[] | 자유 태그 최대 3개 (`array_length(tags,1) <= 3` CHECK) |
| pitch | text (nullable) | 'C4', 'D#5' 등 |
| pitch_hz | real (nullable) | 정확한 주파수 (정렬용) |
| play_count | int | "들은 순" 정렬용 (POST /play로 증가) |
| launchpad_add_count | int | "적용 순" 정렬용 (트리거로 갱신) |
| recommend_count | int | (호환 유지) |
| created_at | timestamptz | default now() |

- 인덱스: `(category, play_count desc)`, `(category, launchpad_add_count desc)`, `(category, created_at desc)`, `(device_id)`, `tags` GIN, `pitch`

**`recommendations`** — 추천 (좋아요)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| sound_id | uuid (FK) | |
| device_id | uuid | 추천한 기기 |
| created_at | timestamptz | |
| PK | (sound_id, device_id) | 한 device당 1추천 |

- 트리거: insert/delete 시 `sounds.recommend_count` 증감

**`launchpads`** — 기기별 런치패드 (1 device 1개)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| device_id | uuid (PK) | |
| name | text | default 'My Launchpad' |
| updated_at | timestamptz | |

**`launchpad_sounds`** — 런치패드의 패드 슬롯 (최대 12)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| device_id | uuid (FK) | |
| position | smallint | 0~11 (반응형: 모바일 3×4 / iPad 4×3) |
| sound_id | uuid (FK → sounds.id) | |
| added_at | timestamptz | 위에서부터 차례로 채워지는 순서 보존 |
| PK | (device_id, position) | |
| CHECK | position BETWEEN 0 AND 11 | |

- 트리거: insert/delete 시 `sounds.launchpad_add_count` 증감 (전 device 합계)

**`stage_recordings`** — 런치패드에서 공유된 믹스
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid (PK) | |
| device_id | uuid (NOT NULL) | 공유자 |
| uploader_nickname | text (nullable) | |
| title | text (NOT NULL) | 음악 제목 |
| summary | text (NOT NULL) | 소개 요약 |
| audio_key | text | R2 객체 키 (`stage/{device_id}/{recording_id}.mp3`) |
| duration_ms | int | 최대 60000 (CHECK) |
| play_count | int | |
| like_count | int | denormalized |
| created_at | timestamptz | default now() |

- 인덱스: `(play_count desc)`, `(like_count desc)`, `(created_at desc)`

**`stage_likes`** — 스테이지 좋아요
| 컬럼 | 타입 | 비고 |
|------|------|------|
| recording_id | uuid (FK) | |
| device_id | uuid | |
| created_at | timestamptz | |
| PK | (recording_id, device_id) | |

- 트리거: insert/delete 시 `stage_recordings.like_count` 증감

### 3-3. 보안 정책 (로그인 없음 → 서버 매개)

로그인이 없어 Supabase RLS의 `auth.uid()` 검증이 불가능하므로:

- **클라이언트(브라우저)**: Supabase **anon key**로 SELECT만. RLS는 모든 테이블 SELECT 전체 허용 + INSERT/UPDATE/DELETE 전부 차단
- **서버(API 라우트)**: Supabase **service_role key**로 모든 쓰기 수행. 클라이언트가 보낸 `device_id`를 그대로 신뢰하되, DELETE/UPDATE 시 row의 `device_id`와 요청자 `device_id` 비교
- **device_id 전달 방식**: API 요청 헤더 `X-Device-Id`로 전송 (또는 body)
- **악용 방지**: 추후 Cloudflare Turnstile (무료 CAPTCHA) 또는 IP 기반 rate limit (Pages function) 추가 검토

### 3-4. 오디오 파일 저장 (Cloudflare R2)

- 버킷명: `everysounds-audio` (1개)
- 객체 키 규칙: `{device_id}/{sound_id}.mp3`
- 공개 접근: R2 Public Bucket 활성화 → `https://pub-xxx.r2.dev/{device_id}/{sound_id}.mp3` 로 직접 재생
- 업로드 흐름:
  1. 클라이언트가 `/api/sounds/upload-url` 호출 (헤더 `X-Device-Id` 포함) → 서버가 R2 presigned PUT URL 발급
  2. 클라이언트가 webm/mp4 → mp3 96kbps 인코딩 (lamejs)
  3. 클라이언트가 presigned URL로 PUT (서버 거치지 않음)
  4. 클라이언트가 `/api/sounds` POST로 metadata(device_id, nickname, title, category, tags, pitch 등)와 객체 키를 Supabase에 저장
- 업로드 정책 (서버에서 검증):
  - 파일 크기 200KB 제한
  - mime type `audio/mpeg`만 허용
  - presigned URL 만료 시간 60초
- 삭제: DELETE `/api/sounds/[id]` → row의 device_id와 요청 device_id 일치 확인 → R2 객체 삭제 + DB 레코드 삭제

### 3-5. 카테고리 (14개 고정) + 비트박스 태그 가이드

소리 종류는 **단일 선택 14개 카테고리** + **자유 태그 다중 입력**(최대 5개)으로 분류.
DB는 영문 키(`category` 컬럼)로만 저장, 표시 라벨은 i18n 메시지로 관리.

| key | 한국어 | English | 추천 태그 / 예시 |
|-----|--------|---------|-------------------|
| `voice` | 보이스 | Voice | 말, 노래, 웃음, 울음, 비명, 속삭임, 한숨 |
| `beatbox` | 비트박스 | Beatbox | (§3-5-1 표기법 참고) |
| `body` | 신체음 | Body | 박수, 핑거스냅, 찰싹(slap), 노크, 발소리, 숨소리 |
| `mouth` | 입소리 | Mouth | 휘파람, 혀차기, 키스, 트림, 입술떨기, 가글 |
| `percussion` | 타악기 | Percussion | 드럼, 심벌, 마림바, 탬버린, 봉고, 캐스터네츠 |
| `strings` | 현악기 | Strings | 기타, 바이올린, 첼로, 우쿨렐레, 하프, 가야금 |
| `wind` | 관악기 | Wind & Brass | 플루트, 색소폰, 트럼펫, 하모니카, 단소 |
| `keys` | 건반 | Keys | 피아노, 오르간, 신디사이저, 하프시코드 |
| `electronic` | 전자음 | Electronic | 신디, 비프, 글리치, 8비트, 노이즈 |
| `animal` | 동물 | Animal | 강아지, 고양이, 새, 곤충, 소, 닭 |
| `nature` | 자연 | Nature | 바람, 비, 천둥, 물, 파도, 불 |
| `environment` | 환경 | Environment | 교통, 군중, 거리, 공사장, 사이렌 |
| `object` | 사물 | Object | 문, 유리, 종이, 나무, 금속, 식기 |
| `sfx` | 효과음 | SFX | 와우, 뿅, 짜잔 등 의성어/만화 효과음 |
| `other` | 기타 | Other | 위에 없음 |

> "찰싹"은 영어로 **slap**, 한국어 카테고리상 **신체음(body)** 태그로 처리합니다.

#### 3-5-1. 비트박스 카테고리의 추천 태그 (Standard Beatbox Notation 참고)

비트박스는 음악 커뮤니티에서 **SBN (Standard Beatbox Notation)** 이라는 비공식 표기법으로 소리를 분류함. 우리 앱에서는 사용자가 자유 태그로 아래 키워드를 입력할 수 있도록 추천 칩으로 노출:

| 분류 | 태그 (한/영) | SBN 표기 예 |
|------|--------------|--------------|
| 킥 | `킥` / `kick` | `{ b }`, `{ bf }` (boots 류) |
| 스네어 | `스네어` / `snare` | `{ Pf }`, `{ K }`, `{ Psh }` |
| 하이햇 | `하이햇` / `hi-hat` | `{ t }`, `{ ts }` |
| 심벌 | `심벌` / `cymbal` | `{ Tsh }` |
| 베이스 | `베이스` / `bass` | throat bass, lip bass, inward bass |
| 클릭롤 | `클릭롤` / `click-roll` | `{ Krrr }` |
| 스크래치 | `스크래치` / `scratch` | DJ-scratch 흉내 |
| 사이렌 | `사이렌` / `siren` | 음높이 변화 사운드 |
| 보컬 | `보컬` / `vocals` | 비트 위 멜로디 |

사용자는 자유 입력이므로 위 추천을 따르지 않아도 되지만, 칩 형태로 노출하면 비트박스 사운드 검색이 일관됨.

---

## 4. 페이지 구성

모든 경로 앞에는 로케일 prefix가 붙음 (`/ko/...`, `/en/...`). 아래 표에서는 생략.

| 경로 | 페이지 | 핵심 기능 |
|------|--------|-----------|
| `/` | 홈/랜딩 | 인기 사운드 Top 12, 카테고리 진입, 시작하기 CTA |
| `/archive` | 아카이브 | 카테고리 탭(14개) + 정렬(추천순/최신순) + 태그 검색 |
| `/archive/[category]` | 카테고리 뷰 | 해당 카테고리만 필터, 음정별 그룹핑 옵션 |
| `/sounds/[id]` | 사운드 상세 | 파형, 재생, 추천, "런치패드에 추가", 닉네임 표시 |
| `/upload` | 업로드 | 녹음/파일선택 → 3초 컷 → 음정 감지 → 닉네임/카테고리/태그/설명 입력 → 업로드 |
| `/launchpad` | **나의 런치패드 (핵심)** | 4x3 패드 그리드, 사운드 트리거, 마스터 볼륨 |
| `/mine` | 내가 올린 소리 | device_id로 필터한 본인 업로드 목록 (삭제 가능) |

> 로그인 페이지 없음. 닉네임은 업로드 폼 안에서 직접 입력/편집 (localStorage에 마지막 값 저장).

### 4-1. 런치패드 페이지 상세 (반응성 핵심)

- 진입 시 12개 사운드를 **병렬 fetch + AudioBuffer로 디코딩**해서 메모리 상주
- 패드 터치/클릭 → 0ms 트리거 (preloaded buffer.start())
- 동시 폴리포니 지원 (여러 패드 동시 재생)
- iOS: 첫 진입 시 "탭해서 시작" 오버레이로 AudioContext 활성화
- 키보드 단축키 매핑 (1~9, q, w, e — 12키)
- 마스터 볼륨 슬라이더

### 4-2. /mine 페이지 — "내가 올린 소리"

- 진입 시 localStorage에서 device_id 읽고 `/api/sounds/mine` 호출
- device_id가 없으면 (= 첫 방문이거나 데이터 삭제) "아직 업로드한 소리가 없어요" 안내
- 각 카드에 삭제 버튼 (DELETE 호출 시 device_id 검증)
- **주의 안내 문구**: "브라우저 데이터를 삭제하거나 다른 기기를 쓰면 이 목록에 접근할 수 없어요"

---

## 5. MVP 단계별 로드맵

**Phase 0 — 인프라 셋업 (0.5주)**
- Next.js 15 프로젝트 생성 (App Router + TypeScript + Tailwind)
- next-intl 설정 + ko/en 메시지 스켈레톤
- Supabase 프로젝트 생성, 테이블 정의, RLS 정책 적용 (anon = SELECT only, 쓰기는 service_role)
- Cloudflare R2 버킷 생성, public access 설정, access key 발급
- GitHub repo → Cloudflare Pages 연결, `@cloudflare/next-on-pages` 빌드 설정
- `.env.local` + Pages 환경 변수 동기화
- device_id 발급/저장 hook (`useDeviceId`) + 닉네임 관리
- 헬로월드 배포 확인 (xxx.pages.dev)

**Phase 1 — Read-only 아카이브 (1주)**
- 14개 카테고리 라벨/라우팅
- 아카이브 목록 (정렬, 카테고리 필터, 태그 검색)
- 사운드 상세 페이지
- 시드 사운드 수동 업로드 (R2 직접 + DB 직접 insert)

**Phase 2 — 업로드 + 추천 (1주)**
- MediaRecorder 기반 녹음 페이지 (3초 제한)
- 클라이언트 mp3 인코딩 (lamejs)
- Pitchfinder로 음정 감지 → DB 저장
- presigned URL 발급 + R2 직접 업로드
- 닉네임/카테고리/태그/설명 입력 폼
- 추천 토글 + 랭킹 정렬
- /mine 페이지 (내가 올린 소리)

**Phase 3 — 런치패드 (1주)**
- 사운드 12개 선택 UI (아카이브 카드에 "런치패드에 추가" 버튼)
- 4x3 그리드 + Howler preload + 폴리포니
- 모바일 터치 최적화 (탭하여 시작 오버레이)
- 키보드 단축키 매핑
- 마스터 볼륨

**Phase 4 — 디제잉 기능 (선택, 나중에)**
- 시퀀스 녹음/공유
- 필요 시 Tone.js 도입 (BPM, 이펙트 — 리버브/딜레이/필터 등)

---

## 6. 결정 사항 정리 & 남은 항목

### 확정
- ✅ 오디오 라이브러리: **Howler.js** (BPM/이펙트는 Phase 4 이후)
- ✅ 카테고리: **14개 고정 + 자유 태그**, 음정만 자동 감지(Pitchfinder)
- ✅ 인프라: **Cloudflare Pages + R2 + Supabase(DB only)**
- ✅ 사용자 식별: **로그인 없음, device_id (localStorage UUID) 기반**, 닉네임은 업로드 시 입력
- ✅ 공개 범위: **모두 공개**, 비공개 옵션 없음
- ✅ 다국어: **한국어 / 영어 (next-intl)**

### 시작 전 마지막 확인
1. 14개 카테고리 라벨 (§3-5) 그대로 진행해도 OK?
2. 자유 태그 최대 5개 / 제한 없음 / 다른 숫자 — 어떻게?
3. /mine 페이지 진입 경로 — 헤더 메뉴? 우측 하단 floating? (UI 디테일이라 코드 작성 중에 결정해도 됨)

OK 사인 주시면 Phase 0(인프라 셋업)부터 코드 작성 시작합니다.
