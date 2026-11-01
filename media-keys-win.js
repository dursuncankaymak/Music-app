'use strict';

// Windows'ta medya tuşlarını (klavyedeki ▶⏸ ⏭ ⏮ ve klavyelerin Fn+F tuşu medya kısayolları)
// uygulama arka plandayken / oyun öndeyken de görür. İki kaynak dinlenir:
//  1. Düşük seviye klavye kancası (WH_KEYBOARD_LL): sanal tuş olarak gelen basışlar.
//  2. Shell kancası (HSHELL_APPCOMMAND): klavye yazılımlarının (G Hub, Synapse vb.) Fn tuşları için
//     gönderdiği "uygulama komutları".
// Aynı basış iki yoldan da gelebileceği için kısa sürede tekrar eden eylem yok sayılır.
// Tuşlar yutulmaz; Windows'un kendi medya denetimine de ulaşmaya devam eder.

const VK_ACTIONS = { 0xb3: 'playpause', 0xb0: 'next', 0xb1: 'prev' };
// APPCOMMAND_MEDIA_PLAY_PAUSE / PLAY / PAUSE / NEXTTRACK / PREVIOUSTRACK
const APPCOMMAND_ACTIONS = { 14: 'playpause', 46: 'playpause', 47: 'playpause', 11: 'next', 12: 'prev' };
const WH_KEYBOARD_LL = 13;
const WM_KEYDOWN = 0x100;
const WM_SYSKEYDOWN = 0x104;
const HSHELL_APPCOMMAND = 12;
const DEDUPE_MS = 350;

let keepAlive = null; // kayıtlı geri çağrı ve kanca, çöp toplayıcıdan korunur

function install(win, onAction) {
  if (process.platform !== 'win32' || keepAlive) return;

  const last = {};
  const fire = (action) => {
    const now = Date.now();
    if (now - (last[action] || 0) < DEDUPE_MS) return;
    last[action] = now;
    setImmediate(() => onAction(action));
  };

  let koffi;
  try {
    koffi = require('koffi');
  } catch (err) {
    console.error('Medya tuşu kancası yüklenemedi:', err);
    return;
  }

  const user32 = koffi.load('user32.dll');
  const kernel32 = koffi.load('kernel32.dll');
  keepAlive = {};

  // ---- 1. Düşük seviye klavye kancası ----
  try {
    const HookProc = koffi.proto('intptr_t __stdcall HookProc(int nCode, uintptr_t wParam, void *lParam)');
    const SetWindowsHookExW = user32.func('void * __stdcall SetWindowsHookExW(int idHook, HookProc *lpfn, void *hmod, uint32_t dwThreadId)');
    const CallNextHookEx = user32.func('intptr_t __stdcall CallNextHookEx(void *hhk, int nCode, uintptr_t wParam, void *lParam)');
    const GetModuleHandleW = kernel32.func('void * __stdcall GetModuleHandleW(str16 name)');

    const callback = koffi.register((nCode, wParam, lParam) => {
      try {
        if (nCode === 0 && (wParam === WM_KEYDOWN || wParam === WM_SYSKEYDOWN)) {
          const vk = koffi.decode(lParam, 'uint32_t');
          if (VK_ACTIONS[vk]) fire(VK_ACTIONS[vk]);
        }
      } catch { /* kanca asla hata fırlatmamalı */ }
      return CallNextHookEx(null, nCode, wParam, lParam);
    }, koffi.pointer(HookProc));

    keepAlive.callback = callback;
    keepAlive.hook = SetWindowsHookExW(WH_KEYBOARD_LL, callback, GetModuleHandleW(null), 0);
    if (!keepAlive.hook) console.error('Klavye kancası kurulamadı');
  } catch (err) {
    console.error('Klavye kancası kurulamadı:', err);
  }

  // ---- 2. Shell kancası (Fn tuşlarının uygulama komutları) ----
  try {
    const RegisterWindowMessageW = user32.func('uint32_t __stdcall RegisterWindowMessageW(str16 name)');
    const RegisterShellHookWindow = user32.func('bool __stdcall RegisterShellHookWindow(void *hwnd)');
    const shellMsg = RegisterWindowMessageW('SHELLHOOK');
    const handle = win.getNativeWindowHandle();
    const hwnd = koffi.decode(handle, 'void *');
    if (shellMsg && RegisterShellHookWindow(hwnd)) {
      win.hookWindowMessage(shellMsg, (wParam, lParam) => {
        if (wParam.readUInt32LE(0) !== HSHELL_APPCOMMAND) return;
        const cmd = (lParam.readUInt32LE(0) >>> 16) & 0x0fff; // GET_APPCOMMAND_LPARAM
        if (APPCOMMAND_ACTIONS[cmd]) fire(APPCOMMAND_ACTIONS[cmd]);
      });
    }
  } catch (err) {
    console.error('Shell kancası kurulamadı:', err);
  }
}

module.exports = { install };
