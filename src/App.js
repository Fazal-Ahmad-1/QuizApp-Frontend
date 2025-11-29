import React, { useState } from "react";
import { api } from "./api";
import "./App.css";

function App() {
  const [view, setView] = useState("login"); // login | register | dashboard | quiz | attempts
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("USER");
  const [password, setPassword] = useState("");

  const [quizIdInput, setQuizIdInput] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizList, setQuizList] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [answers, setAnswers] = useState({}); // {questionId: selectedAnswer}
  const [result, setResult] = useState(null);

  const [attempts, setAttempts] = useState([]);
  const [message, setMessage] = useState("");

  // Admin: create question
const [newQuestion, setNewQuestion] = useState({
  questionTitle: "",
  category: "",
  difficultyLevel: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  rightAnswer: "",
});

// Admin: create quiz
const [quizCategory, setQuizCategory] = useState("");
const [quizNumQ, setQuizNumQ] = useState(5);
const [quizTitle, setQuizTitle] = useState("");

// Admin: delete quiz
const [deleteQuizId, setDeleteQuizId] = useState("");

  const handleAnswerChange = (questionId, value) => {
  setAnswers((prev) => ({
    ...prev,
    [questionId]: value,
  }));
};

  // ---------- AUTH HANDLERS ----------

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const body = {
        username,
        password,
        role, // you can force "USER" if you don't want to choose in UI
      };
      await api.post("/user/create", body);
      setMessage("Registered successfully! You can now log in.");
      setView("login");
    } catch (err) {
      console.error(err);
      setMessage(
        err.response?.data?.message || "Registration failed. Check console."
      );
    }
  };

  const handleLogin = async (e) => {
  e.preventDefault();
  setMessage("");

  try {
    const res = await api.post("/user/login", {
      username,
      password,
    });

    const data = res.data;
    // data should be { username, role }
    if (data?.username) {
      setUsername(data.username);
    }
    if (data?.role) {
      setRole(data.role);         // 🔹 store role (USER / ADMIN)
    }

    setMessage("Login successful");
    setView("dashboard");
    loadQuizzes();                // still load quizzes after login
  } catch (err) {
    console.error(err);
    const data = err.response?.data;
    let errorMsg = "Login failed. Check username/password.";
    if (typeof data === "string") errorMsg = data;
    else if (data?.message) errorMsg = data.message;
    setMessage(errorMsg);
  }
};



  const handleLogout = () => {
    setUsername("");
    setPassword("");
    setRole("USER");
    setQuizQuestions([]);
    setAnswers({});
    setResult(null);
    setAttempts([]);
    setMessage("");
    setView("login");
  };

  // ---------- QUIZ HANDLERS ----------
  const handleCreateQuestion = async (e) => {
  e.preventDefault();
  setMessage("");

  if (!username) {
    setMessage("You must be logged in as ADMIN.");
    return;
  }

  try {
    await api.post(
      `/question/add?username=${encodeURIComponent(username)}`,
      newQuestion
    );
    setMessage("Question created successfully.");
    // reset form
    setNewQuestion({
      questionTitle: "",
      category: "",
      difficultyLevel: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      rightAnswer: "",
    });
  } catch (err) {
    console.error(err);
    setMessage("Failed to create question.");
  }
};

const handleCreateQuiz = async (e) => {
  e.preventDefault();
  setMessage("");

  if (!username) {
    setMessage("You must be logged in as ADMIN.");
    return;
  }

  try {
    await api.post(
      `/quiz/create?username=${encodeURIComponent(username)}&category=${encodeURIComponent(
        quizCategory
      )}&numQ=${quizNumQ}&title=${encodeURIComponent(quizTitle)}`
    );
    setMessage("Quiz created successfully.");
    setQuizCategory("");
    setQuizNumQ(5);
    setQuizTitle("");
    // reload quiz list
    loadQuizzes();
  } catch (err) {
    console.error(err);
    setMessage("Failed to create quiz.");
  }
};

