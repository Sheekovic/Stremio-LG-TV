/* ES5 syntax for older webOS engines. No dependencies or network probes.
 * Foreign iframes cannot report whether Stremio has passed its logo.
 * Recovery stays under user control; load is never treated as ready.
 */
(function () {
  'use strict';
  var URL = 'https://tv.strem.io/';
  var launcher = document.getElementById('launcher');
  var panel = document.getElementById('recovery-panel');
  var status = document.getElementById('status');
  var hint = document.getElementById('hint');
  var recoveryStatus = document.getElementById('recovery-status');
  var help = document.getElementById('help');
  var frame = null;
  var startupTimer = null;
  var slowTimer = null;
  var mode = 'launcher';
  var panelOpen = false;
  var autoStart = true;
  var group = ['open', 'recovery', 'exit'];
  var recoveryGroup = ['continue', 'retry', 'direct', 'home'];

  function focus(id) {
    try { document.getElementById(id).focus(); } catch (ignore) {}
  }
  function clearStartup() {
    window.clearTimeout(startupTimer);
    startupTimer = null;
  }
  function pauseStartup() {
    autoStart = false;
    clearStartup();
    hint.textContent = 'اختر بالأسهم واضغط OK. وضع الإصلاح يتيح إعادة تحميل الصفحة يدويًا.';
  }
  function offline() {
    // A true onLine value is not proof of Internet access.
    return navigator.onLine === false;
  }
  function updateNetwork() {
    status.textContent = offline() ?
      'التلفزيون غير متصل بالشبكة. وصّل الإنترنت ثم اختر فتح Stremio.' :
      'جاهز لتشغيل Stremio.';
  }
  function scheduleStartup() {
    clearStartup();
    if (autoStart && !offline() && !document.hidden && mode === 'launcher') {
      startupTimer = window.setTimeout(openDirect, 3000);
    }
  }
  function openDirect() {
    pauseStartup();
    if (offline()) { updateNetwork(); return; }
    window.clearTimeout(slowTimer);
    mode = 'leaving';
    panelOpen = false;
    if (frame) { frame.parentNode.removeChild(frame); frame = null; }
    status.textContent = 'جارٍ فتح Stremio…';
    // Hosted-app handover gives Stremio first-party storage and keyboard input.
    // The launcher unloads here and cannot monitor the remote UI.
    window.location.replace(URL);
  }
  function showPanel() {
    if (mode !== 'recovery') { return; }
    panelOpen = true;
    panel.hidden = false;
    help.hidden = true;
    focus('continue');
  }
  function focusFrame() {
    if (frame && mode === 'recovery' && !panelOpen && !document.hidden) {
      try { frame.focus(); } catch (ignore) {}
    }
  }
  function continueWatching() {
    if (!frame) { return; }
    window.clearTimeout(slowTimer);
    panelOpen = false;
    panel.hidden = true;
    help.hidden = false;
    focusFrame();
  }
  function startRecovery() {
    pauseStartup();
    window.clearTimeout(slowTimer);
    mode = 'recovery';
    launcher.hidden = true;
    showPanel();
    if (offline()) {
      recoveryStatus.textContent = 'لا يوجد اتصال بالشبكة. بعد الاتصال اختر إعادة المحاولة.';
      return;
    }
    // A fresh browsing context resets JS, while preserving account storage.
    if (frame) { frame.parentNode.removeChild(frame); }
    frame = document.createElement('iframe');
    frame.id = 'stremio-frame';
    frame.title = 'Stremio TV';
    frame.tabIndex = -1;
    frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    frame.setAttribute('allowfullscreen', '');
    frame.addEventListener('load', function () {
      // This may also be an error document or a stalled SPA.
      if (panelOpen) {
        recoveryStatus.textContent = 'انتهى طلب الصفحة. لو ظهرت القوائم اختر متابعة؛ لو الشعار معلّق جرّب إعادة المحاولة.';
      }
      focusFrame();
    });
    recoveryStatus.textContent = 'جارٍ تحميل Stremio… يمكنك إعادة المحاولة أو الفتح المباشر.';
    frame.src = URL;
    document.body.insertBefore(frame, document.body.firstChild);
    slowTimer = window.setTimeout(function () {
      if (mode === 'recovery' && panelOpen) {
        recoveryStatus.textContent = 'التحميل استغرق أكثر من ٤٥ ثانية. لو القوائم لم تظهر، جرّب إعادة المحاولة أو الفتح المباشر.';
      }
    }, 45000);
  }
  function showLauncher() {
    window.clearTimeout(slowTimer);
    if (frame) { frame.parentNode.removeChild(frame); frame = null; }
    mode = 'launcher';
    panelOpen = false;
    panel.hidden = true;
    help.hidden = true;
    launcher.hidden = false;
    pauseStartup();
    updateNetwork();
    focus('open');
  }
  function exitApp() {
    pauseStartup();
    if (window.webOS && typeof window.webOS.platformBack === 'function') {
      window.webOS.platformBack();
    } else if (window.webOSSystem && typeof window.webOSSystem.platformBack === 'function') {
      window.webOSSystem.platformBack();
    } else if (window.PalmSystem && typeof window.PalmSystem.platformBack === 'function') {
      window.PalmSystem.platformBack();
    } else {
      window.close();
    }
  }

  document.getElementById('open').onclick = openDirect;
  document.getElementById('recovery').onclick = startRecovery;
  document.getElementById('exit').onclick = exitApp;
  document.getElementById('continue').onclick = continueWatching;
  document.getElementById('retry').onclick = startRecovery;
  document.getElementById('direct').onclick = openDirect;
  document.getElementById('home').onclick = showLauncher;
  help.onclick = showPanel;

  document.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;
    var buttons;
    var index;
    // Events in a foreign iframe DO NOT bubble here. Never send fake keys.
    if (mode === 'recovery' && !panelOpen) {
      if (code === 461 || code === 27) {
        event.preventDefault();
        showPanel();
      } else if ((code >= 37 && code <= 40) || code === 13) {
        focusFrame();
      }
      return;
    }
    pauseStartup();
    if (code === 461 || code === 27) {
      event.preventDefault();
      if (mode === 'recovery') { continueWatching(); } else { exitApp(); }
      return;
    }
    buttons = mode === 'launcher' ? group : recoveryGroup;
    index = buttons.indexOf(document.activeElement.id);
    if (code >= 37 && code <= 40) {
      event.preventDefault();
      // The button rows run right-to-left.
      index = (Math.max(index, 0) + (code === 37 || code === 40 ? 1 : buttons.length - 1)) % buttons.length;
      focus(buttons[index]);
    } else if (code === 13) {
      event.preventDefault();
      if (!event.repeat) { document.getElementById(buttons[Math.max(index, 0)]).click(); }
    }
  });

  launcher.addEventListener('mousedown', pauseStartup);
  launcher.addEventListener('touchstart', pauseStartup);
  window.addEventListener('offline', function () {
    clearStartup();
    if (mode === 'launcher') { updateNetwork(); }
    // A transient drop must not reload or cover a playing video.
    if (mode === 'recovery' && panelOpen) {
      recoveryStatus.textContent = 'انقطع الاتصال. وصّل الشبكة ثم اختر إعادة المحاولة.';
    }
  });
  window.addEventListener('online', function () {
    if (mode === 'launcher') { updateNetwork(); scheduleStartup(); }
    if (mode === 'recovery' && panelOpen) {
      recoveryStatus.textContent = 'عادت الشبكة. اختر إعادة المحاولة إذا لم تظهر القوائم.';
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearStartup(); return; }
    if (mode === 'recovery') {
      // Returning to the wrapper exposes remote-accessible recovery.
      // Do not reload the frame or discard video position on wake-up.
      showPanel();
    } else {
      updateNetwork();
      scheduleStartup();
      focus('open');
    }
  });
  document.addEventListener('webOSRelaunch', function () {
    if (mode === 'recovery') { showPanel(); }
    else { pauseStartup(); updateNetwork(); focus('open'); }
  });
  updateNetwork();
  focus('open');
  scheduleStartup();
}());
