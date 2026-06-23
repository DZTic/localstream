# Signature de l'APK release (Android)

Par défaut, si aucune clé de signature release n'est fournie, l'APK `release` est
signé avec la **clé debug** d'Android (cf. `android/app/build.gradle`). Un APK
signé en debug **ne convient pas à la distribution** : il ne peut pas être publié
sur le Play Store et n'autorise pas les mises à jour d'un APK signé différemment.

Pour produire des builds distribuables, générez une **clé release dédiée** et
fournissez-la à Gradle. **Le keystore et les mots de passe ne doivent jamais être
commités** dans le dépôt.

## 1. Générer un keystore release

```bash
keytool -genkeypair -v \
  -keystore localstream-release.jks \
  -alias localstream \
  -keyalg RSA -keysize 2048 -validity 10000
```

Conservez précieusement le fichier `.jks` et les mots de passe : **les perdre rend
impossible toute mise à jour** de l'application déjà publiée.

## 2. Fournir les identifiants à Gradle

`build.gradle` lit quatre propriétés, depuis une **propriété Gradle** *ou* une
**variable d'environnement** (la propriété Gradle est prioritaire) :

| Propriété              | Description                              |
|------------------------|------------------------------------------|
| `RELEASE_STORE_FILE`     | Chemin vers le fichier `.jks`            |
| `RELEASE_STORE_PASSWORD` | Mot de passe du keystore                 |
| `RELEASE_KEY_ALIAS`      | Alias de la clé (ex. `localstream`)      |
| `RELEASE_KEY_PASSWORD`   | Mot de passe de la clé                   |

### Option A — `~/.gradle/gradle.properties` (hors du dépôt)

```properties
RELEASE_STORE_FILE=/chemin/absolu/localstream-release.jks
RELEASE_STORE_PASSWORD=********
RELEASE_KEY_ALIAS=localstream
RELEASE_KEY_PASSWORD=********
```

### Option B — variables d'environnement (ex. CI / GitHub Actions)

```bash
export RELEASE_STORE_FILE="$PWD/localstream-release.jks"
export RELEASE_STORE_PASSWORD="********"
export RELEASE_KEY_ALIAS="localstream"
export RELEASE_KEY_PASSWORD="********"
```

En CI, stockez ces valeurs (et le keystore encodé en base64) dans des **secrets**,
puis reconstituez le fichier `.jks` avant le build.

## 3. Construire l'APK signé

```bash
cd android
./gradlew assembleRelease   # gradlew.bat sous Windows
# → app/build/outputs/apk/release/app-release.apk
```

Si aucune clé n'est fournie, Gradle affiche un avertissement et retombe sur la
clé debug.

## 4. Vérifier la signature

```bash
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

Le certificat affiché doit correspondre à votre clé release (et **non** au
certificat « Android Debug »).
