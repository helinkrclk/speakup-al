import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  LogOut, 
  Briefcase, 
  Heart, 
  Mic2, 
  Settings2,
  RotateCcw,
  Sparkles,
  Trophy,
  Lightbulb
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

// --- Types ---
type Role = "user" | "model";

interface Message {
  role: Role;
  text: string;
}

interface Analysis {
  confidenceScore: number;
  bestPhrases: string[];
  advice: string;
}

type FlowPhase = "needs_topic" | "roleplay";

// --- Constants ---
const DEFAULT_ACCENT = "#6366f1";

// --- Utilities ---
const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
};

const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= hp && hp < 1) { r1 = c; g1 = x; }
  else if (1 <= hp && hp < 2) { r1 = x; g1 = c; }
  else if (2 <= hp && hp < 3) { g1 = c; b1 = x; }
  else if (3 <= hp && hp < 4) { g1 = x; b1 = c; }
  else if (4 <= hp && hp < 5) { r1 = x; b1 = c; }
  else if (5 <= hp && hp < 6) { r1 = c; b1 = x; }
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function App() {
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("SPEAKUP_THEME_COLOR") || DEFAULT_ACCENT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("needs_topic");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [customRole, setCustomRole] = useState("");
  const [customTopic, setCustomTopic] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("SPEAKUP_THEME_COLOR", accentColor);
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      const { h } = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const bg1 = rgbToHex(...Object.values(hslToRgb((h + 0) % 360, 85, 92)) as [number, number, number]);
      const bg2 = rgbToHex(...Object.values(hslToRgb((h + 40) % 360, 80, 92)) as [number, number, number]);
      const bg3 = rgbToHex(...Object.values(hslToRgb((h + 120) % 360, 75, 92)) as [number, number, number]);
      
      document.documentElement.style.setProperty("--bg1", bg1);
      document.documentElement.style.setProperty("--bg2", bg2);
      document.documentElement.style.setProperty("--bg3", bg3);
      document.documentElement.style.setProperty("--accent", accentColor);
    }
  }, [accentColor]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const ai = new GoogleGenAI("AIzaSyCaawK6yPqaB7qxv_6Y7Y8ErVI7pz2hkFk");

  const startScenario = (name: string, scenarioText?: string) => {
    setCurrentScenario(scenarioText || name);
    setMessages([{ role: "model", text:scenariotext//"Merhaba!pratiğe başlayalım mı?" }]);
    setFlowPhase("needs_topic");
    setSelectedTopic("");
    setSelectedPersona("");
    setAnalysis(null);
    setShowAnalysis(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    const newMessages: Message[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    let currentPhase = flowPhase;
    let currentTopic = selectedTopic;
    let currentPersona = selectedPersona;

    if (currentPhase === "needs_topic") {
      currentTopic = userMsg;
      setSelectedTopic(userMsg);
      currentPhase = "roleplay";
      setFlowPhase("roleplay");
      
      // Determine persona based on topic
      const t = userMsg.toLowerCase();
      if (t.includes("maaş") || t.includes("pazarlık")) currentPersona = "Patron (pazarlıkçı)";
      else if (t.includes("arkadaş") || t.includes("sınır")) currentPersona = "Zor bir arkadaş (savunmacı)";
      else if (t.includes("mülakat") || t.includes("iş")) currentPersona = "Mülakatçı (net ve şüpheci)";
      else currentPersona = "Şüpheci bir karşı taraf";
      
      setSelectedPersona(currentPersona);
    }

    try {
      const systemInstruction = `
        Sen SpeakUp AI sosyal koçusun. Senaryo: ${currentScenario}.
        Amacın: sosyal kaygı yaşayan kullanıcının güvenli bir ortamda pratik kazanmasını sağlamak.
        
        AKTİF DURUM: ${currentPhase === "roleplay" ? "ROLE-PLAY MODU" : "KONU BELİRLEME MODU"}.
        Konu: ${currentTopic}.
        Persona: ${currentPersona}.
        
        KRİTİK TALİMAT:
        - Eğer phase=roleplay ise, ASLA "hangi konuda pratik yapmak istersin" veya "ne hakkında konuşalım" diye sorma. Konu zaten "${currentTopic}" olarak belirlendi.
        - Doğrudan role-play karakterine bürün ve konuşmayı başlat/devam ettir.
        
        KURALLAR:
        1. Karakterine tam bürün. Kısa, gerçekçi ve bazen hafif zorlayıcı ol.
        2. Her mesajda: (a) Rol-uyumlu yanıt ver, (b) En fazla 1 soru sor, (c) 1 küçük meydan okuma ver, (d) 1 yapıcı geri bildirim ekle.
        3. Kullanıcıyı nazikçe zorla ama daima yapıcı kal.
        4. Türkçe konuş.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: newMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        config: {
          systemInstruction,
          temperature: 0.8,
        }
      });

      const aiText = response.text || "Üzgünüm, bir hata oluştu.";
      setMessages(prev => [...prev, { role: "model", text: aiText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "model", text: "Bağlantı hatası oluştu. Lütfen tekrar deneyin." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSession = async () => {
    setIsTyping(true);
    try {
      const userMessages = messages.filter(m => m.role === "user").map(m => m.text).join("\n");
      const prompt = `
        Aşağıdaki konuşma geçmişindeki KULLANICI mesajlarını analiz et.
        JSON formatında şu bilgileri ver:
        {
          "confidenceScore": 0-100 arası bir sayı,
          "bestPhrases": ["en iyi 1. cümle", "en iyi 2. cümle"],
          "advice": "Gelişim tavsiyeleri (madde madde)"
        }
        
        Kullanıcı Mesajları:
        ${userMessages}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      setAnalysis(result);
      setShowAnalysis(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 overflow-x-hidden" style={{
      background: `
        radial-gradient(800px 500px at 12% 10%, var(--bg1), transparent 60%),
        radial-gradient(900px 600px at 88% 20%, var(--bg2), transparent 62%),
        radial-gradient(900px 650px at 40% 95%, var(--bg3), transparent 60%),
        linear-gradient(135deg, var(--bg1), var(--bg2), var(--bg3))
      `
    }}>
      {/* Header */}
      <header className="text-white p-4 shadow-md flex justify-between items-center" style={{ backgroundColor: accentColor }}>
        <div className="flex items-center gap-2">
          <Mic2 className="w-6 h-6" />
          <h1 className="text-xl font-bold">SpeakUp AI</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white/15 border border-white/20 px-3 py-1.5 rounded-xl">
            <Settings2 className="w-4 h-4" />
            <input 
              type="color" 
              value={accentColor} 
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-6 h-6 bg-transparent border-0 p-0 cursor-pointer" 
            />
            <button 
              onClick={() => setAccentColor(DEFAULT_ACCENT)}
              className="text-xs font-bold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition"
            >
              Sıfırla
            </button>
          </div>
          <span className="text-xs bg-black/20 px-2 py-1 rounded-full italic">Beta</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto w-full">
          {!currentScenario ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/55 backdrop-blur-md border border-white/70 shadow-lg rounded-3xl p-6 md:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-700/80">SpeakUp AI</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">Sosyal pratik senaryonu seç</h2>
                  <p className="text-sm md:text-base text-gray-700 mt-2">
                    Kartlardan birine tıklayınca role-play başlayacak. Amaç: nazikçe zorlamak, sonra yapıcı kalmak.
                  </p>
                </div>
                <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-white/60 border border-white/70 shadow-sm">
                  <Sparkles className="w-8 h-8 text-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  { id: 'job', name: 'İş Mülakatı', icon: <Briefcase />, color: 'indigo', desc: 'Mülakatçı rolü, net cevap iste' },
                  { id: 'date', name: 'İlk Buluşma', icon: <Heart />, color: 'rose', desc: 'Partner rolü, akıcı diyalog kur' },
                  { id: 'presentation', name: 'Zorlu Sunum', icon: <Mic2 />, color: 'emerald', desc: 'Jüri/profesör rolü, cesaret testi' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => startScenario(s.name)}
                    className="text-left p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 shadow-sm hover:shadow-md hover:bg-white/75 transition active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-${s.color}-500/15 border border-${s.color}-500/20 flex items-center justify-center group-hover:scale-110 transition`}>
                        {s.icon}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{s.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Scenario */}
              <div className="mt-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/70 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                  Kendi Senaryonu Yaz
                </h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Rol / kişi (örn: sert hoca)" 
                    className="w-full border border-white/70 bg-white/70 backdrop-blur-md p-3 rounded-2xl focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                  <input 
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Konu (örn: tez savunması)" 
                    className="w-full border border-white/70 bg-white/70 backdrop-blur-md p-3 rounded-2xl focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
                <button 
                  onClick={() => startScenario("Özel Senaryo", `Rol: ${customRole}, Konu: ${customTopic}`)}
                  className="mt-4 w-full sm:w-auto bg-indigo-500/20 text-indigo-900 border border-indigo-500/30 px-8 py-3 rounded-2xl font-bold hover:bg-indigo-500/25 transition active:scale-95"
                >
                  Role-Play Başlat
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
              <AnimatePresence mode="popLayout">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.role === "user" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`p-4 rounded-2xl shadow-sm max-w-[85%] backdrop-blur-md border ${
                      m.role === "user" 
                        ? "bg-indigo-500 text-white border-indigo-400" 
                        : "bg-white/80 text-gray-900 border-white/60"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white/80 border border-white/60 rounded-2xl p-4 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      {currentScenario && (
        <footer className="p-4 bg-white/50 backdrop-blur-md border-t border-white/60">
          <div className="max-w-4xl mx-auto flex gap-2">
            <button 
              onClick={() => setCurrentScenario(null)}
              className="p-3 rounded-xl bg-white/60 border border-white/70 text-gray-700 hover:bg-white/80 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Mesajınızı yazın..." 
              className="flex-1 border border-white/70 bg-white/70 backdrop-blur-md p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !inputValue.trim()}
              className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
            <button 
              onClick={handleEndSession}
              disabled={isTyping || messages.length < 3}
              className="bg-rose-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-rose-600 transition disabled:opacity-50"
            >
              Bitir
            </button>
          </div>
        </footer>
      )}

      {/* Analysis Modal */}
      <AnimatePresence>
        {showAnalysis && analysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-white/70 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Analiz Sonucu
                </h2>
                <button onClick={() => setShowAnalysis(false)} className="text-gray-400 hover:text-gray-600">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-bold text-gray-500 uppercase">Özgüven Skoru</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-indigo-600">{analysis.confidenceScore}</span>
                      <span className="text-gray-400">/ 100</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-bold text-gray-500 uppercase">En İyi Cümlelerin</p>
                    <ul className="mt-2 space-y-2">
                      {analysis.bestPhrases.map((p, i) => (
                        <li key={i} className="text-sm text-gray-700 italic border-l-2 border-indigo-200 pl-3">"{p}"</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Gelişim Tavsiyesi
                  </p>
                  <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{analysis.advice}</p>
                </div>

                <button 
                  onClick={() => {
                    setCurrentScenario(null);
                    setShowAnalysis(false);
                  }}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Yeni Pratik Başlat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