const handleDeleteQuiz = async (e) => {
  e.preventDefault();
  setMessage("");

  if (!username) {
    setMessage("You must be logged in as ADMIN.");
    return;
  }
  if (!deleteQuizId) {
    setMessage("Enter a quiz ID to delete.");
    return;
  }

  try {
    await api.delete(
      `/quiz/delete/${deleteQuizId}?username=${encodeURIComponent(username)}`
    );
    setMessage(`Quiz ${deleteQuizId} deleted successfully.`);
    setDeleteQuizId("");
    loadQuizzes();
  } catch (err) {
    console.error(err);
    setMessage("Failed to delete quiz.");
  }
};

  const loadQuizzes = async () => {
    setMessage("");
    try {
    const res = await api.get("/quiz/all");
    setQuizList(res.data);
    } catch (err) {
    console.error(err);
    setMessage("Failed to load quizzes.");
    }
    };

  const fetchQuiz = async () => {
  if (!selectedQuizId) {
    setMessage("Please select a quiz.");
    return;
  }
  setMessage("");
  setResult(null);
  setAnswers({});

  try {
    const res = await api.get(`/quiz/getQuiz/${selectedQuizId}`);
    setQuizQuestions(res.data);
    if (res.data.length === 0) {
      setMessage("No questions found for this quiz.");
    } else {
      setView("quiz");
    }
  } catch (err) {
    console.error(err);
    setMessage("Failed to fetch quiz.");
  }
};

  const submitQuiz = async () => {
  if (!username) {
    setMessage("You must be logged in to submit a quiz.");
    return;
  }
  if (!selectedQuizId) {
    setMessage("No quiz selected.");
    return;
  }
  if (quizQuestions.length === 0) {
    setMessage("No quiz loaded.");
    return;
  }

  // Build UserResponse list: [{id, answer}, ...]
  const payload = quizQuestions.map((q) => {
    const qId = q.id || q.Id;
    return {
      id: qId,
      answer: answers[qId] || "",
    };
  });

  try {
    const res = await api.post(
      `/quiz/submit/${selectedQuizId}?username=${encodeURIComponent(username)}`,
      payload
    );
    // backend returns { score, totalQuestions }
    setResult(res.data);
    setMessage("");
  } catch (err) {
    console.error(err);
    setMessage("Failed to submit quiz.");
  }
};


  // ---------- ATTEMPTS HANDLERS ----------

  const loadAttempts = async () => {
    if (!username) {
      setMessage("You must be logged in.");
      return;
    }
    setMessage("");
    setResult(null);

    try {
      const res = await api.get(`/user/${encodeURIComponent(username)}/attempts`);
      setAttempts(res.data);
      setView("attempts");
    } catch (err) {
      console.error(err);
      setMessage("Failed to load attempts.");
    }
  };

  // ---------- RENDER HELPERS ----------

  const renderAuthForm = () => {
    if (view === "login") {
      return (
        <div className="card">
          <h2>Login</h2>
          <form onSubmit={handleLogin} className="form">
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit">Login</button>
          </form>
          <p className="switch-text">
            No account?{" "}
            <button type="button" className="link-btn" onClick={() => setView("register")}>
              Register
            </button>
          </p>
        </div>
      );
    }

    if (view === "register") {
      return (
        <div className="card">
          <h2>Register</h2>
          <form onSubmit={handleRegister} className="form">
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <button type="submit">Register</button>
          </form>
          <p className="switch-text">
            Already have an account?{" "}
            <button type="button" className="link-btn" onClick={() => setView("login")}>
              Login
            </button>
          </p>
        </div>
      );
    }

    return null;
  };

  const renderDashboard = () => {
    if (view !== "dashboard") return null;

    return (
      <div className="card">
        <h2>Welcome, {username}</h2>
        <div className="form">
          <label>
  Select Quiz
  <select
    value={selectedQuizId}
    onChange={(e) => setSelectedQuizId(e.target.value)}
  >
    <option value="">-- Choose a quiz --</option>
    {quizList.map((q) => {
      const qId = q.id || q.Id;
      return (
        <option key={qId} value={qId}>
          {q.title}
        </option>
      );
    })}
  </select>
</label>
{role === "ADMIN" && (
  <div className="admin-panel">
    <h3>Admin Panel</h3>

    {/* Create Question */}
    <div className="admin-section">
      <h4>Create Question</h4>
      <form className="form" onSubmit={handleCreateQuestion}>
        <label>
          Question Title
          <input
            type="text"
            value={newQuestion.questionTitle}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, questionTitle: e.target.value })
            }
            required
          />
        </label>
        <label>
          Category
          <input
            type="text"
            value={newQuestion.category}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, category: e.target.value })
            }
            required
          />
        </label>
        <label>
          Difficulty
          <input
            type="text"
            value={newQuestion.difficultyLevel}
            onChange={(e) =>
              setNewQuestion({
                ...newQuestion,
                difficultyLevel: e.target.value,
              })
            }
            required
          />
        </label>
        <label>
          Option 1
          <input
            type="text"
            value={newQuestion.option1}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, option1: e.target.value })
            }
            required
          />
        </label>
        <label>
          Option 2
          <input
            type="text"
            value={newQuestion.option2}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, option2: e.target.value })
            }
            required
          />
        </label>
        <label>
          Option 3
          <input
            type="text"
            value={newQuestion.option3}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, option3: e.target.value })
            }
            required
          />
        </label>
        <label>
          Option 4
          <input
            type="text"
            value={newQuestion.option4}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, option4: e.target.value })
            }
            required
          />
        </label>
        <label>
          Right Answer
          <input
            type="text"
            value={newQuestion.rightAnswer}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, rightAnswer: e.target.value })
            }
            required
          />
        </label>
        <button type="submit">Create Question</button>
      </form>
    </div>

    {/* Create Quiz */}
    <div className="admin-section">
      <h4>Create Quiz</h4>
      <form className="form" onSubmit={handleCreateQuiz}>
        <label>
          Category
          <input
            type="text"
            value={quizCategory}
            onChange={(e) => setQuizCategory(e.target.value)}
            required
          />
        </label>
        <label>
          Number of Questions
          <input
            type="number"
            value={quizNumQ}
            onChange={(e) => setQuizNumQ(e.target.value)}
            required
          />
        </label>
        <label>
          Quiz Title
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            required
          />
        </label>
        <button type="submit">Create Quiz</button>
      </form>
    </div>

    {/* Delete Quiz */}
    <div className="admin-section">
      <h4>Delete Quiz</h4>
      <form className="form" onSubmit={handleDeleteQuiz}>
        <label>
          Quiz ID
          <input
            type="number"
            value={deleteQuizId}
            onChange={(e) => setDeleteQuizId(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary">
          Delete Quiz
        </button>
      </form>
    </div>
  </div>
)}


