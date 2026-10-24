# 개발 환경 및 Tampermonkey/Git 연결

확인일: **2026-10-24 (Asia/Seoul)**. 환경 연결 작업이며 Phase 1 이후 기능 구현 승인이 아니다.

## 현재 상태

- Node.js 24.14.0, npm 11.19.1, Git 2.53.0.windows.1 사용 가능.
- `npm run check`: lint/기존 테스트 3개/build 및 생성 번들 실행 검사 성공.
- 로컬 저장소: 현재 프로젝트 폴더, 브랜치 `main`.
- 공개 원격 저장소: [Hexagonner/ArcaGuard](https://github.com/Hexagonner/ArcaGuard).
- 원격 이름: `origin`, URL: `https://github.com/Hexagonner/ArcaGuard.git`.
- 실제 이메일을 공개 커밋에 넣지 않도록 이 저장소의 작성자만 GitHub ID 기반 noreply 주소로 설정.
  전역 Git 설정은 변경하지 않는다. 자격 증명은 저장소에 기록하지 않는다.
- Chrome 설치 파일은 존재한다. Tampermonkey 설치와 사용자 스크립트 허용은 **사용자 확인 완료**다.
- 현재 에이전트의 브라우저 도구에는 일반 Chrome이 연결되지 않아 확장/스크립트 화면을 직접 검사할 수 없다.
  따라서 **ArcaGuard 자체의 Tampermonkey 설치/실행은 아직 직접 검증하지 않았다**.

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
이 사실은 Chrome에서 설치/실행을 확인한 것과 다르다.
프로세스가 종료되면 다시 `npm run dev`로 시작해야 하며 상시 서비스는 아니다.

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
