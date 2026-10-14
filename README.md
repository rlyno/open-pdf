# Open PDF

A free PDF toolbox for your phone. Merge, split, compress, sign and protect PDFs without
uploading them anywhere.

**Everything happens on your device.** No account, no server, no ads. Your files never leave
your phone.

## Download

**Android:** [Download the latest APK](https://github.com/rlyno/open-pdf/releases/latest)

1. Open the link above and download the file ending in `.apk`.
2. Open it on your phone. If Android asks, allow installing apps from your browser or file manager.
3. Tap **Install**.

An iOS version can be built from source (see below), but there is no App Store release yet.

## What you can do

| | |
| --- | --- |
| **Organize** | Merge PDFs, split them, reorder, rotate or delete pages, put 2 or 4 pages on one sheet |
| **Convert** | Turn images into a PDF, turn a PDF into images, compress large PDFs |
| **Edit** | Add a watermark or page numbers, sign with your finger or a photo, view and edit document info, flatten forms |
| **Security** | Add or remove a password (AES-256) |

You can also read PDFs in the built-in viewer (zoom, page thumbnails) and draw, highlight or add
text on top of them. Your original file is never changed. Saving creates a new copy.

PDFs shared from other apps ("Share" or "Open with") open straight in Open PDF and suggest tools
that fit.

The app speaks English or Indonesian, depending on your phone's language.

## Good to know

- Watermarks and page numbers support Latin letters only.
- "Maximum" compression turns pages into pictures, so the text can no longer be selected.
- No OCR or Word/Excel conversion yet.
- Receiving files from other apps has been tested on Android, not yet on iOS.

## Build it yourself

Open PDF is built with [Expo](https://expo.dev) (React Native). It uses native code, so Expo Go
will not work. You need a development build.

```bash
npm install
npx expo run:android   # needs Android Studio
npx expo run:ios       # needs Xcode (macOS)
```

Android builds need JDK 17.

Other useful commands: `npm test`, `npm run typecheck`, `npx expo lint`.

## Contributing

Bug reports and pull requests are welcome. Please open an issue first for larger changes.

## License

Copyright (C) 2026 Epafraditus Memoriano (RLYNO).

Open PDF is free software under the [GNU General Public License v3.0](LICENSE). You can use,
change and share it, including selling it, as long as the version you distribute is also released
under GPL-3.0 with its source code and credits the original work.

PDFs created by the app carry the metadata tag `Producer: Open PDF by RLYNO`.