<div className="actions-row">
  <button type="button" onClick={fetchQuiz}>
    Start Selected Quiz
  </button>
  <button type="button" onClick={loadAttempts}>
    My Attempts
  </button>
  <button type="button" className="secondary" onClick={handleLogout}>
    Logout
  </button>
</div>

        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (view !== "quiz") return null;

    return (
      <div className="card">
        <h2>Quiz #{quizIdInput}</h2>
        {quizQuestions.length === 0 && <p>No questions loaded.</p>}

        <div className="questions-list">
          {quizQuestions.map((q, index) => {
            const qId = q.id || q.Id;
            return (
              <div key={qId} className="question-card">
                <h3>
                  Q{index + 1}. {q.questionTitle}
                </h3>
                <div className="options">
                  {[q.option1, q.option2, q.option3, q.option4].map(
                    (opt, i) => (
                      <label key={i} className="option-label">
                        <input
                          type="radio"
                          name={`q-${qId}`}
                          value={opt}
                          checked={answers[qId] === opt}
                          onChange={() => handleAnswerChange(qId, opt)}
                        />
                        {opt}
                      </label>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={submitQuiz}>
          Submit Quiz
        </button>

        {result && (
          <div className="result-box">
            <p>
              Score: {result.score} / {result.totalQuestions}
            </p>
          </div>
        )}

        <button
          type="button"
          className="secondary"
          onClick={() => {
            setView("dashboard");
            setResult(null);
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  };

  const renderAttempts = () => {
    if (view !== "attempts") return null;

    return (
      <div className="card">
        <h2>{username}'s Attempts</h2>
        {attempts.length === 0 ? (
          <p>No attempts found.</p>
        ) : (
          <table className="attempts-table">
            <thead>
              <tr>
                <th>Attempt ID</th>
                <th>Quiz ID</th>
                <th>Title</th>
                <th>Score</th>
                <th>Total</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.attemptId}>
                  <td>{a.attemptId}</td>
                  <td>{a.quizId}</td>
                  <td>{a.quizTitle}</td>
                  <td>{a.score}</td>
                  <td>{a.totalQuestions}</td>
                  <td>{a.attemptedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          type="button"
          className="secondary"
          onClick={() => setView("dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    );
  };

  return (
    <div className="app-root">
      <h1 className="app-title">Codizzz App</h1>

      {message && <div className="message">{message}</div>}

      {view === "login" || view === "register"
        ? renderAuthForm()
        : null}

      {renderDashboard()}
      {renderQuiz()}
      {renderAttempts()}
    </div>
  );
}

export default App;