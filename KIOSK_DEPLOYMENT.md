# MediKiosk — Kiosk Device Hardening & Physical Deployment Guide (Module 10)

> [!WARNING]
> **THREAT MODEL NOTICE**
> Kiosks operate in public hospital waiting rooms and must be treated as **hostile, untrusted environments**. Physical tampering, shoulder surfing, and credential extraction must be mitigated through combined hardware, software, and physical placement controls.

---

## 1. Hardware Specifications & Physical Hardening

### 1.1 Physical Device Requirements:
- **Form Factor**: Ruggedized floor-mount or wall-mount enclosure with dual-key mechanical deadbolt locks.
- **Display**: 21.5-inch to 24-inch Medical-grade capacitive touch display with anti-microbial glass.
- **Privacy Filter Screen**: Built-in micro-louver optical privacy filter restricting viewing angle to $\pm 30^\circ$, preventing queue bystanders from reading confidential patient inputs.
- **Peripherals**:
  - Integrated high-resolution document scanner tray with downward-facing 8MP fixed-focus camera.
  - Directional array noise-cancelling microphone with physical hardware activity LED.
  - Optical barcode / QR scanner for hospital registration slips.
  - Thermal receipt printer for queue tokens and registration confirmations.
- **Power & Networking**:
  - Hospital Grade Online UPS with minimum 30-minute backup battery runtime.
  - Dedicated Cat6 Ethernet cable secured inside locked enclosure conduit. **Wi-Fi is prohibited for production kiosks.**

### 1.2 Port & Interface Lockdown:
- All external USB ports physically capped with epoxy or locked behind internal chassis.
- BIOS/UEFI locked with high-entropy administrative password.
- Boot order locked to internal encrypted NVMe SSD; USB boot, network PXE boot, and optical boot disabled.
- Bluetooth, Wi-Fi, and NFC radios disabled in firmware if not actively used.

---

## 2. Operating System & Software Single-App Lockdown

### 2.1 Linux/Debian-Based Kiosk Appliance:
1. **Lightweight Kiosk Environment**: Minimal Debian/Ubuntu LTS stripped of desktop environments (GNOME/KDE removed). Running custom locked X11/Wayland session launching Chromium in `--kiosk` mode.
2. **Chromium Lockdown Flags**:
   ```bash
   chromium-browser \
     --kiosk \
     --no-first-run \
     --disable-features=TranslateUI \
     --disable-suggestions-ui \
     --disable-save-password-bubble \
     --disable-context-menu \
     --disable-pinch \
     --disable-dev-tools \
     --noerrdialogs \
     --disable-infobars \
     --app=https://kiosk.hospital.internal \
     --incognito
   ```
3. **Hotkey & Shell Trapping**:
   - `Ctrl+Alt+Del`, `Alt+F4`, `Ctrl+Shift+I`, `F11`, `F12`, and `Alt+Tab` intercepted and nullified via `xmodmap` and window manager configuration.
   - Virtual terminal switching (`Ctrl+Alt+F1` through `F7`) disabled in `/etc/X11/xorg.conf`.

---

## 3. Session Wipe & Consecutive Session Privacy Protection

Consecutive patient privacy is enforced through multi-layered automated wipes:

1. **Session Wipe Triggers**:
   - Patient clicks **"Finish & Log Out"**.
   - 60 seconds of inactivity without touch input (Idle Timeout).
   - Patient abandons kiosk (detected via face disappearance or 90s screen timeout).
   - Kiosk power cycle, crash, or application restart.
2. **What Gets Wiped (Zero Residual Data)**:
   - DOM elements and React application state destroyed.
   - Browser `sessionStorage`, `localStorage`, and IndexedDB cache purged.
   - Audio buffer recordings and temporary captured prescription images unlinked from memory.
   - Backend `KioskHardeningService.wipeSession(visitId)` called immediately: invalidates session token with 401 Unauthorized permanently.
3. **Automated Verification**:
   - Verified by test suite `tests/deployment-module10.test.ts` (Test 5): A subsequent session token attempting to query prior patient data receives `401 Unauthorized` with zero residual leakage.

---

## 4. Physical Placement & Clinic Infection Control

- **Placement Away from Queues**: Minimum 2-meter physical separation from general waiting lines. Screen oriented away from reception desk and hallway windows.
- **Attendant Line-of-Sight**: Positioned where the OPD nurse or orderly maintains clear line-of-sight to assist struggling patients or observe physical tampering.
- **Infection Prevention & Cleaning Schedule**:
  - Touchscreen and scanner glass wiped with 70% Isopropyl alcohol wipes every 2 hours during peak OPD hours.
  - Surface rating IP65 water-resistant to withstand standard hospital disinfectant wipes.
