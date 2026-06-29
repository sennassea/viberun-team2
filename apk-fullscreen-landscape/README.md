# APK Fullscreen Landscape Requirements

반드시 APK는 Chrome 주소로 `index.html`을 여는 방식이 아니라 Android Activity/WebView 안에서 실행해야 합니다.

필수 설정:

1. `AndroidManifest.xml`의 `MainActivity`에 `android:screenOrientation="landscape"`를 넣습니다.
2. `MainActivity`는 fullscreen/immersive sticky mode를 켭니다.
3. Activity theme은 NoActionBar + fullscreen이어야 합니다.
4. `index.html`은 APK assets 또는 Capacitor `www` 안에서 로드합니다.

검증 기준:

1. 앱 아이콘을 눌러 실행했을 때 주소창이 보이면 실패입니다.
2. 휴대폰 자동회전이 켜져 있어도 세로 화면으로 바뀌면 실패입니다.
3. 홈/최근앱에서 돌아온 뒤에도 fullscreen이 유지되어야 합니다.
