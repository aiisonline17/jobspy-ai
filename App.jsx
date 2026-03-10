import { useState, useEffect } from "react";
import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: process.env.REACT_APP_GROQ_API_KEY, 
  dangerouslyAllowBrowser: true 
});

const RESULTS_PER_PAGE = 5; 

function App() {
  const [keyword, setKeyword] = useState("");
  const [locationInput, setLocationInput] = useState(""); 
  const [country, setCountry] = useState("gb");
  // NEW: State for job posting age
  const [postedWithin, setPostedWithin] = useState("anytime");

  const [jobs, setJobs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [linkedinLink, setLinkedinLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchJobs = async (pageNum = 1) => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a job search API. Return a JSON object with 'results' (5 objects) and 'total_jobs' (50). Each job MUST have: 'title', 'company', 'location', 'salary', 'description', 'emails' (array), 'phones' (array), and 'url'."
          },
          {
            role: "user",
            // UPDATED: Prompt now includes the timeframe/postedWithin logic
            content: `Generate page ${pageNum} of ${keyword} jobs in ${locationInput || 'major cities'} within ${country}. ONLY include jobs posted within the last ${postedWithin}.`
          }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });

      const data = JSON.parse(chatCompletion.choices[0].message.content);
      setJobs(data.results || []);
      setCount(50); 
      setPage(pageNum);

      // UPDATED: LinkedIn link now includes the date filter (f_TPR)
      const dateMap = {
        "today": "r86400",
        "1 day": "r86400",
        "1 week": "r604800",
        "1 month": "r2592000"
      };
      const linkedInTime = dateMap[postedWithin] || "";
      const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(locationInput || country)}&f_TPR=${linkedInTime}`;
      setLinkedinLink(linkedInUrl);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>JobSpy AI Aggregator</h1>
        
        <form onSubmit={(e) => { e.preventDefault(); fetchJobs(1); }} style={styles.form}>
          <div style={styles.searchRow}>
            <input
              style={styles.input}
              placeholder="Job title..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="City (e.g. London)"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
            />
          </div>

          <div style={styles.searchRow}>
            <select style={styles.input} value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="gb">United Kingdom</option>
              <option value="europe">Europe</option>
              <option value="in">India</option>
              <option value="ca">Canada</option>
            </select>

            {/* NEW: Posted Within Select Menu */}
            <select style={styles.input} value={postedWithin} onChange={(e) => setPostedWithin(e.target.value)}>
              <option value="anytime">Anytime</option>
              <option value="today">Today</option>
              <option value="1 day">Last 24 Hours</option>
              <option value="2 days">Last 2 Days</option>
              <option value="3 days">Last 3 Days</option>
              <option value="5 days">Last 5 Days</option>
              <option value="1 week">Last Week</option>
              <option value="1 month">Last Month</option>
            </select>
          </div>

          <button style={styles.button} disabled={loading || !keyword.trim()}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {hasSearched && (
          <div style={styles.linkedinBox}>
            <span>View {postedWithin} listings on: </span>
            <a href={linkedinLink} target="_blank" rel="noreferrer" style={styles.linkedinLink}>LinkedIn Jobs</a>
          </div>
        )}

        <ul style={styles.jobList}>
          {jobs.map((job, idx) => (
            <li key={idx} style={styles.jobCard}>
              <a href={job.url} target="_blank" rel="noopener noreferrer" style={styles.clickableTitle}>
                <h3 style={styles.jobTitle}>{job.title} 🔗</h3>
              </a>
              <div style={styles.jobMeta}><strong>{job.company}</strong> — {job.location}</div>
              <div style={styles.salary}>{job.salary}</div>
              <p style={styles.desc}>{job.description}</p>
              <div style={styles.contactSection}>
                <div style={{ color: "#93c5fd" }}><strong>Email:</strong> {job.emails?.join(", ") || "N/A"}</div>
                <div style={{ color: "#86efac", marginTop: "4px" }}><strong>Phone:</strong> {job.phones?.join(", ") || "N/A"}</div>
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination Logic */}
        {hasSearched && jobs.length > 0 && (
          <div style={styles.pagination}>
            <button style={styles.pageButton} disabled={page === 1 || loading} onClick={() => fetchJobs(page - 1)}>◀ Prev</button>
            <span style={{ margin: "0 15px" }}>Page {page} of {Math.ceil(count / RESULTS_PER_PAGE)}</span>
            <button style={styles.pageButton} disabled={page === Math.ceil(count / RESULTS_PER_PAGE) || loading} onClick={() => fetchJobs(page + 1)}>Next ▶</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0f172a", padding: "40px 20px", display: "flex", justifyContent: "center" },
  card: { width: "100%", maxWidth: "850px", background: "#020617", padding: "24px", borderRadius: "12px", color: "#fff", border: "1px solid #334155" },
  title: { fontSize: "28px", color: "#6366f1", marginBottom: "20px", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" },
  searchRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "150px", padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff" },
  button: { width: "100%", padding: "12px", background: "#4f46e5", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" },
  jobList: { listStyle: "none", padding: 0 },
  jobCard: { background: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #1e293b", marginBottom: "15px" },
  clickableTitle: { textDecoration: "none" },
  jobTitle: { margin: "0 0 8px 0", fontSize: "1.2rem", color: "#6366f1" },
  jobMeta: { color: "#94a3b8", marginBottom: "8px" },
  salary: { color: "#10b981", fontWeight: "bold" },
  desc: { color: "#cbd5e1", fontSize: "0.9rem", marginTop: "10px" },
  contactSection: { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #334155", fontSize: "0.85rem" },
  linkedinBox: { marginBottom: "20px", padding: "10px", background: "#1e293b", borderRadius: "8px", textAlign: "center" },
  linkedinLink: { color: "#60a5fa", fontWeight: "bold" },
  pagination: { marginTop: "30px", display: "flex", justifyContent: "center", alignItems: "center" },
  pageButton: { padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }
};

export default App;