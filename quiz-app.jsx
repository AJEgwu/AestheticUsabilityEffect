import { useState, useEffect, useRef } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GOOGLE_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// ── Toggle: Allow passage review on Q5 for Group A ──
const ALLOW_PASSAGE_REVIEW = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASSAGE TEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PASSAGE = `Arctic terns hold the record for the longest annual migration of any animal, traveling roughly 44,000 miles each year between Arctic and Antarctic regions. Unlike most migratory birds that follow coastlines, arctic terns frequently cross open ocean. They navigate using a combination of the Earth's magnetic field, the position of the sun, and visual landmarks when near shore. During migration, terns sleep in short bursts while gliding, rarely landing on water. Their round-trip journey takes approximately four months. Researchers discovered that terns do not fly in straight lines but follow curved routes that take advantage of prevailing wind patterns, which actually increases total distance traveled but significantly reduces energy expenditure.`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUESTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QUESTIONS = [
  {
    id: 1,
    type: "table",
    prompt: "What is the price range of the highest-rated coffee shop?",
    options: ["$", "$$", "$$$"],
    correctAnswer: "$$$",
    tableData: [
      { name: "Morningside Roasters", rating: 4.2, price: "$$", distance: "0.8 mi" },
      { name: "Bean Theory", rating: 4.7, price: "$$$", distance: "1.2 mi" },
      { name: "Groundwork", rating: 3.9, price: "$", distance: "0.3 mi" },
      { name: "The Steep", rating: 4.5, price: "$$", distance: "2.1 mi" },
      { name: "Verso Coffee", rating: 4.1, price: "$$$", distance: "0.5 mi" },
    ],
  },
  {
    id: 2,
    type: "passage",
    prompt: "According to the passage, why do arctic terns follow curved routes instead of straight ones?",
    options: [
      "To avoid predators along coastlines",
      "To take advantage of wind patterns and reduce energy use",
      "To stop at visual landmarks for navigation",
      "To find areas of open ocean for resting",
    ],
    correctAnswer: "To take advantage of wind patterns and reduce energy use",
  },
  {
    id: 3,
    type: "schedule",
    prompt: "What room is the 01:00 PM workshop in?",
    options: ["Room 201", "Room 305", "Room 142", "Room 210"],
    correctAnswer: "Room 142",
    scheduleData: [
      { event: "Workshop A", room: "Room 201", time: "09:00 AM" },
      { event: "Workshop B", room: "Room 305", time: "10:30 AM" },
      { event: "Workshop C", room: "Room 142", time: "01:00 PM" },
      { event: "Workshop D", room: "Room 210", time: "02:30 PM" },
    ],
  },
  {
    id: 4,
    type: "scores",
    prompt: "Select the student with the second highest score.",
    options: ["Maya", "Jordan", "Taylor", "Sam", "Alex"],
    correctAnswer: "Taylor",
    scoreData: [
      { name: "Maya", score: 87 },
      { name: "Jordan", score: 94 },
      { name: "Taylor", score: 91 },
      { name: "Sam", score: 88 },
      { name: "Alex", score: 79 },
    ],
  },
  {
    id: 5,
    type: "memory",
    prompt: "From the passage you read earlier, how do arctic terns navigate during migration?",
    options: [
      "By following other bird species along established routes",
      "Using magnetic fields, sun position, and visual landmarks",
      "By tracking ocean currents and water temperature",
      "Using stars at night and wind direction",
    ],
    correctAnswer: "Using magnetic fields, sun position, and visual landmarks",
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const generateId = () => {
  const c = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "P-";
  for (let i = 0; i < 6; i++) id += c[Math.floor(Math.random() * c.length)];
  return id;
};

const getScoreColor = (score) => {
  if (score >= 93) return { bg: "#16a34a", text: "#ffffff" };
  if (score >= 90) return { bg: "#65a30d", text: "#ffffff" };
  if (score >= 87) return { bg: "#ca8a04", text: "#ffffff" };
  if (score >= 83) return { bg: "#ea580c", text: "#ffffff" };
  return { bg: "#dc2626", text: "#ffffff" };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function AestheticUsabilityQuiz() {
  const [phase, setPhase] = useState("select");
  const [group, setGroup] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showPassageReview, setShowPassageReview] = useState(false);

  const [usabilityRating, setUsabilityRating] = useState(null);
  const [difficultyRating, setDifficultyRating] = useState(null);

  const [participantId] = useState(generateId);
  const [responses, setResponses] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const questionStartTime = useRef(null);
  const answerChangeCount = useRef(0);
  const prevAnswer = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (phase === "quiz") {
      questionStartTime.current = Date.now();
      answerChangeCount.current = 0;
      prevAnswer.current = null;
    }
  }, [phase, currentQ]);

  useEffect(() => {
    if (selectedAnswer !== null && prevAnswer.current !== null && selectedAnswer !== prevAnswer.current) {
      answerChangeCount.current += 1;
    }
    prevAnswer.current = selectedAnswer;
  }, [selectedAnswer]);

  const isA = group === "A";
  const question = QUESTIONS[currentQ];
  const canProceed = selectedAnswer !== null && confidence !== null;

  const handleGroupSelect = (g) => {
    setGroup(g);
    setSessionStart(Date.now());
    setPhase("quiz");
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    if (!showConfidence) setShowConfidence(true);
  };

  const handleNext = () => {
    const timeToAnswer = Date.now() - questionStartTime.current;
    setResponses((prev) => [
      ...prev,
      {
        participantId,
        group,
        questionNumber: currentQ + 1,
        timeToAnswer,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: selectedAnswer === question.correctAnswer,
        confidence,
        answerChanges: answerChangeCount.current,
      },
    ]);
    setSelectedAnswer(null);
    setConfidence(null);
    setShowConfidence(false);
    setShowPassageReview(false);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      setPhase("perception1");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const endTime = Date.now();
    const payload = {
      session: {
        participantId,
        group,
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
        viewportWidth: window.innerWidth,
        startTime: new Date(sessionStart).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalDuration: endTime - sessionStart,
        completed: true,
        usabilityRating,
        difficultyRating,
      },
      responses,
    };
    try {
      if (GOOGLE_SCRIPT_URL !== "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch (e) {
      console.error("Submission error:", e);
    }
    setSubmitting(false);
    setPhase("reveal");
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VERSION B STYLES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const B = {
    page: {
      fontFamily: '"Times New Roman", Times, serif',
      background: "#c8c8c8",
      minHeight: "100vh",
      padding: "6px 10px",
      color: "#555",
      fontSize: "12px",
      lineHeight: "1.25",
    },
    prompt: { fontSize: "12px", color: "#666", marginBottom: "6px", lineHeight: "1.25" },
    radio: { marginTop: "2px", cursor: "pointer", accentColor: "#888", width: "11px", height: "11px", flexShrink: 0 },
    btn: (ok) => ({
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: "11px",
      padding: "3px 14px",
      background: ok ? "#ddd" : "#ccc",
      border: "2px outset #bbb",
      cursor: ok ? "pointer" : "not-allowed",
      color: ok ? "#444" : "#aaa",
      marginTop: "10px",
    }),
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GROUP SELECT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "select") {
    return (
      <div style={{ fontFamily: '"DM Sans", sans-serif', minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: "42px", color: "#f8fafc", marginBottom: "8px", letterSpacing: "-0.5px" }}>Usability Study</h1>
          <p style={{ color: "#94a3b8", fontSize: "17px", marginBottom: "48px" }}>Select the group assigned to you by your instructor.</p>
          <div style={{ display: "flex", gap: "24px", justifyContent: "center" }}>
            {["A", "B"].map((g) => (
              <button key={g} onClick={() => handleGroupSelect(g)} style={{ width: "180px", height: "180px", borderRadius: "20px", border: "2px solid rgba(148,163,184,0.2)", background: "rgba(30,41,59,0.8)", backdropFilter: "blur(12px)", color: "#f1f5f9", fontSize: "64px", fontFamily: '"DM Serif Display", serif', cursor: "pointer", transition: "all 0.3s ease", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = g === "A" ? "#3b82f6" : "#8b5cf6"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${g === "A" ? "rgba(59,130,246,0.2)" : "rgba(139,92,246,0.2)"}` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}>
                {g}
                <span style={{ fontSize: "14px", fontFamily: '"DM Sans", sans-serif', color: "#94a3b8", marginTop: "4px" }}>Group {g}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REVEAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "reveal") {
    const correct = responses.filter((r) => r.isCorrect).length;
    return (
      <div style={{ fontFamily: '"DM Sans", sans-serif', minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "32px" }}>
        <div style={{ maxWidth: "640px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: "36px", color: "#f8fafc", marginBottom: "16px" }}>Quiz Complete</h1>
          <p style={{ color: "#94a3b8", fontSize: "18px", lineHeight: "1.7", marginBottom: "32px" }}>
            You were in <strong style={{ color: "#f1f5f9" }}>Group {group}</strong> and scored <strong style={{ color: "#f1f5f9" }}>{correct}/{QUESTIONS.length}</strong>.
          </p>
          <div style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "16px", padding: "32px", textAlign: "left" }}>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: "22px", color: "#f8fafc", marginBottom: "12px" }}>What was this really about?</h2>
            <p style={{ color: "#cbd5e1", fontSize: "15px", lineHeight: "1.8", marginBottom: "16px" }}>
              Both groups answered the <strong style={{ color: "#f1f5f9" }}>exact same questions</strong> with the <strong style={{ color: "#f1f5f9" }}>exact same content and answers</strong>. The only difference was the visual design of the interface.
            </p>
            <p style={{ color: "#cbd5e1", fontSize: "15px", lineHeight: "1.8", marginBottom: "16px" }}>
              Group A received a clean, modern interface with clear typography, good spacing, and strong visual hierarchy. Group B received a deliberately degraded interface with poor contrast, cramped layouts, and bad information structure.
            </p>
            <p style={{ color: "#cbd5e1", fontSize: "15px", lineHeight: "1.8" }}>
              This demonstrates the <strong style={{ color: "#818cf8" }}>Aesthetic-Usability Effect</strong> — the principle that visual design doesn't just change how an interface <em>feels</em>, it changes how well people can actually <em>perform</em> with it.
            </p>
          </div>
          <p style={{ color: "#64748b", fontSize: "13px", marginTop: "24px" }}>Your responses have been recorded. Thank you for participating.</p>
          <p style={{ color: "#475569", fontSize: "12px", marginTop: "8px" }}>Participant ID: {participantId}</p>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERCEPTION 1 — "How easy was this quiz to use?"
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "perception1") {
    if (isA) {
      return (
        <div style={{ fontFamily: '"DM Sans", sans-serif', minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
          <div style={{ maxWidth: "580px", width: "100%" }}>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: "28px", color: "#0f172a", marginBottom: "8px" }}>Almost done</h2>
            <p style={{ color: "#64748b", marginBottom: "40px", fontSize: "16px" }}>Two quick questions about your experience.</p>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: "24px" }}>
              <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: "20px", fontSize: "16px" }}>How easy was this quiz to use?</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} onClick={() => setUsabilityRating(n)} style={{ width: "56px", height: "56px", borderRadius: "12px", border: usabilityRating === n ? "2px solid #3b82f6" : "2px solid #e2e8f0", background: usabilityRating === n ? "#eff6ff" : "#ffffff", color: usabilityRating === n ? "#2563eb" : "#64748b", fontSize: "18px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease", fontFamily: '"DM Sans", sans-serif' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "13px", fontWeight: 500 }}>
                <span>1 = Very Hard to Use</span>
                <span>7 = Very Easy to Use</span>
              </div>
            </div>
            <button onClick={() => setPhase("perception2")} disabled={usabilityRating === null} style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: usabilityRating !== null ? "#0f172a" : "#e2e8f0", color: usabilityRating !== null ? "#ffffff" : "#94a3b8", fontSize: "16px", fontWeight: 600, cursor: usabilityRating !== null ? "pointer" : "not-allowed", transition: "all 0.2s ease", fontFamily: '"DM Sans", sans-serif' }}>
              Next
            </button>
          </div>
        </div>
      );
    }
    // B — perception 1
    return (
      <div style={B.page}>
        <p style={{ fontSize: "12px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>Final Questions (1 of 2)</p>
        <div style={{ borderTop: "1px solid #aaa", paddingTop: "8px", marginBottom: "10px" }}>
          <p style={{ fontSize: "11px", color: "#777", marginBottom: "6px" }}>How easy was this quiz to use?</p>
          {/* Force scroll on mobile — large spacer pushes radios down */}
          <div style={{ height: "180px" }} />
          <div style={{ display: "flex", gap: "1px", alignItems: "center", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <label key={n} style={{ display: "flex", alignItems: "center", gap: "1px", fontSize: "10px", color: "#888", cursor: "pointer" }}>
                <input type="radio" name="usab" checked={usabilityRating === n} onChange={() => setUsabilityRating(n)} style={{ width: "11px", height: "11px", accentColor: "#888" }} />
                {n}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#aaa", marginTop: "2px", maxWidth: "200px" }}>
            <span>1=Hard to use</span>
            <span>7=Easy to use</span>
          </div>
        </div>
        <button onClick={() => setPhase("perception2")} disabled={usabilityRating === null} style={B.btn(usabilityRating !== null)}>
          Next &gt;&gt;
        </button>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERCEPTION 2 — "How difficult were the questions?"
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "perception2") {
    if (isA) {
      return (
        <div style={{ fontFamily: '"DM Sans", sans-serif', minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
          <div style={{ maxWidth: "580px", width: "100%" }}>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: "28px", color: "#0f172a", marginBottom: "8px" }}>One more</h2>
            <p style={{ color: "#64748b", marginBottom: "40px", fontSize: "16px" }}>Last question.</p>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: "24px" }}>
              <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: "20px", fontSize: "16px" }}>How difficult were the questions?</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} onClick={() => setDifficultyRating(n)} style={{ width: "56px", height: "56px", borderRadius: "12px", border: difficultyRating === n ? "2px solid #3b82f6" : "2px solid #e2e8f0", background: difficultyRating === n ? "#eff6ff" : "#ffffff", color: difficultyRating === n ? "#2563eb" : "#64748b", fontSize: "18px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease", fontFamily: '"DM Sans", sans-serif' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "13px", fontWeight: 500 }}>
                <span>1 = Very Easy</span>
                <span>7 = Very Difficult</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={difficultyRating === null || submitting} style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: difficultyRating !== null ? "#0f172a" : "#e2e8f0", color: difficultyRating !== null ? "#ffffff" : "#94a3b8", fontSize: "16px", fontWeight: 600, cursor: difficultyRating !== null ? "pointer" : "not-allowed", transition: "all 0.2s ease", fontFamily: '"DM Sans", sans-serif' }}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </div>
      );
    }
    // B — perception 2
    return (
      <div style={B.page}>
        <p style={{ fontSize: "12px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>Final Questions (2 of 2)</p>
        <div style={{ borderTop: "1px solid #aaa", paddingTop: "8px", marginBottom: "10px" }}>
          <p style={{ fontSize: "11px", color: "#777", marginBottom: "6px" }}>How difficult were the questions?</p>
          <div style={{ height: "180px" }} />
          <div style={{ display: "flex", gap: "1px", alignItems: "center", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <label key={n} style={{ display: "flex", alignItems: "center", gap: "1px", fontSize: "10px", color: "#888", cursor: "pointer" }}>
                <input type="radio" name="diff" checked={difficultyRating === n} onChange={() => setDifficultyRating(n)} style={{ width: "11px", height: "11px", accentColor: "#888" }} />
                {n}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#aaa", marginTop: "2px", maxWidth: "200px" }}>
            <span>1=Easy</span>
            <span>7=Difficult</span>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={difficultyRating === null || submitting} style={B.btn(difficultyRating !== null && !submitting)}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHARED QUIZ COMPONENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const renderConfidence = () => {
    if (!showConfidence) return null;
    if (isA) {
      return (
        <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontWeight: 500, color: "#475569", marginBottom: "12px", fontSize: "14px" }}>How confident are you in your answer?</p>
          <div style={{ display: "flex", gap: "8px" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setConfidence(n)} style={{ width: "48px", height: "48px", borderRadius: "10px", border: confidence === n ? "2px solid #3b82f6" : "2px solid #e2e8f0", background: confidence === n ? "#eff6ff" : "#ffffff", color: confidence === n ? "#2563eb" : "#94a3b8", fontSize: "16px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease", fontFamily: '"DM Sans", sans-serif' }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "280px", color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>
            <span>Not at all</span>
            <span>Very confident</span>
          </div>
        </div>
      );
    }
    return (
      <div style={{ marginTop: "6px", borderTop: "1px solid #bbb", paddingTop: "4px" }}>
        <span style={{ fontSize: "10px", color: "#999" }}>Confidence (1-5): </span>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} style={{ fontSize: "10px", color: "#888", marginRight: "1px", cursor: "pointer" }}>
            <input type="radio" name="conf" checked={confidence === n} onChange={() => setConfidence(n)} style={{ width: "10px", height: "10px", accentColor: "#888" }} />
            {n}
          </label>
        ))}
      </div>
    );
  };

  const renderNextButton = () => {
    if (isA) {
      return (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
          <button onClick={handleNext} disabled={!canProceed} style={{ padding: "12px 40px", borderRadius: "10px", border: "none", background: canProceed ? "#0f172a" : "#e2e8f0", color: canProceed ? "#ffffff" : "#94a3b8", fontSize: "15px", fontWeight: 600, cursor: canProceed ? "pointer" : "not-allowed", transition: "all 0.2s ease", fontFamily: '"DM Sans", sans-serif' }}>
            {currentQ < QUESTIONS.length - 1 ? "Next" : "Continue"}
          </button>
        </div>
      );
    }
    return (
      <div style={{ marginTop: "16px", textAlign: "right" }}>
        <button onClick={handleNext} disabled={!canProceed} style={B.btn(canProceed)}>
          {currentQ < QUESTIONS.length - 1 ? "Next >>" : "Continue >>"}
        </button>
      </div>
    );
  };

  const renderProgress = () => {
    if (!isA) return null;
    const pct = (currentQ / QUESTIONS.length) * 100;
    return (
      <div style={{ marginBottom: "32px" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>Question {currentQ + 1} of {QUESTIONS.length}</span>
        <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginTop: "8px" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #6366f1)", borderRadius: "4px", transition: "width 0.5s ease" }} />
        </div>
      </div>
    );
  };

  // ── Options — A clean, B forces scrolling ──
  const renderOptions = (options) => {
    if (isA) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {options.map((opt) => (
            <button key={opt} onClick={() => handleAnswerSelect(opt)} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", borderRadius: "12px", border: selectedAnswer === opt ? "2px solid #3b82f6" : "2px solid #e2e8f0", background: selectedAnswer === opt ? "#eff6ff" : "#ffffff", cursor: "pointer", transition: "all 0.15s ease", textAlign: "left", fontFamily: '"DM Sans", sans-serif', fontSize: "15px", color: selectedAnswer === opt ? "#1e40af" : "#334155", fontWeight: selectedAnswer === opt ? 500 : 400, width: "100%" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: selectedAnswer === opt ? "6px solid #3b82f6" : "2px solid #cbd5e1", flexShrink: 0, transition: "all 0.15s ease", boxSizing: "border-box" }} />
              {opt}
            </button>
          ))}
        </div>
      );
    }
    // Version B — big spacer forces scroll to see answers
    return (
      <div style={{ marginTop: "4px" }}>
        <div style={{ height: "260px" }} />
        <p style={{ fontSize: "10px", color: "#aaa", marginBottom: "3px", borderTop: "1px dashed #bbb", paddingTop: "3px" }}>Select your answer:</p>
        {options.map((opt, i) => (
          <div key={opt} style={{ display: "flex", alignItems: "flex-start", gap: "3px", padding: "1px 0", cursor: "pointer", fontSize: "12px", color: "#666", lineHeight: "1.2" }}>
            <input type="radio" name={`q${currentQ}`} checked={selectedAnswer === opt} onChange={() => handleAnswerSelect(opt)} style={B.radio} id={`q${currentQ}_${i}`} />
            <label htmlFor={`q${currentQ}_${i}`} style={{ cursor: "pointer", color: "#666", fontSize: "12px" }}>{opt}</label>
          </div>
        ))}
      </div>
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUESTION RENDERERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const renderQ1 = () => {
    const q = QUESTIONS[0];
    if (isA) {
      return (
        <>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "#0f172a", marginBottom: "20px", lineHeight: "1.5" }}>{q.prompt}</p>
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: '"DM Sans", sans-serif' }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Name", "Rating", "Price Range", "Distance"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.tableData.map((row, i) => (
                  <tr key={row.name} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0f172a", fontSize: "14px" }}>{row.name}</td>
                    <td style={{ padding: "12px 16px", color: "#334155", fontSize: "14px" }}>{row.rating}</td>
                    <td style={{ padding: "12px 16px", color: "#334155", fontSize: "14px" }}>{row.price}</td>
                    <td style={{ padding: "12px 16px", color: "#334155", fontSize: "14px" }}>{row.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderOptions(q.options)}
        </>
      );
    }
    return (
      <>
        <p style={B.prompt}>{q.prompt}</p>
        <table style={{ borderCollapse: "collapse", fontSize: "11px", color: "#777", marginBottom: "6px", width: "100%" }}>
          <thead>
            <tr>
              {["Name", "Rating", "Price", "Dist."].map((h) => (
                <td key={h} style={{ padding: "1px 4px", fontSize: "11px", color: "#888", borderBottom: "1px solid #bbb" }}>{h}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.tableData.map((row) => (
              <tr key={row.name}>
                <td style={{ padding: "1px 4px", fontSize: "11px", color: "#777" }}>{row.name}</td>
                <td style={{ padding: "1px 4px", fontSize: "11px", color: "#777" }}>{row.rating}</td>
                <td style={{ padding: "1px 4px", fontSize: "11px", color: "#777" }}>{row.price}</td>
                <td style={{ padding: "1px 4px", fontSize: "11px", color: "#777" }}>{row.distance}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {renderOptions(q.options)}
      </>
    );
  };

  const renderQ2 = () => {
    const q = QUESTIONS[1];
    if (isA) {
      const sentences = PASSAGE.split(". ");
      const mid = Math.ceil(sentences.length / 2);
      const para1 = sentences.slice(0, mid).join(". ") + ".";
      const para2 = sentences.slice(mid).join(". ");
      return (
        <>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Read the following passage</p>
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "28px", marginBottom: "28px", borderLeft: "4px solid #6366f1" }}>
            <p style={{ fontSize: "16px", lineHeight: "1.75", color: "#334155", marginBottom: "16px" }}>{para1}</p>
            <p style={{ fontSize: "16px", lineHeight: "1.75", color: "#334155" }}>{para2}</p>
          </div>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "#0f172a", marginBottom: "20px", lineHeight: "1.5" }}>{q.prompt}</p>
          {renderOptions(q.options)}
        </>
      );
    }
    return (
      <>
        <div style={{ fontSize: "11px", lineHeight: "1.1", color: "#999", textAlign: "justify", marginBottom: "6px", padding: "4px", background: "#bbb", maxWidth: "100%", letterSpacing: "-0.2px" }}>
          {PASSAGE}
        </div>
        <p style={B.prompt}>{q.prompt}</p>
        {renderOptions(q.options)}
      </>
    );
  };

  const renderQ3 = () => {
    const q = QUESTIONS[2];
    if (isA) {
      return (
        <>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "#0f172a", marginBottom: "20px", lineHeight: "1.5" }}>{q.prompt}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {q.scheduleData.map((item) => (
              <div key={item.event} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "15px" }}>{item.event}</div>
                  <div style={{ color: "#64748b", fontSize: "13px", marginTop: "2px" }}>{item.room}</div>
                </div>
                <div style={{ background: "#f1f5f9", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, color: "#475569", fontSize: "14px" }}>{item.time}</div>
              </div>
            ))}
          </div>
          {renderOptions(q.options)}
        </>
      );
    }
    return (
      <>
        <p style={B.prompt}>{q.prompt}</p>
        <div style={{ marginBottom: "6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", color: "#777" }}>
            <thead>
              <tr>
                <td style={{ padding: "1px 3px", color: "#999", fontSize: "10px" }}>Event</td>
                <td style={{ padding: "1px 3px", color: "#999", fontSize: "10px" }}>Room</td>
                <td style={{ padding: "1px 3px", color: "#999", fontSize: "10px" }}>Time</td>
              </tr>
            </thead>
            <tbody>
              {q.scheduleData.map((item) => (
                <tr key={item.event}>
                  <td style={{ padding: "14px 3px", fontSize: "11px", color: "#777" }}>{item.event}</td>
                  <td style={{ padding: "14px 3px", fontSize: "11px", color: "#777" }}>{item.room}</td>
                  <td style={{ padding: "14px 3px", fontSize: "11px", color: "#777" }}>{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderOptions(q.options)}
      </>
    );
  };

  const renderQ4 = () => {
    const q = QUESTIONS[3];
    if (isA) {
      return (
        <>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "#0f172a", marginBottom: "4px", lineHeight: "1.5" }}>
            The following list shows test scores for five students.
          </p>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "#0f172a", marginBottom: "24px", lineHeight: "1.5" }}>
            Select the student with the <span style={{ background: "#fef3c7", padding: "2px 6px", borderRadius: "4px" }}>second highest</span> score.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {q.scoreData.map((s) => {
              const c = getScoreColor(s.score);
              return (
                <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontWeight: 500, color: "#0f172a", fontSize: "15px" }}>{s.name}</span>
                  <span style={{ background: c.bg, color: c.text, padding: "4px 16px", borderRadius: "6px", fontWeight: 700, fontSize: "15px", minWidth: "40px", textAlign: "center" }}>{s.score}</span>
                </div>
              );
            })}
          </div>
          {renderOptions(q.options)}
        </>
      );
    }
    // B — SAME colors as A, instruction buried, inline layout
    return (
      <>
        <p style={{ fontSize: "11px", color: "#777", lineHeight: "1.3", marginBottom: "6px" }}>
          The following list shows test scores for five students. Please review the scores presented below carefully and then select the student who received the second highest score from the available answer choices listed further down.
        </p>
        <div style={{ marginBottom: "6px", fontSize: "12px", color: "#777", fontFamily: '"Times New Roman", Times, serif', lineHeight: "1.4" }}>
          {q.scoreData.map((s, i) => (
            <span key={s.name}>
              {s.name}: {s.score}{i < q.scoreData.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
        {renderOptions(q.options)}
      </>
    );
  };

  const renderQ5 = () => {
    const q = QUESTIONS[4];
    if (isA) {
      const sentences = PASSAGE.split(". ");
      const mid = Math.ceil(sentences.length / 2);
      const para1 = sentences.slice(0, mid).join(". ") + ".";
      const para2 = sentences.slice(mid).join(". ");
      return (
        <>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "#0f172a", marginBottom: "16px", lineHeight: "1.5" }}>{q.prompt}</p>
          {ALLOW_PASSAGE_REVIEW && (
            <>
              <button onClick={() => setShowPassageReview(!showPassageReview)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 16px", color: "#6366f1", fontSize: "14px", cursor: "pointer", marginBottom: "16px", fontFamily: '"DM Sans", sans-serif', fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                {showPassageReview ? "▾ Hide passage" : "▸ Review passage"}
              </button>
              {showPassageReview && (
                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "24px", marginBottom: "20px", borderLeft: "4px solid #6366f1" }}>
                  <p style={{ fontSize: "15px", lineHeight: "1.7", color: "#475569", marginBottom: "12px" }}>{para1}</p>
                  <p style={{ fontSize: "15px", lineHeight: "1.7", color: "#475569" }}>{para2}</p>
                </div>
              )}
            </>
          )}
          {renderOptions(q.options)}
        </>
      );
    }
    return (
      <>
        <p style={{ fontSize: "11px", color: "#888", lineHeight: "1.2", marginBottom: "4px", textAlign: "right" }}>{q.prompt}</p>
        {renderOptions(q.options)}
      </>
    );
  };

  const renderQuestionContent = () => {
    switch (currentQ) {
      case 0: return renderQ1();
      case 1: return renderQ2();
      case 2: return renderQ3();
      case 3: return renderQ4();
      case 4: return renderQ5();
      default: return null;
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN QUIZ RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isA) {
    return (
      <div style={{ fontFamily: '"DM Sans", sans-serif', minHeight: "100vh", background: "#f8fafc", display: "flex", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ maxWidth: "640px", width: "100%" }}>
          {renderProgress()}
          <div style={{ background: "#ffffff", borderRadius: "20px", padding: "36px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}>
            {renderQuestionContent()}
            {renderConfidence()}
            {renderNextButton()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={B.page}>
      <div style={{ maxWidth: "100%", borderBottom: "1px solid #aaa", paddingBottom: "2px", marginBottom: "4px" }}>
        <span style={{ fontSize: "10px", color: "#aaa" }}>Q{currentQ + 1}/{QUESTIONS.length}</span>
      </div>
      {renderQuestionContent()}
      {renderConfidence()}
      {renderNextButton()}
    </div>
  );
}
