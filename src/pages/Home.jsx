import { Link } from "react-router-dom";

const COURSES = [
  {
    id: "mev",
    title: "MEV Masterclass",
    description:
      "Understanding maximal extractable value on Solana — from fundamentals to defense strategies.",
    tag: "MEV",
    tagColor: "#C8F06E",
    modules: 9,
    path: "/mev",
    progressKey: "soledu-mev-progress",
  },
  {
    id: "ecosystem",
    title: "Solana Ecosystem Deep Dive",
    description:
      "From the whitepaper to every layer of the ecosystem — validators, DeFi, staking, stablecoins, DePIN, AI agents, and how they all connect.",
    tag: "ECOSYSTEM",
    tagColor: "#14F195",
    modules: 13,
    path: "/ecosystem",
    progressKey: "soledu-ecosystem-progress",
  },
];

function getProgress(key, total) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved) && saved.length > 0) {
      return { count: saved.length, total };
    }
  } catch {}
  return null;
}

function CourseCard({ course }) {
  const progress = getProgress(course.progressKey, course.modules);

  return (
    <Link to={course.path} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          cursor: "pointer",
          transition: "border-color 0.15s",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          height: "100%",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-tertiary)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--mono)",
              letterSpacing: 1.5,
              color: course.tagColor,
              background: `${course.tagColor}18`,
              padding: "3px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
            }}
          >
            {course.tag}
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
          {course.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
          {course.description}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
          {course.modules} modules
        </div>
        {progress && (
          <div>
            <div
              style={{
                height: 3,
                background: "var(--border)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(progress.count / progress.total) * 100}%`,
                  background: course.tagColor,
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--mono)",
                marginTop: 4,
              }}
            >
              {progress.count}/{progress.total} explored
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function PlaceholderCard() {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 180,
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
        More courses coming soon
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 24px 80px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 48, maxWidth: 600 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent)",
            fontFamily: "var(--mono)",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          SOLEDU
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          Solana Education
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Deep dives into Solana — from protocol internals to DeFi mechanics.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {COURSES.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
        <PlaceholderCard />
      </div>
    </div>
  );
}
