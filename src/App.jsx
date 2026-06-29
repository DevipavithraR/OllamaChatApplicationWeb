import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Send, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Clock, 
  User, 
  Sparkles, 
  Search, 
  BookOpen 
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

function App() {
  // Chat state
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [sessionList, setSessionList] = useState([]);

  // Database lists
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [dataError, setDataError] = useState(null);

  // Filter/Search states
  const [activeTab, setActiveTab] = useState('books'); // books, issued, members
  const [selectedBookCategory, setSelectedBookCategory] = useState('all');
  const [bookSearchText, setBookSearchText] = useState('');

  const messagesEndRef = useRef(null);

  // Initialize first session
  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('library_chat_sessions') || '[]');
    if (savedSessions.length > 0) {
      setSessionList(savedSessions);
      selectSession(savedSessions[0]);
    } else {
      createNewSession();
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingChat]);

  // Real-time polling for library data
  useEffect(() => {
    fetchDatabaseData();
    const interval = setInterval(() => {
      fetchDatabaseData();
    }, 4000); // Poll database lists every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch all lists from backend
  const fetchDatabaseData = async () => {
    try {
      const [resIssues, resBooks, resMembers] = await Promise.all([
        fetch(`${API_BASE}/issued_books/`),
        fetch(`${API_BASE}/books/`),
        fetch(`${API_BASE}/members/`)
      ]);

      if (resIssues.ok) {
        const data = await resIssues.json();
        setIssuedBooks(data.sort((a, b) => b.issue_id - a.issue_id));
      }
      if (resBooks.ok) {
        setBooks(await resBooks.json());
      }
      if (resMembers.ok) {
        const data = await resMembers.json();
        setMembers(data.sort((a, b) => b.member_id - a.member_id));
      }
      setDataError(null);
    } catch (err) {
      console.error('Error polling backend APIs:', err);
      setDataError('Backend connection offline. Make sure the FastAPI app is running on port 8000.');
    }
  };

  // Create a brand new chat session
  const createNewSession = () => {
    const newId = `session_${Math.floor(100000 + Math.random() * 900000)}`;
    setSessionId(newId);
    setMessages([
      {
        sender: 'assistant',
        content: "Hello! I am your Digital Library Assistant. 📚\nHow can I help you today? I can search for books, check availability, register you as a member, issue/return books, or look up borrowing history and due dates!",
        created_at: new Date().toISOString()
      }
    ]);
    
    // Save to list
    const updatedSessions = [newId, ...sessionList.filter(s => s !== newId)];
    setSessionList(updatedSessions);
    localStorage.setItem('library_chat_sessions', JSON.stringify(updatedSessions));
  };

  // Switch to an existing session and fetch its history
  const selectSession = async (sid) => {
    setSessionId(sid);
    setIsLoadingChat(true);
    try {
      const res = await fetch(`${API_BASE}/chatbot/history/${sid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setDefaultGreeting();
        }
      } else {
        setDefaultGreeting();
      }
    } catch (err) {
      console.warn('Could not retrieve history, resetting to default greeting:', err);
      setDefaultGreeting();
    } finally {
      setIsLoadingChat(false);
    }
  };

  const setDefaultGreeting = () => {
    setMessages([
      {
        sender: 'assistant',
        content: "Hello! Welcome back. 📚\nHow can I assist you with searching books, checking due dates, or borrowing records today?",
        created_at: new Date().toISOString()
      }
    ]);
  };

  // Send message to chatbot
  const handleSendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    const textToSend = customText || userInput;
    if (!textToSend.trim() || isLoadingChat) return;

    if (!customText) setUserInput('');

    // Append user message
    const userMsg = {
      sender: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      const res = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: textToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Append bot reply
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: data.response,
          created_at: new Date().toISOString()
        }]);

        // Trigger immediate pull of data to reflect updates
        fetchDatabaseData();
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        content: 'I encountered a network error. Please verify the backend service is running and Ollama is online.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Return issued book manually
  const handleReturnBook = async (issueId) => {
    if (!confirm('Are you sure you want to return this book?')) return;
    try {
      const res = await fetch(`${API_BASE}/issued_books/${issueId}`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchDatabaseData();
      } else {
        alert('Failed to return book.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  };

  // Suggestion Chips
  const suggestionChips = [
    "Search books on programming",
    "Identify as Rahul Kumar (+919876543210)",
    "Issue Clean Code for Rahul Kumar",
    "Show borrowing history"
  ];

  // Helper to format time
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateDisplay = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Filter books
  const filteredBooks = books.filter(book => {
    const matchesCategory = selectedBookCategory === 'all' || book.category.toLowerCase() === selectedBookCategory.toLowerCase();
    const matchesSearch = book.title.toLowerCase().includes(bookSearchText.toLowerCase()) || 
                          book.author.toLowerCase().includes(bookSearchText.toLowerCase()) ||
                          book.isbn.toLowerCase().includes(bookSearchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* 1. Left Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <span className="brand-name">Digital Library AI</span>
        </div>

        <div className="sidebar-content">
          <button className="btn-new-chat" onClick={createNewSession}>
            <Plus size={16} /> New Chat
          </button>

          <div>
            <div className="section-title">Active Sessions</div>
            <div className="session-list">
              {sessionList.map(sid => (
                <div 
                  key={sid} 
                  className={`session-item ${sid === sessionId ? 'active' : ''}`}
                  onClick={() => selectSession(sid)}
                >
                  <MessageSquare size={14} />
                  <span>{sid.substring(0, 15)}...</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div className="sidebar-nav">
              <div 
                className={`nav-item ${activeTab === 'books' ? 'active' : ''}`}
                onClick={() => setActiveTab('books')}
              >
                <BookOpen size={18} />
                <span>Book Explorer</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'issued' ? 'active' : ''}`}
                onClick={() => setActiveTab('issued')}
              >
                <Clock size={18} />
                <span>Issued Books</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                <Users size={18} />
                <span>Members Directory</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div>Status: Connected to Local Host</div>
          <div style={{ color: dataError ? 'var(--status-danger)' : 'var(--status-success)' }}>
            ● {dataError ? 'Offline' : 'API Online'}
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <main className="main-workspace">
        {/* Center: Chat Window */}
        <section className="chat-container">
          <header className="chat-header">
            <div className="chat-header-info">
              <h2>Library Digital Assistant</h2>
              <p>Assistant active • Session ID: {sessionId}</p>
            </div>
            {dataError && (
              <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Backend Offline
              </div>
            )}
          </header>

          <div className="messages-area">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message-wrapper ${msg.sender === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="avatar">
                  {msg.sender === 'user' ? 'U' : 'B'}
                </div>
                <div>
                  <div className="message-bubble">
                    {msg.content}
                  </div>
                  <div className="message-time">
                    {msg.created_at ? formatTime(msg.created_at) : formatTime(new Date())}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoadingChat && (
              <div className="message-wrapper assistant">
                <div className="avatar">B</div>
                <div className="message-bubble" style={{ padding: '12px' }}>
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          <div className="suggestions-container">
            {suggestionChips.map((chip, index) => (
              <button 
                key={index} 
                className="chip"
                onClick={() => handleSendMessage(null, chip)}
                disabled={isLoadingChat}
              >
                {chip}
              </button>
            ))}
          </div>

          <footer className="chat-input-area">
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Ask about books, issue or return a book, register, check due dates..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isLoadingChat}
              />
              <button type="submit" className="btn-send" disabled={isLoadingChat}>
                <Send size={18} />
              </button>
            </form>
          </footer>
        </section>

        {/* Right Pane: Database Inspector */}
        <section className="inspector-panel">
          <header className="inspector-header">
            <div className="inspector-title">
              {activeTab === 'books' && (
                <>
                  <BookOpen className="inspector-icon" size={18} />
                  <span>Book Catalog</span>
                </>
              )}
              {activeTab === 'issued' && (
                <>
                  <Clock className="inspector-icon" size={18} />
                  <span>Issued Books Log</span>
                </>
              )}
              {activeTab === 'members' && (
                <>
                  <Users className="inspector-icon" size={18} />
                  <span>Members List</span>
                </>
              )}
            </div>
            <button className="btn-refresh" onClick={fetchDatabaseData} title="Refresh lists">
              <RefreshCw size={16} />
            </button>
          </header>

          <div className="inspector-content">
            {dataError && (
              <div className="form-container" style={{ borderColor: 'var(--status-danger)', background: 'var(--status-danger-bg)' }}>
                <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem', fontWeight: 500 }}>
                  Connection Issue
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  {dataError}
                </div>
              </div>
            )}

            {/* TAB CONTENT: BOOKS */}
            {activeTab === 'books' && (
              <div>
                {/* Search Bar */}
                <div className="search-container">
                  <input 
                    type="text" 
                    className="form-input search-input" 
                    placeholder="Search title, author, isbn..." 
                    value={bookSearchText}
                    onChange={(e) => setBookSearchText(e.target.value)}
                  />
                </div>

                {/* Category Filters */}
                <div className="category-tabs">
                  {['all', 'Programming', 'Computer Science', 'AI/ML'].map(cat => (
                    <span 
                      key={cat} 
                      className={`cat-tab ${selectedBookCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedBookCategory(cat)}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {filteredBooks.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen className="empty-icon" />
                    <p className="empty-text">No books match your selection.</p>
                  </div>
                ) : (
                  filteredBooks.map(book => (
                    <div key={book.book_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">{book.title}</span>
                        <span className={`badge ${book.available_copies > 0 ? 'available' : 'cancelled'}`}>
                          {book.available_copies} / {book.total_copies} Left
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 500, marginBottom: '4px' }}>
                        by {book.author}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {book.description}
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item">
                          <span className="data-label">ISBN</span>
                          <span className="data-value">{book.isbn}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Publisher</span>
                          <span className="data-value">{book.publisher} ({book.publication_year})</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Category</span>
                          <span className="data-value">{book.category}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: ISSUED BOOKS */}
            {activeTab === 'issued' && (
              <div>
                {issuedBooks.length === 0 ? (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p className="empty-text">No issued books logs found.</p>
                  </div>
                ) : (
                  issuedBooks.map(res => (
                    <div key={res.issue_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title">Issue ID #{res.issue_id}</span>
                        <span className={`badge ${res.status.toLowerCase() === 'returned' ? 'available' : 'cancelled'}`}>
                          {res.status}
                        </span>
                      </div>
                      <div className="data-card-grid">
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Book</span>
                          <span className="data-value" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{res.book_title}</span>
                        </div>
                        <div className="data-item" style={{ gridColumn: 'span 2' }}>
                          <span className="data-label">Borrower</span>
                          <span className="data-value">{res.member_name} (ID: {res.member_id})</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Issued</span>
                          <span className="data-value">{formatDateDisplay(res.issue_date)}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Due Date</span>
                          <span className="data-value" style={{ color: 'var(--status-warning)' }}>{formatDateDisplay(res.due_date)}</span>
                        </div>
                        {res.return_date && (
                          <div className="data-item" style={{ gridColumn: 'span 2' }}>
                            <span className="data-label">Returned Date</span>
                            <span className="data-value">{formatDateDisplay(res.return_date)}</span>
                          </div>
                        )}
                      </div>
                      {res.status.toLowerCase() === 'issued' && (
                        <div className="data-card-actions">
                          <button 
                            className="btn-action-small safe"
                            onClick={() => handleReturnBook(res.issue_id)}
                          >
                            Return Book
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: MEMBERS */}
            {activeTab === 'members' && (
              <div>
                {members.length === 0 ? (
                  <div className="empty-state">
                    <Users className="empty-icon" />
                    <p className="empty-text">No registered members yet.</p>
                  </div>
                ) : (
                  members.map(m => (
                    <div key={m.member_id} className="data-card">
                      <div className="data-card-header">
                        <span className="data-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--accent-primary)' }} />
                          {m.name}
                        </span>
                        <span className="badge available">
                          {m.membership_type}
                        </span>
                      </div>
                      <div className="data-card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-item">
                          <span className="data-label">Member ID</span>
                          <span className="data-value">{m.member_id}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">Phone</span>
                          <span className="data-value">{m.phone_number}</span>
                        </div>
                        {m.email && (
                          <div className="data-item">
                            <span className="data-label">Email</span>
                            <span className="data-value">{m.email}</span>
                          </div>
                        )}
                        <div className="data-item">
                          <span className="data-label">Registered Date</span>
                          <span className="data-value">{formatDateDisplay(m.registration_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
