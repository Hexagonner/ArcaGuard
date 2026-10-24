# ArcaGuard

광고 및 사용자 정의 주제를 관리하는 아카라이브 관리자 보조 Tampermonkey Userscript.
현재 버전은 **Phase 0: 개발 기반**입니다.
설정 패널의 기본 동작만 확인할 수 있으며 광고 탐지, 신고 감시, 관리자 권한 검사,
운영 설정 저장, 글머리 이동은 아직 구현하지 않았습니다. 버튼 위치 저장은 지원합니다.

공개 저장소: [Hexagonner/ArcaGuard](https://github.com/Hexagonner/ArcaGuard).
Git 및 Tampermonkey 개발 연결 상태/설치 절차는 [SETUP.md](docs/SETUP.md)를 참조하세요.

## 개발 시작 (PowerShell)

Node.js 24 LTS 권장 (개발 검증: 24.14.0). 정확한 지원 범위는 `package.json`을 참조하세요.

```powershell
Set-Location 'C:\Users\Hexa\Desktop\arcalive'
npm install
npm run dev
```

`http://127.0.0.1:5173/preview.html`을 열고 오른쪽 아래 **ArcaGuard** 버튼을 누르세요.
패널을 닫거나 Escape 키를 눌러 닫고, **화면 동작 확인**으로 응답을 확인할 수 있습니다.
로컬 미리보기는 Tampermonkey 없이 실행됩니다.
버튼을 드래그하거나 버튼에 초점을 맞추고 **Alt + 방향키**로 위치를 옮길 수 있습니다.
위치는 같은 브라우저의 같은 사이트에서 기억하며, 패널의 **기본 위치로 되돌리기**로 초기화합니다.
사이트 저장소가 차단되면 현재 화면에서만 유지되고 안내가 표시됩니다.
화면 크기가 바뀌면 버튼과 패널이 화면 안에 들어오도록 배치합니다.
이 저장소에서는 현재 작업 폴더 자체를 프로젝트 루트로 사용합니다.

## 빌드 및 설치

```powershell
npm run lint
npm run test
npm run build
```

출력: `dist/ArcaGuard.user.js`. Tampermonkey의 새 스크립트 편집기에 파일 내용을
붙여넣고 저장하면 됩니다. 적용 범위는 `https://arca.live/*`, iframe 실행은 제외하며
Phase 0은 `@grant none`을 사용합니다. 이 단계는 UI만 삽입하며 사이트 데이터를 읽거나 변경하지 않습니다.
설치 후 실사이트 동작은 별도 승인하에 확인하며, 현재 검증 여부는 `docs/PHASE_STATUS.md`를 참조하세요.

개발용 Userscript 연결은 개발 서버 실행 후
`http://127.0.0.1:5173/__vite-plugin-monkey.install.user.js`에서 제공됩니다.
이는 로컬 개발 서버에 연결하는 개발 전용 스크립트입니다. 배포 파일과 함께 설치하지 마세요.
브라우저의 로컬 네트워크/혼합 콘텐츠 정책과 Tampermonkey 설정에 따라 별도 설정이 필요할 수 있습니다.
일반 UI 확인은 로컬 미리보기를 사용하세요.

`npm run test:watch`: 테스트 변경 감시. `npm run check`: lint, test, build 순차 실행.
빌드는 메타데이터와 JavaScript 구문 검사까지 실행합니다.
`npm ci`는 lockfile에 고정한 의존성 재설치에 사용할 수 있습니다.

## 현재 범위와 문서

- 안전한 표시 상태: Simulation, 감시 OFF, 자동 이동 OFF, 권한 미검증.
- 향후 광고 글 이동은 현재 화면/스크롤/입력을 방해하지 않는 백그라운드 처리로 구현합니다.
  성공마다 팝업을 띄우지 않고 조용한 기록을 기본으로 하며, 검증된 백그라운드 경로가 없으면 이동을 보류합니다.
- 관리 동작, 삭제, 차단 기능은 포함하지 않습니다.
- 브라우저가 종료되거나 실행 페이지가 없을 때 동작을 보장하지 않습니다.
- [개발 계획](docs/PLAN.md), [최신 요구사항](docs/REQUIREMENTS.md),
  [도구 정책 및 연결 점검](docs/TOOLING.md), [완료 보고](docs/PHASE_STATUS.md),
  [사이트 검증 현황](docs/SITE_VERIFICATION.md).
- MCP와 프로젝트 Skills는 개발 전용입니다. 최종 사용자에게 Node/npm/Codex 설치를 요구하지 않습니다.
- 다음 단계는 Phase 1이며 사용자의 단계 승인 후 진행합니다.

## 지정된 테스트 조건 (구현 전)

운영 채널과 이동 대상 탭은 **사용자가 설정 화면에서 채널별로 선택·변경**하도록 설계합니다.
초기 채널/대상은 미설정입니다. [prlvate](https://arca.live/b/prlvate) → `TEST`는
개발 테스트용 예시이며 고정값이나 자동 등록 기본값이 아닙니다. 실제 권한과 탭은 아직 검증하지 않았습니다.
신고 링크/신고자 이름·계정 식별값/신고 내용을 확인하고, `광고`가 포함된 신고를 선정하며,
같은 사용자의 같은 대상 반복 신고는 각각의 유효 카운터에 한 번만 집계하도록 설계합니다.
이미 처리되었거나 다른 관리자가 이동한 것으로 확인된 글은 추가 이동하지 않습니다.
세부 조건과 한계는 [운영 요구사항](docs/OPERATING_REQUIREMENTS.md),
초기 제공 원문은 [Specification 1.0](docs/archive/SPECIFICATION_1.0.md)을 참조하세요.

## 사용자 정의 주제와 이미지 링크 (구현 전)

리딩방/쇼핑몰 링크 같은 광고 주제 외에도 거래글/스포일러 등 원하는 주제를 추가하고,
주제별 탐지 조건·예외·검토/이동 방식을 설정하도록 설계합니다. 주제 이름만으로 자동 분류를 보장하지 않습니다.
사진에 걸린 실제 링크 목적지는 이미지 파일 주소와 구별하고 OCR/QR과 독립적으로 검사합니다.
일반 이미지 확대나 외부 링크만으로 광고를 확정하지 않으며 자동 삭제/계정 차단은 지원하지 않습니다.
세부 기준은 [주제 정책](docs/TOPIC_POLICIES.md)을 참조하세요.

빌드 구조는 [vite-plugin-monkey 공식 가이드](https://vite-plugin-monkey.pages.dev/guide/getting-started)와
[ArcaRefresher 설정](https://github.com/lekakid/ArcaRefresher/blob/develop/vite.config.js)을 참고했습니다.
외부 프로젝트의 소스코드를 복사하지 않았고 런타임 의존성으로 사용하지 않습니다.

라이선스: MIT. 프로젝트 배포 시 `LICENSE`를 함께 보관하세요.
