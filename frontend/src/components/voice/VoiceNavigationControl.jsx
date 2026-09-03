import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { VOICE_NAVIGATION_URL } from "../../config";
import { normalizeLocale, SUPPORTED_LOCALES } from "../../i18n/locales";
import "./voiceNavigation.css";

const SILENCE_THRESHOLD = 0.025;
const SILENCE_AFTER_SPEECH_MS = 1100;
const EMPTY_TURN_TIMEOUT_MS = 12000;
const VOICE_ACTION_EVENT = "join:voice-action";

function contextForPath(pathname) {
  if (pathname === "/signin") return "login";
  if (pathname === "/signup") return "signup";
  if (pathname === "/forgot-password") return "forgot_password";
  if (pathname === "/reset-password") return "reset_password";
  if (pathname === "/employers") return "employers_info";
  if (pathname === "/voice-help") return "voice_help";
  if (pathname === "/candidate/setup") return "candidate_setup";
  if (pathname === "/candidate") return "candidate";
  if (pathname === "/employer") return "employer";
  if (pathname === "/admin") return "admin";
  return "home";
}

function supportedMimeType() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return options.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
}

function currentPageContext(pathname) {
  const root = document.querySelector("main")
    || document.querySelector("[data-voice-section]")
    || document.body;
  const text = (root?.innerText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
  return {
    title: document.title,
    path: pathname,
    roleContext: contextForPath(pathname),
    currentView: document.querySelector("[data-voice-view]")?.dataset.voiceView || "",
    text,
  };
}

export default function VoiceNavigationControl() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation("voice");
  const interfaceLanguage = normalizeLocale(i18n.resolvedLanguage) || "en";
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState("off");
  const [message, setMessage] = useState(() => t("status.off"));
  const [transcript, setTranscript] = useState("");
  const [spokenLanguage, setSpokenLanguage] = useState(interfaceLanguage);
  const [lastRecording, setLastRecording] = useState(null);
  const [panelExpanded, setPanelExpanded] = useState(() => !window.matchMedia?.("(max-width: 640px)").matches);
  const enabledRef = useRef(false);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const outputAudioRef = useRef(null);
  const outputResolveRef = useRef(null);
  const requestAbortRef = useRef(null);
  const pendingModeRef = useRef(null);
  const historyRef = useRef([]);
  const discardRecordingRef = useRef(false);
  const lastFeedbackRef = useRef("");
  const lastRecordingUrlRef = useRef("");
  const locationRef = useRef(location.pathname);
  const pendingActionRef = useRef(null);
  const interfaceLanguageRef = useRef(interfaceLanguage);
  const spokenLanguageCustomizedRef = useRef(false);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (enabled) setPanelExpanded(true);
  }, [enabled]);

  const stopOutput = useCallback(() => {
    if (outputAudioRef.current) {
      outputAudioRef.current.pause();
      outputAudioRef.current.src = "";
      outputAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    outputResolveRef.current?.();
    outputResolveRef.current = null;
  }, []);

  const releaseResources = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    discardRecordingRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    stopOutput();
  }, [stopOutput]);

  const deactivate = useCallback((status) => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    pendingModeRef.current = null;
    historyRef.current = [];
    enabledRef.current = false;
    setEnabled(false);
    setPhase("off");
    setMessage(status || t("status.off"));
    releaseResources();
  }, [releaseResources, t]);

  const changeSpokenLanguage = useCallback((event) => {
    const nextLanguage = normalizeLocale(event.target.value);
    if (!nextLanguage || nextLanguage === spokenLanguage) return;
    spokenLanguageCustomizedRef.current = true;
    setSpokenLanguage(nextLanguage);
    setTranscript("");
    historyRef.current = [];
    pendingActionRef.current = null;
    const nextMessage = t("status.languageChanged", {
      language: SUPPORTED_LOCALES[nextLanguage].nativeName,
    });
    if (enabledRef.current) deactivate(nextMessage);
    else setMessage(nextMessage);
  }, [deactivate, spokenLanguage, t]);

  const fallbackSpeak = useCallback((text, language) => new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || "en";
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }), []);

  const speak = useCallback(async (text, language) => {
    if (!text || !enabledRef.current) return;
    lastFeedbackRef.current = text;
    setPhase("speaking");
    setMessage(t("status.speaking"));
    stopOutput();
    try {
      const response = await fetch(`${VOICE_NAVIGATION_URL}/api/voice/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1000), language }),
      });
      if (!response.ok) throw new Error("OpenAI speech generation failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        outputResolveRef.current = resolve;
        const audio = new Audio(url);
        outputAudioRef.current = audio;
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
      URL.revokeObjectURL(url);
      outputAudioRef.current = null;
      outputResolveRef.current = null;
    } catch {
      await fallbackSpeak(text, language);
    }
  }, [fallbackSpeak, stopOutput, t]);

  const executeCommand = useCallback((result) => {
    const route = result.route;
    if (!route) return result.feedback;
    if (route.status === "needs_confirmation" && route.action) {
      pendingActionRef.current = route.action;
      return result.feedback;
    }
    if (route.status !== "authorized") return result.feedback;
    const action = route.action || {};
    if (result.classification?.category === "ACTION") {
      let trustedAction = action;
      if (action.type === "confirm") {
        if (!pendingActionRef.current) return t("feedback.noPending");
        trustedAction = pendingActionRef.current;
        pendingActionRef.current = null;
      } else if (action.type === "cancel_action") {
        pendingActionRef.current = null;
        return t("feedback.pendingCancelled");
      } else {
        pendingActionRef.current = null;
      }
      const detail = { action: trustedAction, handled: false, feedback: "" };
      window.dispatchEvent(new CustomEvent(VOICE_ACTION_EVENT, { detail }));
      if (!detail.handled) return t("feedback.actionUnavailable");
      return detail.feedback || result.feedback;
    } else if (action.type === "route" && action.value) {
      navigate(action.value);
    } else if (action.type === "route_and_tab" && action.value && action.tab) {
      navigate(action.value, {
        state: {
          voiceTab: action.tab,
          voiceNavigationTurn: result.request_id,
        },
      });
    } else if (action.type === "history_back") {
      navigate(-1);
    } else if (action.type === "scroll") {
      const direction = action.direction === "up" ? -1 : 1;
      if (action.amount === "edge") {
        window.scrollTo({ top: direction < 0 ? 0 : document.documentElement.scrollHeight, behavior: "smooth" });
      } else {
        const distance = action.amount === "page" ? window.innerHeight * 0.85 : Math.max(220, window.innerHeight * 0.35);
        window.scrollBy({ top: direction * distance, behavior: "smooth" });
      }
    } else if (action.type === "read_section" && action.value) {
      const escaped = window.CSS?.escape ? window.CSS.escape(action.value) : action.value;
      const section = document.querySelector(`[data-voice-section="${escaped}"]`) || document.getElementById(action.value);
      if (!section) return t("feedback.sectionUnavailable");
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      return section.innerText.replace(/\s+/g, " ").trim().slice(0, 1000);
    } else if (action.type === "help") {
      navigate("/voice-help");
      return t("feedback.openingHelp");
    } else if (action.type === "repeat") {
      return lastFeedbackRef.current || t("feedback.noPrevious");
    } else if (action.type === "stop_speaking") {
      stopOutput();
      return t("feedback.outputStopped");
    } else if (action.type === "pause_listening") {
      pendingModeRef.current = "pause";
      return result.feedback;
    } else if (action.type === "cancel") {
      pendingActionRef.current = null;
      return t("feedback.cancelledNext");
    } else if (action.type === "disable_voice") {
      pendingModeRef.current = "disable";
      return result.feedback;
    }
    return result.feedback;
  }, [navigate, stopOutput, t]);

  const processAudio = useCallback(async (blob) => {
    setPhase("processing");
    setMessage(t("status.processing"));
    const body = new FormData();
    body.append("audio", blob, blob.type.includes("ogg") ? "utterance.ogg" : "utterance.webm");
    body.append("currentContext", contextForPath(locationRef.current));
    body.append("currentView", document.querySelector("[data-voice-view]")?.dataset.voiceView || "");
    body.append("pageContext", JSON.stringify(currentPageContext(locationRef.current)));
    body.append("spokenLanguage", spokenLanguage);
    body.append("history", JSON.stringify(historyRef.current));
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const response = await fetch(`${VOICE_NAVIGATION_URL}/api/voice/process`, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    requestAbortRef.current = null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[VOICE] Processing failed", {
        status: response.status,
        error: data.error,
        message: data.message,
      });
      throw new Error(t("feedback.processingFailed"));
    }
    const isSensitive = Boolean(data.route?.sensitive);
    const safeTranscript = isSensitive ? "[REDACTED SENSITIVE VALUE]" : data.transcript;
    const safeProposal = isSensitive && data.proposal
      ? { ...data.proposal, value: "[REDACTED]" }
      : data.proposal;
    const safeRoute = isSensitive && data.route?.action
      ? { ...data.route, action: { ...data.route.action, value: "[REDACTED]" } }
      : data.route;
    console.groupCollapsed(`[VOICE] Turn ${data.request_id || "unknown"}`);
    console.info("[VOICE STT] Transcript:", safeTranscript);
    console.info("[VOICE CLASSIFIER] Category:", data.classification);
    console.info("[VOICE INTENT] Proposal:", safeProposal);
    console.info("[VOICE ROUTER] Decision:", safeRoute);
    console.info("[VOICE FEEDBACK] Text:", data.feedback);
    console.groupEnd();
    setTranscript(safeTranscript || "");
    historyRef.current = [
      ...historyRef.current,
      {
        transcript: safeTranscript || "",
        command: data.proposal?.command || "UNKNOWN",
        target: data.proposal?.target ?? null,
        status: data.route?.status || "rejected",
        question: data.route?.question || null,
        choices: data.route?.choices || [],
      },
    ].slice(-6);
    const spokenText = executeCommand(data);
    await speak(spokenText, data.language);
    if (pendingModeRef.current === "pause") {
      pendingModeRef.current = null;
      enabledRef.current = false;
      setPhase("paused");
      setMessage(t("status.paused"));
      releaseResources();
    } else if (pendingModeRef.current === "disable") {
      pendingModeRef.current = null;
      deactivate(t("status.off"));
    }
  }, [deactivate, executeCommand, releaseResources, speak, spokenLanguage, t]);

  const cancelProcessing = useCallback(() => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setPhase("listening");
    setMessage(t("status.requestCancelled"));
    window.setTimeout(() => {
      if (enabledRef.current) beginTurnRef.current?.();
    }, 250);
  }, [t]);

  const stopSpeakingNow = useCallback(() => {
    stopOutput();
    setPhase("listening");
    setMessage(t("status.speechStopped"));
    window.setTimeout(() => {
      if (enabledRef.current) beginTurnRef.current?.();
    }, 100);
  }, [stopOutput, t]);

  const beginTurnRef = useRef(null);
  const beginTurn = useCallback(() => {
    if (!enabledRef.current || !streamRef.current || recorderRef.current?.state === "recording") return;
    const chunks = [];
    const mimeType = supportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    discardRecordingRef.current = false;
    let heardSpeech = false;
    let lastSoundAt = 0;
    const startedAt = performance.now();
    const analyser = analyserRef.current;
    const samples = new Uint8Array(analyser.frequencyBinCount);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      recorderRef.current = null;
      if (discardRecordingRef.current || !heardSpeech || !enabledRef.current) {
        if (enabledRef.current) beginTurnRef.current?.();
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (lastRecordingUrlRef.current) URL.revokeObjectURL(lastRecordingUrlRef.current);
      const recordingUrl = URL.createObjectURL(blob);
      lastRecordingUrlRef.current = recordingUrl;
      const recording = {
        url: recordingUrl,
        bytes: blob.size,
        type: blob.type || "unknown",
        durationMs: Math.round(performance.now() - startedAt),
      };
      setLastRecording(recording);
      console.info("[VOICE AUDIO] Exact uploaded recording:", recording);
      try {
        await processAudio(blob);
        if (enabledRef.current) beginTurnRef.current?.();
      } catch (error) {
        if (error.name === "AbortError") return;
        setPhase("error");
        console.error("[VOICE] Turn failed", error);
        setMessage(t("status.failed"));
        if (enabledRef.current) window.setTimeout(() => beginTurnRef.current?.(), 1500);
      }
    };

    const monitor = () => {
      if (!enabledRef.current || recorder.state !== "recording") return;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      const volume = Math.sqrt(sum / samples.length);
      const now = performance.now();
      if (volume >= SILENCE_THRESHOLD) {
        heardSpeech = true;
        lastSoundAt = now;
        setMessage(t("status.listeningRequest"));
      }
      if (heardSpeech && now - lastSoundAt >= SILENCE_AFTER_SPEECH_MS) {
        recorder.stop();
        return;
      }
      if (!heardSpeech && now - startedAt >= EMPTY_TURN_TIMEOUT_MS) {
        discardRecordingRef.current = true;
        recorder.stop();
        return;
      }
      animationFrameRef.current = requestAnimationFrame(monitor);
    };

    recorder.start(250);
    setPhase("listening");
    setMessage(t("status.listening"));
    animationFrameRef.current = requestAnimationFrame(monitor);
  }, [processAudio, t]);

  useEffect(() => {
    beginTurnRef.current = beginTurn;
  }, [beginTurn]);

  const activate = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setPhase("error");
      setMessage(t("status.unsupported"));
      return;
    }
    try {
      setPhase("requesting");
      setMessage(t("status.permission"));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      enabledRef.current = true;
      setEnabled(true);
      beginTurnRef.current?.();
    } catch {
      deactivate(t("status.permissionDenied"));
      setPhase("error");
    }
  }, [deactivate, t]);

  useEffect(() => {
    if (interfaceLanguageRef.current === interfaceLanguage) {
      if (!enabledRef.current && phase === "off") setMessage(t("status.off"));
      return;
    }
    interfaceLanguageRef.current = interfaceLanguage;
    if (!spokenLanguageCustomizedRef.current) setSpokenLanguage(interfaceLanguage);
    setTranscript("");
    if (enabledRef.current) deactivate(t("status.off"));
    else setMessage(t("status.off"));
  }, [deactivate, interfaceLanguage, phase, t]);

  useEffect(() => () => {
    enabledRef.current = false;
    releaseResources();
    if (lastRecordingUrlRef.current) URL.revokeObjectURL(lastRecordingUrlRef.current);
  }, [releaseResources]);

  return (
    <aside className={`voice-navigation voice-navigation--${phase}${panelExpanded ? " voice-navigation--expanded" : ""}`} aria-label={t("label")}>
      <div className="voice-navigation__bar">
      <button
        type="button"
        className="voice-navigation__toggle"
        onClick={enabled ? () => deactivate() : activate}
        aria-pressed={enabled}
        aria-label={enabled ? t("deactivate") : t("activate")}
      >
        <span className="voice-navigation__icon" aria-hidden="true">{enabled ? "■" : "●"}</span>
        <span>{enabled ? t("voiceOn") : t("label")}</span>
      </button>
      <span className="voice-navigation__status" role="status" aria-live="polite">{message}</span>
      <button
        type="button"
        className="voice-navigation__panel-toggle"
        onClick={() => setPanelExpanded((current) => !current)}
        aria-expanded={panelExpanded}
        aria-controls="voice-navigation-details"
      >
        {panelExpanded ? t("close") : t("options")}
      </button>
      </div>
      {panelExpanded && (
        <div className="voice-navigation__details" id="voice-navigation-details">
      <div className="voice-navigation__actions">
        {phase === "processing" && <button type="button" onClick={cancelProcessing}>{t("cancel")}</button>}
        {phase === "speaking" && <button type="button" onClick={stopSpeakingNow}>{t("stopTalking")}</button>}
        {phase === "paused" && <button type="button" onClick={activate}>{t("resume")}</button>}
        <button type="button" onClick={() => navigate("/voice-help")}>{t("commands")}</button>
      </div>
      <div className="voice-navigation__language">
        <label htmlFor="voice-command-language">{t("commandLanguageLabel")}</label>
        <select
          id="voice-command-language"
          value={spokenLanguage}
          onChange={changeSpokenLanguage}
          disabled={phase === "processing"}
        >
          {Object.values(SUPPORTED_LOCALES).map((locale) => (
            <option key={locale.code} value={locale.code} lang={locale.code} dir={locale.direction}>
              {locale.nativeName}
            </option>
          ))}
        </select>
      </div>
      {transcript && enabled && <span className="voice-navigation__transcript" title={transcript} dir="auto">“{transcript}”</span>}
      {lastRecording && (
        <div className="voice-navigation__recording">
          <span>{t("lastCaptured", {
            kilobytes: new Intl.NumberFormat(interfaceLanguage, { maximumFractionDigits: 1 }).format(lastRecording.bytes / 1024),
            seconds: new Intl.NumberFormat(interfaceLanguage, { maximumFractionDigits: 1 }).format(lastRecording.durationMs / 1000),
          })}</span>
          <audio controls preload="metadata" src={lastRecording.url}>
            {t("audioUnsupported")}
          </audio>
          <a href={lastRecording.url} download={`voice-debug-${Date.now()}.webm`}>{t("download")}</a>
        </div>
      )}
      <span className="voice-navigation__disclosure">{t("disclosure")}</span>
        </div>
      )}
    </aside>
  );
}
