# Stremio-LG-TV
A lightweight, native webOS web-app wrapper that loads the official Stremio TV interface (tv.strem.io) directly on older LG Smart TVs (pre-2020, webOS 3.x / 4.x).

## 📋 Features
- Native webOS Integration: Boots directly into the official tv.strem.io layout.
- webOS Navigation Fixes: Includes specific system configuration flags so the LG Magic Remote's Back Button navigates the Stremio menus correctly instead of crashing out to the TV Home Menu.

## 🔨 Installation (Using webOS TV Device Manager)
Instead of messing with the command-line terminal, the easiest way to sideload this app onto your LG TV is by using the visual **webOS TV Device Manager** desktop application.

### 💻 Requirements
1. Enable **Developer Mode** on your LG TV via the "Developer Mode" app from the LG Content Store.
2. Turn on the **Dev Mode Status** and **Key Server** toggles inside the TV app.
3. Download and install the [webOS TV Device Manager GUI](https://github.com/webosbrew/dev-manager-desktop) on your PC/Mac/Linux.
4. Download the pre-built `.ipk` file from the **Releases** section of this repository.


1. **Connect to your TV:**
   * Open the webOS TV Device Manager on your computer.
   * Click **Add Device** (or the **+** icon).
   * Enter your TV's local IP address.
   * Look at your TV screen's Developer Mode app and enter the 6-character **Passphrase** into the Device Manager, then click **Connect**.

2. **Install the App:**
   * Once connected, click on the **Apps** tab in the main window.
   * Click the **Install App** button (usually an icon showing a package or an arrow in the top right).
   * Select **Choose File** and browse to the downloaded `org.balazs.stremio-wrapper_1.0.0_all.ipk` file.
   * Click **Install**.

3. **Launch:**
   * Within a few seconds, the Stremio TV app icon will appear in your LG TV's main Home Launcher menu at the bottom of your screen!
