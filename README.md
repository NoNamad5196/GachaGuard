# GachaGuard

가챠 결제·월 예산·천장(pity)을 기록하는 Next.js 16 App Router 앱입니다.
Firebase Google Auth와 서버 `firebase-admin` Cloud Firestore를 사용하며,
SipSungJang / OtakuHub와 동일한 Firebase 프로젝트와 UID를 공유합니다.
Cloud Functions, Blaze, 유료 API는 사용하지 않습니다.

## 로컬 실행

Node 24와 Java 21을 사용합니다.

```sh
npm ci
npm run dev
```

Firebase 환경 변수가 없으면 기존 **읽기 전용 데모**로 실행됩니다.
실제 로그인 설정은 `.env.example`을 참고해 로컬 `.env.local`에만 넣습니다.
비로그인 방문자도 데모를 볼 수 있으며 저장은 인증이 필요합니다.
Google 결제 파일(JSON/CSV/Takeout ZIP)은 브라우저에서 파싱하고 원본 파일을 업로드하지 않습니다.

## 인증과 데이터 경계

- 브라우저는 Google popup을 시도하고 차단되면 redirect로 전환합니다.
- 서버 세션 라우트가 ID token을 검증한 뒤 HttpOnly 세션 쿠키를 발급합니다.
- 서버 읽기/쓰기의 UID는 검증한 세션에서만 유도합니다. Admin SDK는 rules를 우회합니다.
- 클라이언트는 개인 가챠 데이터에 직접 쓰지 않습니다. 서버가 입력과 참조 소유권을 검사합니다.
- 실제 결제/월 예산 계산은 `payments`만 사용합니다. pull 비용은 결제 원장에 중복 합산하지 않습니다.
- import는 지문 hash ID와 트랜잭션으로 멱등 처리하고, 반복 결제도 결정적 ID를 사용합니다.
- pity 변경은 tracking revision 기반 트랜잭션으로 후속 결과·집계·표시 캐시를 함께 갱신합니다.

권위 계약: **SipSungJang `feat/otakus-firebase:docs/otakus-firestore-contract.md`**.
이 저장소의 `firestore.rules`는 로컬 검증용 계약 스냅샷입니다. 운영 배포는 해당 SipSungJang 브랜치의
최신 `firestore.rules`와 `firestore.indexes.json`을 검토하여 그 저장소에서 수행합니다.
이 작업은 어떠한 운영 rules/데이터도 배포하지 않습니다.

## Firebase Console / Vercel 수동 설정

1. **SipSungJang과 같은 프로젝트**를 선택하고 Spark 요금제를 유지합니다.
2. Firebase Authentication → Sign-in method → Google을 활성화하고 지원 이메일을 지정합니다.
3. Authentication → Settings → Authorized domains에 실제 GachaGuard 운영 도메인,
   필요한 고정 Vercel preview 도메인, 로컬 테스트용 `localhost`를 추가합니다.
   Firebase Web app의 `authDomain`을 사용하며 redirect 로그인에는 브라우저의 제3자 저장소 제한을
   고려해야 합니다. 임의 preview wildcard를 허용했다고 가정하지 마세요.
4. Cloud Firestore 기본 데이터베이스를 Native/Standard 모드로 준비합니다.
   테스트 모드 공개 규칙을 운영에 사용하지 않습니다.
5. Project settings → Your apps에서 Web app 설정을 확인하고 Vercel Production/Preview/Development에
   `.env.example`의 `NEXT_PUBLIC_FIREBASE_*`를 설정합니다. 프로젝트 ID는 서버 설정과 같아야 합니다.
6. Project settings → Service accounts에서 서버용 키를 발급합니다. 키 JSON은 저장소에 넣지 않고
   Vercel 서버 환경 변수 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`에만
   각각 설정합니다. private key 개행은 실제 개행 또는 `\n` 형식을 사용합니다.
7. 운영자가 SipSungJang `feat/otakus-firebase`의 공유 rules/index를 검토·배포합니다.
   이 저장소에서는 deploy 명령을 실행하지 않습니다. Admin 권한도 최소화하세요.
8. 아래 이관 문서를 따라 검증된 UID/게임 매핑을 만들고 dry-run 결과를 검토합니다.
   빈 Firestore에 데모 데이터가 자동 저장되지는 않습니다. 공유 카탈로그와 gameConfigs를 별도로 준비합니다.
9. Vercel에서 환경 변수를 반영한 새 빌드를 수행하고 실제 도메인에서 Google 로그인/로그아웃을 수동 확인합니다.

## 데이터 경로

`G = users/{uid}/gacha/main`이며 네임스페이스 `gacha/main` 문서는 만들지 않습니다.

| 기존 Supabase table | Firestore |
| --- | --- |
| profiles | users/{uid}.profile/account + G/settings/preferences |
| games | games/{gameId} + modules/gacha/gameConfigs/{gameId} |
| user_games | users/{uid}/games/{entryId} + G/gameStates/{entryId} |
| budgets | G/budgets/{YYYY-MM} |
| payments | G/payments/{paymentId} |
| payment_templates | G/paymentTemplates/{id} |
| banners | 공개 modules/gacha/banners/{id}, 개인 G/banners/{id} |
| user_banners | G/userBanners/{public-or-private-bannerId} |
| pull_sessions, pulls | G/pullSessions/{sessionId}, G/pulls/{sessionId}-{pull_number} |
| gacha_logs, guardrail_rules | G/gachaLogs/{id}, G/guardrailRules/{id} |

Agent 신호를 추가하는 경우 `users/{uid}/agentSignals/{signalId}`만 사용합니다.
무소유 공통 Agent 토큰이나 자동 신호 발송은 구현하지 않습니다.
기존 `supabase/` SQL과 seed는 **역사적 참고**이며 앱 런타임/설치 절차가 아닙니다.
이관 방법과 제약은 [이관 문서](docs/firebase-migration.md)를 참고하세요.

## 검증

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:emulator
npm run build
npx playwright install chromium
npm run test:e2e
```

`test:emulator`는 `demo-otakus`의 Firestore/Auth 에뮬레이터만 시작합니다.
실제 프로젝트 alias나 비밀키는 필요하지 않습니다. 통합 테스트는 두 에뮬레이터 환경 변수가
없으면 거부합니다. E2E는 별도 dev 서버(`127.0.0.1:3100`)의 데모 화면을 "인증 활성·로그아웃" 상태로 검사합니다.
Firebase 환경 변수가 없으면 `scripts/run-e2e.mjs`가 서버 전용 `demo-otakus` 에뮬레이터 식별값만 주입합니다
(세션 쿠키가 없으므로 Firebase에 접속하지 않고 읽기 전용 데모 데이터를 보여 줍니다).
다른 포트는 `GACHAGUARD_E2E_PORT`로 지정할 수 있습니다.
CI는 Java 21 Temurin 및 Node 24에서 lint/typecheck/unit/emulator/build/E2E를 실행합니다.

기존 설정 화면의 CSV export, email reports, 전체 초기화는 여전히 비활성입니다.
에뮬레이터는 운영 복합 index 필요 여부와 실제 Google OAuth 도메인 정책을 완전히 검증하지 않습니다.
