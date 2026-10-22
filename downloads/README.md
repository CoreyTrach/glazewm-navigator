# Desktop test package

[Download GlazeWM Navigator](https://github.com/CoreyTrach/glazewm-navigator/raw/refs/heads/main/downloads/glazewm-navigator.rayext).

This `.rayext` package was built in the cloud with Raycast's official
`ray bundle` command from source commit
`02c2de50ea41f3e7b0a6b85b00de5f63cd696d60`. It includes compiled code,
the manifest, and the extension icon; it does not include synthetic fixtures.

Try opening the downloaded file on Windows with Raycast installed. Accept an
import prompt if offered, then search for **Navigate Workspaces** with GlazeWM
running. Windows package import and desktop integration are not yet verified.
If the file is not recognized, report the Raycast version and observed behavior
before installing a development toolchain.

This is a manually generated initial test package, not an automatically updated
release. Future source changes require rebuilding it:

```sh
npm exec -- ray bundle --output downloads/glazewm-navigator.rayext
```
