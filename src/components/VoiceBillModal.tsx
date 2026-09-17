"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Mic, MicOff, Printer, Trash2, X } from "lucide-react";
import { tHindi } from "@/lib/i18n";
import { localizedName } from "@/lib/localized-name";
import {
  isSpeechRecognitionSupported,
  parseBestVoiceOrder,
  type VoiceMenuItem,
  type VoiceParsedLine,
  type VoiceTable,
} from "@/lib/voice-bill";

export type VoiceBillApproval = {
  tableId: string;
  paymentMethod: "Cash" | "UPI" | "Udhaar";
  customerName: string;
  lines: Array<{
    id: string;
    name: string;
    nameHi?: string;
    price: number;
    quantity: number;
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  menuItems: VoiceMenuItem[];
  tables: VoiceTable[];
  selectedTable: string;
  currency: string;
  onApprove: (bill: VoiceBillApproval) => void | Promise<void>;
};

export type VoiceBillHandle = {
  start: () => void;
};

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((ev: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; length: number; [index: number]: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function createRecognition(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

function toDraft(lines: VoiceParsedLine[]) {
  return lines.map((l) => ({
    spoken: l.spoken,
    quantity: l.quantity,
    menuItem: l.menuItem,
    alternatives: l.alternatives,
    ambiguous: l.ambiguous,
  }));
}

export const VoiceBillModal = React.forwardRef<VoiceBillHandle, Props>(function VoiceBillModal(
  {
    open,
    onClose,
    menuItems,
    tables,
    selectedTable,
    currency,
    onApprove,
  },
  ref
) {
  const t = tHindi;
  const supported = useMemo(() => isSpeechRecognitionSupported(), []);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [tableId, setTableId] = useState(selectedTable);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Udhaar">("Cash");
  const [customerName, setCustomerName] = useState("");
  const [draftLines, setDraftLines] = useState<ReturnType<typeof toDraft>>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [approving, setApproving] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [level, setLevel] = useState(0);

  const wantListenRef = useRef(false);
  const listeningRef = useRef(false);
  const finalTextRef = useRef("");
  const recRef = useRef<SpeechRec | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tablePickedRef = useRef(false);
  const paymentPickedRef = useRef(false);
  const namePickedRef = useRef(false);
  const fatalErrorRef = useRef(false);
  const langTryRef = useRef<"hi-IN" | "en-IN">("hi-IN");
  const networkTriesRef = useRef(0);
  const tRef = useRef(t);
  tRef.current = t;

  const parsed = useMemo(
    () => parseBestVoiceOrder([transcript, ...candidates], menuItems, tables),
    [transcript, candidates, menuItems, tables]
  );

  const stopMeter = () => {
    if (meterRafRef.current) cancelAnimationFrame(meterRafRef.current);
    meterRafRef.current = 0;
    try {
      void audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    setLevel(0);
  };

  const releaseMic = () => {
    stopMeter();
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const startMeter = (stream: MediaStream) => {
    stopMeter();
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!wantListenRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
        meterRafRef.current = requestAnimationFrame(tick);
      };
      void ctx.resume();
      tick();
    } catch {
      /* meter is optional */
    }
  };

  const stopListening = () => {
    wantListenRef.current = false;
    listeningRef.current = false;
    setListening(false);
    try {
      recRef.current?.abort();
    } catch {
      /* already stopped */
    }
    releaseMic();
  };

  const beginRecognition = () => {
    if (!wantListenRef.current) return;
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    const rec = createRecognition();
    if (!rec) {
      wantListenRef.current = false;
      listeningRef.current = false;
      setListening(false);
      setError(tRef.current("Voice needs Chrome"));
      releaseMic();
      return;
    }
    recRef.current = rec;
    rec.lang = langTryRef.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    rec.onresult = (event) => {
      fatalErrorRef.current = false;
      networkTriesRef.current = 0;
      let interim = "";
      const hyps: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const prefix = finalTextRef.current;
          const top = res[0]?.transcript || "";
          for (let a = 0; a < res.length; a++) {
            const piece = res[a]?.transcript || "";
            if (piece) hyps.push(`${prefix} ${piece}`.trim());
          }
          finalTextRef.current = `${prefix} ${top}`.trim();
        } else {
          interim += res[0]?.transcript || "";
        }
      }
      const heard = `${finalTextRef.current} ${interim}`.trim();
      setTranscript(heard);
      if (hyps.length) setCandidates(Array.from(new Set([heard, ...hyps])));
      else setCandidates((prev) => (heard ? Array.from(new Set([heard, ...prev])) : prev));
    };

    rec.onerror = (event) => {
      const code = event.error || "";
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        fatalErrorRef.current = true;
        wantListenRef.current = false;
        listeningRef.current = false;
        setListening(false);
        setError(tRef.current("Mic permission denied"));
        releaseMic();
        return;
      }
      if (code === "network") {
        if (networkTriesRef.current < 2 && wantListenRef.current) {
          networkTriesRef.current += 1;
          if (networkTriesRef.current === 2) langTryRef.current = "en-IN";
          return;
        }
        fatalErrorRef.current = true;
        wantListenRef.current = false;
        listeningRef.current = false;
        setListening(false);
        setError(tRef.current("Voice needs internet"));
        releaseMic();
        return;
      }
      if (code === "audio-capture") {
        fatalErrorRef.current = true;
        wantListenRef.current = false;
        listeningRef.current = false;
        setListening(false);
        setError(tRef.current("Could not start microphone"));
        releaseMic();
      }
    };

    rec.onend = () => {
      listeningRef.current = false;
      if (!wantListenRef.current || fatalErrorRef.current) {
        setListening(false);
        return;
      }
      window.setTimeout(() => {
        if (wantListenRef.current && !fatalErrorRef.current) beginRecognition();
      }, 180);
    };

    try {
      rec.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      wantListenRef.current = false;
      listeningRef.current = false;
      setListening(false);
      setError(tRef.current("Could not start microphone"));
      releaseMic();
    }
  };

  const startListening = () => {
    setError("");
    fatalErrorRef.current = false;
    networkTriesRef.current = 0;
    langTryRef.current = "hi-IN";
    wantListenRef.current = true;
    beginRecognition();
    const media = navigator.mediaDevices?.getUserMedia?.({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (!media) return;
    media
      .then((stream) => {
        if (!wantListenRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        releaseMic();
        streamRef.current = stream;
        startMeter(stream);
      })
      .catch(() => {
        if (!listeningRef.current) {
          wantListenRef.current = false;
          setListening(false);
          setError(tRef.current("Mic permission denied"));
        }
      });
  };

  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  React.useImperativeHandle(ref, () => ({
    start: () => startListeningRef.current(),
  }));

  useEffect(() => {
    if (open) {
      setTyped("");
      setApproving(false);
      tablePickedRef.current = false;
      paymentPickedRef.current = false;
      namePickedRef.current = false;
      setTableId(selectedTable);
      setPaymentMethod("Cash");
      setCustomerName("");
      if (!listeningRef.current) {
        setTranscript("");
        setDraftLines([]);
        setUnmatched([]);
        setError("");
        setListening(false);
        setCandidates([]);
        finalTextRef.current = "";
      }
      return;
    }
    stopListening();
    setTranscript("");
    setTyped("");
    setError("");
    setDraftLines([]);
    setUnmatched([]);
    setApproving(false);
    setCandidates([]);
    finalTextRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDraftLines(toDraft(parsed.lines));
    setUnmatched(parsed.unmatched);
    if (parsed.tableHint && !tablePickedRef.current) {
      if (parsed.tableHint.kind === "parcel") setTableId("PARCEL");
      else setTableId(parsed.tableHint.id);
    }
    if (parsed.paymentHint && !paymentPickedRef.current) {
      setPaymentMethod(parsed.paymentHint);
    }
    if (parsed.customerName && !namePickedRef.current) {
      setCustomerName(parsed.customerName);
    }
  }, [open, parsed]);

  useEffect(() => {
    return () => {
      wantListenRef.current = false;
      listeningRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (meterRafRef.current) cancelAnimationFrame(meterRafRef.current);
      try {
        void audioCtxRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const applyTyped = () => {
    const extra = typed.trim();
    if (!extra) return;
    finalTextRef.current = `${finalTextRef.current} ${extra}`.trim();
    setTranscript(finalTextRef.current);
    setCandidates((prev) => Array.from(new Set([finalTextRef.current, extra, ...prev])));
    setTyped("");
  };

  const clearHeard = () => {
    finalTextRef.current = "";
    setTranscript("");
    setDraftLines([]);
    setUnmatched([]);
    setTyped("");
    setCandidates([]);
  };

  const subtotal = draftLines.reduce((a, l) => a + l.menuItem.price * l.quantity, 0);
  const canApprove =
    !approving &&
    draftLines.length > 0 &&
    Boolean(tableId) &&
    (paymentMethod !== "Udhaar" || customerName.trim() !== "");

  const approve = async () => {
    if (!canApprove) return;
    stopListening();
    setApproving(true);
    try {
      await onApprove({
        tableId,
        paymentMethod,
        customerName: customerName.trim(),
        lines: draftLines.map((l) => ({
          id: l.menuItem.id,
          name: l.menuItem.name,
          nameHi: l.menuItem.nameHi,
          price: l.menuItem.price,
          quantity: l.quantity,
        })),
      });
    } finally {
      setApproving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh] shadow-2xl">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Mic className="w-5 h-5 text-amber-500" /> {t("Voice Bill")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{t("Speak Hindi or Hinglish")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full font-bold"
            aria-label={t("Close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex flex-col items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => (listening ? stopListening() : startListening())}
              disabled={!supported}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all disabled:opacity-40 ${
                listening ? "bg-red-500 animate-pulse" : "bg-amber-500 hover:bg-amber-600"
              }`}
              aria-label={listening ? t("Stop listening") : t("Tap to speak")}
            >
              {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            {listening && (
              <div className="flex items-end gap-0.5 h-6" aria-hidden>
                {[0.35, 0.7, 1, 0.7, 0.35].map((w, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-amber-500"
                    style={{ height: `${Math.max(6, Math.round(level * w * 24))}px` }}
                  />
                ))}
              </div>
            )}
            <div className="text-sm font-bold text-slate-700">
              {listening ? t("Listening...") : supported ? t("Tap to speak") : t("Voice needs Chrome")}
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-snug max-w-sm">
              {t("Voice bill example")}
            </p>
          </div>

          {(transcript || listening) && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-400">{t("I heard")}</span>
                {transcript && (
                  <button type="button" onClick={clearHeard} className="text-[10px] font-bold text-red-500">
                    {t("Clear")}
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-800 min-h-[2.5rem]" aria-live="polite">
                {transcript || "…"}
              </p>
            </div>
          )}

          <div className="flex gap-1">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyTyped();
              }}
              placeholder={t("Or type the order")}
              className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={applyTyped}
              disabled={!typed.trim()}
              className="h-9 px-3 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-40"
            >
              {t("Add")}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-slate-500 col-span-2 sm:col-span-1">
              {t("Table")}
              <select
                value={tableId}
                onChange={(e) => {
                  tablePickedRef.current = true;
                  setTableId(e.target.value);
                }}
                className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 bg-white"
              >
                <option value="">{t("Select Table")}</option>
                <option value="PARCEL">{t("PARCEL (Takeaway)")}</option>
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-500 col-span-2 sm:col-span-1">
              {t("Payment")}
              <select
                value={paymentMethod}
                onChange={(e) => {
                  paymentPickedRef.current = true;
                  setPaymentMethod(e.target.value as "Cash" | "UPI" | "Udhaar");
                }}
                className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 bg-white"
              >
                <option value="Cash">{t("Cash")}</option>
                <option value="UPI">{t("UPI")}</option>
                <option value="Udhaar">{t("Udhaar")}</option>
              </select>
            </label>
            {(tableId === "PARCEL" || paymentMethod === "Udhaar") && (
              <label className="text-[11px] font-bold text-slate-500 col-span-2">
                {t("Customer Name")}
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    namePickedRef.current = true;
                    setCustomerName(e.target.value);
                  }}
                  placeholder={
                    paymentMethod === "Udhaar"
                      ? t("Customer Name (Required for Udhaar)")
                      : t("Customer Name (Optional)")
                  }
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </label>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1.5">
              {t("Matched items")}
            </div>
            {draftLines.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center">{t("No items recognized")}</p>
            ) : (
              <div className="space-y-1.5">
                {draftLines.map((line, idx) => (
                  <div key={`${line.menuItem.id}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900">
                          {localizedName(line.menuItem, "hi")}
                        </div>
                        <div className="text-[11px] font-mono text-amber-700">
                          {currency}
                          {line.menuItem.price.toFixed(0)} × {line.quantity} = {currency}
                          {(line.menuItem.price * line.quantity).toFixed(0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={String(line.quantity)}
                          onChange={(e) => {
                            const n = Math.max(1, Math.min(999, Math.floor(Number(e.target.value.replace(/[^\d]/g, "") || "1"))));
                            setDraftLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: n } : l)));
                          }}
                          className="w-10 h-8 text-center font-bold text-sm border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setDraftLines((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"
                          aria-label={t("Delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {line.alternatives.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-[10px] font-bold text-amber-700 self-center">{t("Did you mean")}</span>
                        {[line.menuItem, ...line.alternatives].map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() =>
                              setDraftLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx
                                    ? {
                                        ...l,
                                        menuItem: alt,
                                        alternatives: [line.menuItem, ...line.alternatives].filter((a) => a.id !== alt.id),
                                        ambiguous: true,
                                      }
                                    : l
                                )
                              )
                            }
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              alt.id === line.menuItem.id
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            {localizedName(alt, "hi")} {currency}
                            {alt.price.toFixed(0)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {unmatched.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-bold">{t("Could not match")}: </span>
              {unmatched.join(" · ")}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-500">{t("TOTAL")}</span>
            <span className="font-extrabold font-mono text-xl text-amber-600">
              {currency} {subtotal.toFixed(2)}
            </span>
          </div>
          {!tableId && draftLines.length > 0 && (
            <p className="text-[11px] text-red-600 font-semibold">{t("Select table to continue")}</p>
          )}
          {paymentMethod === "Udhaar" && !customerName.trim() && (
            <p className="text-[11px] text-red-600 font-semibold">{t("Enter Name for Udhaar")}</p>
          )}
          {draftLines.length > 0 && (
            <p className="text-[11px] text-slate-500 text-center">{t("Voice bill replaces cart")}</p>
          )}
          <button
            type="button"
            onClick={approve}
            disabled={!canApprove}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Check className="w-5 h-5" /> {approving ? t("Saving...") : t("Approve & Preview")}
            <Printer className="w-4 h-4 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
});
