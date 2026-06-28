import { useState } from "react";

function Dashboard({ uploadedImage, onImageUpload, gpsData, onGPSSubmit }) {
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "bot",
      text: "Hi – I'm CaneSense. Upload a billet image and add field coordinates to start a growth-quality analysis.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [conversationTitle, setConversationTitle] = useState(null);
  const [viewMode, setViewMode] = useState("chat");
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [libraryItems, setLibraryItems] = useState([
    {
      id: "lib-1",
      title: "Billet Quality Report.pdf",
      type: "PDF",
      description: "Saved analysis report for a field billet sample.",
      date: "Jun 25, 2026",
    },
    {
      id: "lib-2",
      title: "Growth Model Code.js",
      type: "Code",
      description: "Reusable growth prediction script.",
      date: "Jun 24, 2026",
    },
    {
      id: "lib-3",
      title: "Field Image 12.png",
      type: "Image",
      description: "Reference billet image for quality comparisons.",
      date: "Jun 20, 2026",
    },
  ]);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);

  const generateChatTitle = (text) => {
    const cleaned = text
      .replace(/^(explain|show|tell|give|how to|what is|why is|help me with)\s+/i, "")
      .replace(/\?$/g, "")
      .trim();
    const words = cleaned.split(" ");
    if (words.length > 4) {
      return words.slice(0, 4).join(" ");
    }
    return cleaned || "New Chat";
  };

  const pushConversationToTop = (conversationId) => {
    setConversations((prev) => {
      const conversation = prev.find((item) => item.id === conversationId);
      if (!conversation) return prev;
      const others = prev.filter((item) => item.id !== conversationId);
      return [conversation, ...others];
    });
  };

  const togglePinConversation = (conversationId) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, pinned: !conversation.pinned }
          : conversation
      )
    );
  };

  const matchesSearch = (conversation) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    if (conversation.title.toLowerCase().includes(query)) return true;
    return conversation.messages.some((message) =>
      message.text.toLowerCase().includes(query)
    );
  };

  const openConversation = (conversationId) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    setActiveConversationId(conversation.id);
    setConversationTitle(conversation.title);
    setChatHistory(conversation.messages);
    setViewMode("chat");
    setSearchQuery("");
    setConversations((prev) => {
      const others = prev.filter((item) => item.id !== conversation.id);
      return [conversation, ...others];
    });
  };

  const activeConversation = conversations.find((item) => item.id === activeConversationId);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userQuery = inputMessage.trim();
    const isNewConversation = activeConversationId === null && chatHistory.length === 0;
    const conversationId = isNewConversation ? Date.now().toString() : activeConversationId;
    const timestamp = new Date().toISOString();
    const userMessage = {
      sender: "user",
      text: userQuery,
      showAnalysisTicks: false,
      timestamp,
    };

    let nextMessages;
    let title = conversationTitle;

    if (isNewConversation) {
      title = generateChatTitle(userQuery);
      nextMessages = [userMessage];
      setConversations((prev) => [
        {
          id: conversationId,
          title,
          pinned: false,
          updatedAt: timestamp,
          messages: nextMessages,
        },
        ...prev,
      ]);
      setActiveConversationId(conversationId);
      setConversationTitle(title);
    } else {
      nextMessages = [...chatHistory, userMessage];
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: nextMessages, updatedAt: timestamp }
            : conversation
        )
      );
      pushConversationToTop(conversationId);
    }

    setChatHistory(nextMessages);
    setInputMessage("");

    if (isNewConversation) {
      pushConversationToTop(conversationId);
    }

    setTimeout(() => {
      const botMessage = {
        sender: "bot",
        text: "Processing your request with CaneSense core models...",
        showAnalysisTicks: true,
        timestamp: new Date().toISOString(),
      };

      setChatHistory((prev) => {
        const updated = [...prev, botMessage];
        setConversations((prevConversations) =>
          prevConversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, messages: updated, updatedAt: botMessage.timestamp }
              : conversation
          )
        );
        return updated;
      });
    }, 1000);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0d0d0d] text-[#ececec] font-sans antialiased overflow-hidden">
      {/* SIDEBAR CONTAINER */}
      <aside className="w-[260px] bg-[#171717] flex flex-col justify-between p-3 border-r border-[#2f2f2f] shrink-0">
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[85vh]">
          {/* New Chat Button Row */}
          <button 
            onClick={() => {
              setViewMode("chat");
              setChatHistory([]);
              setInputMessage("");
              setConversationTitle(null);
              setActiveConversationId(null);
            }}
            className="flex items-center justify-between w-full p-2.5 rounded-lg text-sm font-medium transition hover:bg-[#212121] text-left"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#b4b4b4]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              New chat
            </span>
          </button>

          {/* Search and Navigation */}
          <div className="flex flex-col gap-3 mt-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-lg border border-[#2f2f2f] bg-[#121212] px-3 py-2 text-sm text-white outline-none placeholder:text-[#6e6e6e]"
              />
            </div>
            <nav className="flex flex-col gap-0.5 text-sm font-medium text-[#b4b4b4]">
              <button onClick={() => setViewMode("chat")} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#212121] hover:text-white text-left">
                <span>🔍 Search chats</span>
              </button>
              <button onClick={() => setViewMode("library")} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#212121] hover:text-white text-left">
                <span>📚 Library</span>
              </button>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#212121] hover:text-white text-left">
                <span>📁 Projects</span>
              </button>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#212121] hover:text-white text-left">
                <span>⚙️ Codex</span>
              </button>
            </nav>
          </div>

          {/* Conversation Search Results */}
          <div className="mt-6">
            <p className="text-[11px] font-bold tracking-wider uppercase text-[#676767] px-3 mb-2">Pinned Chats</p>
            <div className="flex flex-col gap-0.5 text-xs text-[#b4b4b4]">
              {conversations
                .filter((conversation) => conversation.pinned && matchesSearch(conversation))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => openConversation(conversation.id)}
                    className="px-3 py-2 rounded-md truncate cursor-pointer hover:bg-[#212121] flex items-center gap-2"
                  >
                    <span>📌</span>
                    <span className="truncate">{conversation.title}</span>
                  </div>
                ))}
              {conversations.filter((conversation) => conversation.pinned).length === 0 && (
                <div className="px-3 py-2 rounded-md text-[#7a7a7a]">No pinned chats yet.</div>
              )}
            </div>
          </div>
          <div className="mt-6">
            <p className="text-[11px] font-bold tracking-wider uppercase text-[#676767] px-3 mb-2">Recent Chats</p>
            <div className="flex flex-col gap-0.5 text-xs text-[#b4b4b4]">
              {conversations
                .filter((conversation) => !conversation.pinned && matchesSearch(conversation))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => openConversation(conversation.id)}
                    className="px-3 py-2 rounded-md truncate cursor-pointer hover:bg-[#212121] flex items-center gap-2"
                  >
                    <span>💬</span>
                    <span className="truncate">{conversation.title}</span>
                  </div>
                ))}
              {conversations.filter((conversation) => !conversation.pinned).length === 0 && (
                <div className="px-3 py-2 rounded-md text-[#7a7a7a]">No recent chats yet.</div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col justify-between relative bg-[#212121]">
        {/* Top Header */}
        <header className="h-14 w-full flex items-center justify-between px-4 absolute top-0 left-0 bg-[#212121]/80 backdrop-blur-md z-10">
            <div className="flex flex-col gap-0.5 cursor-pointer rounded-lg px-2 py-1 hover:bg-[#2f2f2f]">
              <span className="font-semibold text-lg text-white">CaneSense</span>
              {conversationTitle && (
                <span className="text-xs text-[#676767] truncate max-w-[220px]">{conversationTitle}</span>
              )}
            </div>
            {activeConversation && (
              <button
                onClick={() => togglePinConversation(activeConversation.id)}
                className="rounded-full border border-[#4b84ff] px-3 py-1 text-xs text-[#8fb5ff] hover:bg-[#2a3b6e]/10 transition"
              >
                {activeConversation.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            <span className="text-xs text-[#676767]">v1.0</span>
          </header>
        {viewMode === "library" ? (
          <div className="flex-1 overflow-y-auto pt-16 pb-32 px-4 flex flex-col items-center">
            <div className="w-full max-w-[920px] flex flex-col mt-12 gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-medium text-white tracking-tight">Library</h1>
                <p className="text-sm text-[#b4b4b4] max-w-2xl">
                  Store and reuse resources like images, documents, code files, and generated outputs.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {libraryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedLibraryItem(item)}
                    className="w-full rounded-3xl border border-[#2f2f2f] bg-[#171717] p-4 text-left transition hover:border-[#4b84ff]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <span className="rounded-full border border-[#4b84ff]/30 px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-[#8fb5ff]">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#c0c0c0]">{item.description}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-[#6e6e6e]">
                      <span>{item.date}</span>
                      <span>Preview</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedLibraryItem ? (
                <div className="rounded-3xl border border-[#2f2f2f] bg-[#171717] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#6e6e6e]">Selected Resource</p>
                      <h2 className="text-2xl font-semibold text-white">{selectedLibraryItem.title}</h2>
                    </div>
                    <span className="rounded-full border border-[#4b84ff]/30 px-3 py-1 text-xs text-[#8fb5ff]">{selectedLibraryItem.type}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#c0c0c0]">{selectedLibraryItem.description}</p>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#b4b4b4]">
                    <span className="rounded-full bg-[#1f1f1f] px-3 py-1">Saved {selectedLibraryItem.date}</span>
                    <button className="rounded-full border border-[#4b84ff] px-4 py-2 text-sm text-[#8fb5ff] hover:bg-[#2a3b6e]/10 transition">
                      Open
                    </button>
                    <button className="rounded-full border border-[#4b84ff] px-4 py-2 text-sm text-[#8fb5ff] hover:bg-[#2a3b6e]/10 transition">
                      Use in chat
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-[#2f2f2f] bg-[#171717] p-5 text-[#b4b4b4]">
                  Select a library item to preview details and reuse content.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pt-16 pb-32 px-4 flex flex-col items-center">
            <div className="w-full max-w-[720px] flex flex-col mt-12">
              {chatHistory.length <= 1 && (
                <h1 className="text-3xl font-medium text-center text-white my-6 tracking-tight">
                  What's on your mind today?
                </h1>
              )}

              {/* Render items with horizontal line borders separating each quest node */}
              {chatHistory.map((msg, index) => (
                <div key={index} className="w-full border-b border-[#2f2f2f]/60 py-5 first:pt-2">
                  <div className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                      msg.sender === "user" ? "bg-[#2f2f2f] text-white" : "text-[#ececec]"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent flex flex-col items-center">
          <div className="w-full max-w-[720px] flex flex-col gap-2.5">
            <div className="bg-[#2f2f2f] rounded-[26px] p-1.5 flex items-center shadow-lg border border-[#3e3e3e]">
              <label className="p-2 text-[#b4b4b4] hover:text-white rounded-full hover:bg-[#3e3e3e] cursor-pointer transition">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageUpload(e.target.files)} />
              </label>

              <input
                type="text"
                placeholder="Ask anything or upload a billet image..."
                className="flex-1 bg-transparent border-none outline-none text-white px-3 text-[15px] placeholder-[#8e8e8e]"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />

              <button
                onClick={handleSendMessage}
                className="p-2 bg-white text-black rounded-full hover:bg-[#e3e3e3] transition flex items-center justify-center"
              >
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
