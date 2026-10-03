# 2026_autumn_odal

ODAL은 한국어 개인용 할 일 서비스입니다. Node.js 기반 Next.js가 화면과 API를 제공하고 PostgreSQL에 계정과 할 일을 저장합니다.

## 기능

- 가입, 로그인, 로그아웃과 계정별 데이터 저장
- 가입 없이 사용할 수 있는 독립된 체험 목록
- 오늘, 예정, 보관함, 프로젝트별 목록
- 할 일 생성, 수정, 완료, 완료 취소
- 기한, 우선순위, 메모, 체크리스트
- 매일, 매주, 매월 반복
- 검색, 정렬, 완료 기록
- 휴지통 이동과 복원
- 프로젝트 생성, 이름과 색상 수정, 보관과 복원
- 시간대 설정과 JSON 내보내기
- 키보드 단축키와 휴대폰 화면 대응

## 로컬 실행

Node.js 24와 Docker Desktop이 필요합니다.

```sh
npm ci
npm run db:up
npm run dev
```

브라우저에서 `http://127.0.0.1:3040`을 엽니다. 데이터는 Docker 볼륨에 유지됩니다. `docker compose down`은 데이터 볼륨을 삭제하지 않습니다.

`npm run db:up`은 로컬 환경 파일을 준비하고 PostgreSQL이 접속 가능한 상태가 된 뒤 테이블을 생성합니다. 이미 만들어진 환경 파일과 데이터는 유지합니다. Docker가 다시 시작되면 DB도 자동으로 시작됩니다. 직접 중지한 DB는 `npm run db:up`으로 다시 시작할 수 있습니다.

```sh
npm run db:status
npm run db:stop
```

운영 사이트는 Neon PostgreSQL을 사용하고 이 Docker DB는 로컬 개발에 사용합니다.

## Docker로 전체 실행

```sh
node scripts/setup-local.mjs --docker
docker compose up --build -d
```

브라우저에서 `http://localhost:3040`을 엽니다. 데이터베이스 준비 후 마이그레이션이 실행되고 앱이 시작됩니다. 컨테이너는 일반 사용자 권한으로 실행됩니다.

## DBeaver 연결

로컬 개발 데이터베이스 연결값입니다. PostgreSQL 연결을 만들고 아래 값을 입력합니다.

| 항목     | 값              |
| -------- | --------------- |
| Host     | localhost       |
| Port     | 5438            |
| Database | odal            |
| Username | odal            |
| Password | odal_local_only |

`users`, `sessions`, `projects`, `tasks` 테이블에서 저장된 내용을 확인할 수 있습니다. 위 비밀번호는 로컬 전용입니다. Docker 포트는 이 컴퓨터에서만 접근할 수 있도록 설정했습니다.

운영 데이터베이스를 DBeaver에 연결하려면 Neon에서 별도 연결값을 확인하고 SSL을 활성화합니다. 운영 연결값과 비밀번호를 Git에 저장하지 않습니다.

## Vercel 배포

1. GitHub 저장소를 Vercel 프로젝트에 연결합니다.
2. Neon PostgreSQL을 연결합니다. `DATABASE_URL`은 풀링 연결값을 사용합니다.
3. 32자 이상인 임의의 `AUTH_SECRET`을 운영 환경에 설정합니다.
4. 운영 데이터베이스에 `scripts/migrate.mjs`를 실행합니다.
5. `main` 변경을 배포합니다.

배포 후 `/api/health`와 브라우저에서 할 일 추가, 편집, 완료, 새로고침을 확인합니다. 새로운 SQL 마이그레이션은 운영 데이터베이스에 먼저 적용해야 합니다. Vercel 서버에 로컬 Docker 데이터베이스를 연결하는 방식은 사용하지 않습니다.

## 검사

```sh
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm audit
```

연결 검사는 로컬 환경에 임시 계정을 만들고 실행 후 삭제합니다. CI는 별도의 PostgreSQL을 사용합니다. 서버가 실행 중이어야 연결 검사를 수행할 수 있습니다.

## 구조

```text
src/app/api/       계정, 할 일, 프로젝트 API
src/components/   화면과 편집 패널
src/lib/          검증, 날짜 처리, 세션, DB 연결
db/migrations/    순서대로 적용하는 SQL
scripts/          초기 설정, 마이그레이션, 연결 검사
docs/             디자인 근거와 API 설명
```

디자인 자료와 서비스용 브리프는 [docs/design.md](docs/design.md), API는 [docs/api.md](docs/api.md)에 정리했습니다. 참고 서비스의 코드와 브랜드 자산을 복제하지 않았습니다.

## 범위

이 버전은 개인용 목록에 집중합니다. 이메일 인증, 비밀번호 재설정, 외부 알림, 팀 공유와 실시간 공동 편집은 포함하지 않습니다. 여러 탭의 목록은 다시 열거나 1분마다 갱신됩니다. 체험 계정 세션은 7일, 일반 세션은 30일 유지됩니다. 계정별로 할 일 5,000개와 프로젝트 100개를 보관할 수 있습니다. 이메일 발송이나 유료 서비스 API는 사용하지 않습니다.
