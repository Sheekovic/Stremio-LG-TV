/**
 * main.js – Remote-Control-Handling für die Stremio-TV-Wrapper-App
 *
 * WICHTIGER HINWEIS zur Funktionsweise:
 * tv.strem.io läuft im iframe auf einer FREMDEN Origin. Aus Sicherheitsgründen
 * (Same-Origin-Policy) kann diese App weder in das iframe-Dokument hineinlesen
 * noch ihm synthetische KeyboardEvents "einspritzen" – und tv.strem.io hört
 * auch nicht auf postMessage-Tastatur-Events (wir kontrollieren den Code dort
 * nicht). Ein echtes "Weiterleiten" von Tasten in fremden Code ist technisch
 * nicht möglich und wäre auch kein normales Verhalten von Webseiten.
 *
 * Der Weg, der auf allen TV-Browsern (webOS, Tizen, ...) tatsächlich
 * funktioniert: Das iframe bekommt den DOM-Fokus. Danach liefert der Browser
 * Tastatur-Events ganz normal direkt an das iframe – Stremios eigener
 * TV-optimierter Player kümmert sich dann selbst um Pfeiltasten/OK/Zurück,
 * genau wie er es auch in einem normalen TV-Browser täte.
 *
 * Was diese Datei also wirklich tut:
 *  1. Sorgt dafür, dass das iframe IMMER den Fokus hat (auch nach Reload,
 *     Tab-Wechsel, Wake-up aus Standby etc.)
 *  2. Fängt die webOS-Zurück-Taste (keyCode 461) auf App-Ebene ab, damit
 *     die App sauber reagiert (History zurück, sonst App beenden) statt
 *     abzustürzen oder sich unkontrolliert zu schließen.
 */

(function () {
  'use strict';

  var frame = document.getElementById('stremio-frame');

  // ---- 0. Verbindungs-Warmup ---------------------------------------------
  // Zusätzlich zu <link rel="preconnect"> im HTML feuern wir hier aktive
  // no-cors-Fetches an bekannte Stremio-Domains ab, SOBALD unsere eigene
  // Seite lädt - parallel zum iframe, nicht danach. Das baut DNS/TCP/TLS
  // schon auf, bevor tv.strem.io selbst die Requests stellt. no-cors, weil
  // wir die Antwort nicht lesen wollen/dürfen - nur die Verbindung zählt.
  var warmupDomains = [
    'https://tv.strem.io',
    'https://v3-cinemeta.strem.io',
    'https://api.strem.io'
  ];
  warmupDomains.forEach(function (url) {
    if (typeof fetch !== 'function') return; // sehr alte Engines kennen fetch() evtl. nicht
    try {
      fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(function () {});
    } catch (e) {
      // ignorieren - das iframe lädt trotzdem ganz normal weiter
    }
  });


  // webOS-spezifische Keycodes (ältere Firmware, LG Magic Remote / Standard-Fernbedienung)
  var KEY_BACK = 461;
  var KEY_ENTER = 13;
  var KEY_ARROWS = [37, 38, 39, 40]; // links, oben, rechts, unten

  // ---- 1. Fokus-Management ---------------------------------------------

  function focusFrame() {
    try {
      frame.focus();
    } catch (e) {
      // ignorieren – kann in seltenen Fällen vor dem Laden fehlschlagen
    }
  }

  // Sobald das iframe fertig geladen hat, Fokus setzen
  frame.addEventListener('load', focusFrame);

  // Fokus zurückholen, wenn die App wieder sichtbar wird
  // (z. B. nach Standby, App-Wechsel, HDMI-CEC Wake-up)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      focusFrame();
    }
  });

  window.addEventListener('focus', focusFrame);

  // Direkt beim Start schon mal versuchen (falls das iframe aus dem Cache kommt)
  focusFrame();

  // ---- 2. Zurück-Taste sauber behandeln ---------------------------------
  //
  // Ohne eigene Behandlung kann die Zurück-Taste je nach webOS-Version die
  // App entweder gar nicht schließen oder ruckartig/inkonsistent verhalten.
  // Wir fangen sie global ab, BEVOR sie das iframe erreicht.

  document.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;

    if (code === KEY_BACK) {
      handleBack(event);
      return;
    }

    // Pfeiltasten/OK: nichts tun, nur sicherstellen, dass der Fokus
    // wirklich beim iframe liegt, falls er aus irgendeinem Grund verloren ging
    if (KEY_ARROWS.indexOf(code) !== -1 || code === KEY_ENTER) {
      if (document.activeElement !== frame) {
        focusFrame();
      }
    }
  }, true); // capture-Phase: wir bekommen die Taste zuerst

  function handleBack(event) {
    event.preventDefault();
    event.stopPropagation();

    // webOSSystem / webOS.js ist nur verfügbar, wenn die App als privilegierte
    // System-App installiert ist ODER die webOSTV.js-Library eingebunden wurde.
    // Wir prüfen defensiv, ob eine der bekannten APIs existiert, und fallen
    // andernfalls auf window.close() zurück (Standardverhalten für Web-Apps).
    if (window.webOS && typeof window.webOS.platformBack === 'function') {
      window.webOS.platformBack();
      return;
    }

    if (window.PalmSystem && typeof window.PalmSystem.platformBack === 'function') {
      window.PalmSystem.platformBack();
      return;
    }

    // Fallback: App schließen (Standard für "type": "web"-Apps unter webOS)
    try {
      window.close();
    } catch (e) {
      // Falls window.close() vom Runtime ignoriert wird, zumindest
      // verhindern, dass wir in einem kaputten Zustand hängen bleiben
      window.location.href = 'https://tv.strem.io';
    }
  }

  // ---- 3. Ladefehler abfangen -------------------------------------------
  // Falls kein Internet verfügbar ist, soll die App nicht einfach leer/schwarz
  // hängen bleiben, sondern zumindest neu versuchen.

  var reloadAttempts = 0;
  frame.addEventListener('error', function () {
    if (reloadAttempts < 3) {
      reloadAttempts++;
      setTimeout(function () {
        frame.src = 'https://tv.strem.io';
      }, 2000);
    }
  });
})();
