# 개발 환경 및 Tampermonkey/Git 연결

확인일: **2026-10-24 (Asia/Seoul)**. 환경 연결과 단계 승인은 별개이며 현재 범위는 `PHASE_STATUS.md`를 따른다.

## 현재 상태

- Node.js 24.14.0, npm 11.19.1, Git 2.53.0.windows.1 사용 가능.
- `npm run check`: lint/테스트 33개/build 및 생성 번들 실행 검사 성공.
- 로컬 저장소: 현재 프로젝트 폴더, 브랜치 `main`.
- 공개 원격 저장소: [Hexagonner/ArcaGuard](https://github.com/Hexagonner/ArcaGuard).
- 원격 이름: `origin`, URL: `https://github.com/Hexagonner/ArcaGuard.git`.
- 실제 이메일을 공개 커밋에 넣지 않도록 이 저장소의 작성자만 GitHub ID 기반 noreply 주소로 설정.
  전역 Git 설정은 변경하지 않는다. 자격 증명은 저장소에 기록하지 않는다.
- Chrome 설치 파일은 존재한다. Tampermonkey 설치와 사용자 스크립트 허용은 **사용자 확인 완료**다.
- ArcaGuard 개발 스크립트도 **실제 Chrome에서 설치 완료 — 사용자 확인**이다.
- 실제 Chrome의 확장 연결을 통해 로컬 미리보기 열기/패널/응답/드래그/키보드 이동/
  새로고침 후 위치 복원/초기화를 직접 검증했다. 내장 브라우저와 구별한다.
- Tampermonkey 내부 페이지는 도구의 URL 정책, arca.live는 사이트 안전 정책으로 직접 접근이 차단됐다.
  다른 경로로 우회하지 않았다. 사용자가 아카라이브의 버튼/패널/화면 응답이 모두 정상이라고 확인했다.
  실제 사이트 DOM/관리자 권한/신고/이동 및 자동 핫 리로드는 에이전트 직접 미검증이다.

## Tampermonkey 개발 연결 (Chrome에서 한 번 설치)

1. 프로젝트에서 `npm run dev` 실행. 현재 개발 서버는 `http://127.0.0.1:5173`에 기동했다.
2. **Tampermonkey가 설치된 Chrome**에서 아래 주소를 직접 연다.

   `http://127.0.0.1:5173/__vite-plugin-monkey.install.user.js`

3. Tampermonkey 설치 화면에서 `server:ArcaGuard (Phase 0)` 개발 스크립트를 확인해 설치한다.
   실제 표시 이름은 플러그인의 개발 접두사 표시를 따른다.
4. 설치 후 해당 스크립트를 활성화하고 적용 대상은 `https://arca.live/*`인지 확인한다.
   현재 스크립트는 UI만 삽입하고 글/신고를 읽거나 이동하지 않는다.
5. 개발 서버가 켜져 있는 동안 수정 사항을 개발 스크립트가 불러오는 방식이다.
   Chrome/Tampermonkey의 로컬 네트워크·콘텐츠 실행 정책에 의해 차단되면 미연결로 남기고,
   보안 경고를 임의로 우회하지 않는다. 실제 오류를 확인해 필요한 설정만 별도로 검토한다.

개발 설치 주소와 `/preview.html`은 HTTP 200, 개발 스크립트의 Userscript 헤더를 확인했다.
이 서버 응답 검증과 사용자가 확인한 Chrome 설치, 실제 페이지 실행 검증은 서로 구별한다.
프로세스가 종료되면 다시 `npm run dev`로 시작해야 하며 상시 서비스는 아니다.
화면 소스를 수정한 뒤 로컬 Chrome을 새로고침하여 최신 화면을 확인했다.
새 위치 기능을 실제 아카라이브에 적용할 때도 페이지를 새로고침한다.
버튼 위치는 사이트별 localStorage의 전용 키에만 저장하며 localhost와 arca.live 간 공유되지 않는다.

## 관리자 화면 및 숨김 복구 (이번 UI 보완)

- 패널의 **관리자 설정 열기** 또는 **Alt + Shift + G**로 사이트 내 전용 화면을 연다.
- **ArcaGuard 버튼 표시**: OFF면 버튼을 완전히 숨긴다. **버튼 위치 고정**: ON이면 이동/초기화를 막는다.
- 숨김 후에도 단축키로 다시 열어 표시 ON으로 복원한다. 단축키는 IME 조합 중에는 동작하지 않는다.
- 새 스크립트의 Tampermonkey 메뉴에 **ArcaGuard 관리자 설정** 복구 항목을 등록한다.
  이는 [공식 메뉴 API](https://www.tampermonkey.net/documentation.php?q=GM_registerMenuCommand)를 사용한다.
  해당 API는 runtime adapter에 두며 메뉴 선택 전에는 화면을 열지 않는다.
- 이전 개발 설치는 설치 주소를 다시 열어 **업데이트/재설치**한 뒤 사이트를 새로고침한다.
  메뉴용 메타데이터/개발 연결 키가 바뀌었으므로 이전 wrapper의 새로고침만으로 연결을 보장하지 않는다.
  빌드 파일 설치 방식이면 새 `dist/ArcaGuard.user.js`로 교체한다. 개발/빌드본 중 하나만 활성화한다.
- 배포 빌드의 유일한 grant는 `GM_registerMenuCommand`다. 추가 네트워크/쿠키/저장 API 권한은 없다.
  개발용 wrapper는 vite-plugin-monkey가 생성하는 개발 메타데이터이므로 배포 권한 검사와 구별한다.
- 실제 Chrome localhost에서 고정/숨김/새로고침 유지/단축키 복구/고정 해제 후 이동을 직접 검증했다.
  Tampermonkey 메뉴 선택은 실제 확장 화면 접근 제한으로 직접 검증하지 못했다.
  메뉴 어댑터와 빌드 실행 검사는 API를 Mock하여 등록/콜백/숨김 후 복구를 확인했다.
- 표시/고정은 위치와 별도 버전 키에 저장한다. 저장 차단 시 현재 화면에만 적용됨을 알린다.
  기존 위치 값은 보존하며 같은 origin/브라우저에서 새로고침 후 복원한다. 열린 다른 탭에 즉시 동기화하지 않는다.

## 빌드 파일로 설치하는 대안

`npm run build` 후 `dist/ArcaGuard.user.js`를 Tampermonkey의 새 스크립트 편집기에
붙여넣고 저장한다. 이 방식은 개발 서버가 필요 없지만 수정 후 다시 빌드/설치해야 한다.
같은 프로젝트의 개발 스크립트와 빌드본을 동시에 켜지 않는다.

확장 자체가 필요하면 [공식 Chrome 웹 스토어](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)에서 설치한다.
현재 Chrome에서는 확장 세부정보의 **사용자 스크립트 허용** 설정을 확인한다.
[Tampermonkey 공식 Q209](https://www.tampermonkey.net/faq.php?q=Q209)가 안내하는 실행 권한이며,
이 프로젝트는 전역 개발자 모드나 다른 보안 설정을 자동으로 변경하지 않는다.

## Git 작업

```powershell
git status
git pull --ff-only
npm run check
git add <수정한 파일>
git commit -m "변경 설명"
git push
```

신규 PC에서는 위 공개 저장소를 clone한 뒤 `npm ci`로 개발 의존성을 설치한다.
node_modules/dist/환경 변수 파일/로컬 자격 증명 관련 경로는 추적하지 않는다.
일반 사용자가 설치할 스크립트는 로컬 빌드로 생성하며, 이 공개 저장소는 아직 Phase 0 소스다.
자동 탐지/이동 기능이 완성된 릴리스로 안내하지 않는다.
