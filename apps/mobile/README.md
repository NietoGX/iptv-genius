# iptv-genius — móvil / TV

App de iPTV Genius para iOS y Android TV, en [React Native](https://reactnative.dev) vía el fork [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos). Vive dentro del monorepo de iptv-genius como workspace de npm y reutiliza el parsing de M3U/Xtream/XMLTV de `packages/core` a través de `@iptv-genius/core/src/portable` (ver nota más abajo sobre por qué no se usa el barrel normal `@iptv-genius/core`).

## Requisitos

- Node.js 20+, y haber corrido `npm install` **desde la raíz del repo** (no desde `apps/mobile`), para que el workspace enlace `@iptv-genius/core`.
- Android TV: JDK 17, Android SDK (platform 36, build-tools 36.0.0, NDK 27.1.12297006, un emulador o dispositivo Android TV). Ver [[iptv-genius-mobile-tv-port]] en la memoria del proyecto para el detalle exacto de lo instalado en la máquina Windows de desarrollo.
- iOS/tvOS: **requiere macOS con Xcode** — no se puede compilar ni probar desde Windows. Instrucciones abajo.

## Android TV

```sh
# desde apps/mobile
npm run android -- --mode=debug
# o apuntando a un emulador/dispositivo concreto:
npx react-native run-android --device emulator-5554
```

Para crear un emulador de Android TV si no existe:
```sh
avdmanager create avd -n Android_TV_1080p -k "system-images;android-36;android-tv;x86_64" -d "tv_1080p"
emulator -avd Android_TV_1080p
```

## iOS / tvOS (hacer esto en el Mac)

1. Clonar/sincronizar el repo en el Mac y correr `npm install` desde la raíz (no solo en `apps/mobile`).
2. Instalar CocoaPods (una vez):
   ```sh
   cd apps/mobile
   bundle install
   bundle exec pod install
   ```
3. Ejecutar en simulador de iPhone:
   ```sh
   npx react-native run-ios
   ```
4. Ejecutar en simulador de Apple TV:
   ```sh
   npx react-native run-tvos --simulator "Apple TV"
   ```
5. Para probar en un iPhone físico: abrir `apps/mobile/ios/*.xcworkspace` en Xcode, seleccionar el dispositivo y firmar con tu Apple ID (con cuenta gratuita el perfil de aprovisionamiento caduca a los 7 días; con Apple Developer Program de pago no caduca).

## Nota: por qué se importa `@iptv-genius/core/src/portable` y no `@iptv-genius/core`

El barrel normal (`packages/core/src/index.ts`) reexporta `./db`, que depende de `better-sqlite3` (binario nativo de Node). Metro no puede empaquetar eso. `src/portable.ts` reexporta todo lo demás (parsing M3U/Xtream/XMLTV, tipos de dominio) sin tocar `db`. Cualquier código nuevo en `apps/mobile` debe importar de `@iptv-genius/core/src/portable`, nunca del barrel.

La capa de almacenamiento en móvil se implementará aparte (SQLite compatible con RN, p.ej. `op-sqlite`), reutilizando el esquema SQL de `packages/core/src/db/migrations/0001_init.sql` pero no el binding de `better-sqlite3`.
