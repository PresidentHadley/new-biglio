# 🚀 Biglio V2 AI System - Step-by-Step Implementation Plan

**Date:** January 2, 2025  
**Based on:** Complete specification from old system analysis  
**Goal:** Rebuild 100% of original AI functionality in new system  

**This plan rebuilds the sophisticated AI writing assistant in exact order of priority and dependencies.**

---

## 📋 **OVERVIEW**

We need to implement **7 major AI feature categories** with **20+ specific tools** across 3 weeks:

- **Week 1**: Core infrastructure & progressive writing (immediate value)
- **Week 2**: Advanced features & outline system (power user tools)  
- **Week 3**: Polish, UI, & publishing tools (professional features)

**Each step includes exact code specifications and testing criteria.**

---

## 📅 **WEEK 1: CORE INFRASTRUCTURE**
*Goal: Get progressive writing tools working immediately*

### **🎯 STEP 1: Enhanced AI Context (Day 1)**

#### **1.1 Create AIPromptType Enum**
```typescript
// src/types/ai.ts
export enum AIPromptType {
  CHAPTER_IDEA = 'chapter_idea',
  PLOT_DEVELOPMENT = 'plot_development',
  CHARACTER_DEVELOPMENT = 'character_development',
  STYLE_IMPROVEMENT = 'style_improvement',
  GENERAL = 'general'
}

export enum AIContextMode {
  CHAPTER = 'chapter',
  FULL_BOOK = 'full_book'
}
```

#### **1.2 Update AIContext Interface**
```typescript
// src/context/AIContext.tsx - ADD these functions
interface AIContextType {
  // Existing
  sendMessage: (message: string, context?: BookContext) => Promise<string>;
  generateOutline: (title: string, description: string, options?: OutlineOptions) => Promise<OutlineResult[]>;
  isLoading: boolean;
  error: string | null;
  
  // NEW FUNCTIONS TO ADD
  generatePrompt: (type: AIPromptType, bookId: string, chapterId?: string) => string;
  sendContextualMessage: (message: string, bookId: string, chapterId?: string, fullContext?: string) => Promise<string>;
  clearMessages: (bookId: string, chapterId?: string) => void;
  contextMode: AIContextMode;
  setContextMode: (mode: AIContextMode) => void;
}
```

#### **1.3 Implement generatePrompt Function**
```typescript
// src/context/AIContext.tsx - ADD this function
const generatePrompt = (type: AIPromptType, bookId: string, chapterId?: string): string => {
  switch (type) {
    case AIPromptType.CHAPTER_IDEA:
      return `Generate three creative ideas for a new chapter in my book. Focus on advancing the plot in an interesting way.`;
    case AIPromptType.PLOT_DEVELOPMENT:
      return `Help me develop the plot further from the current point. What interesting complications or twists could I introduce?`;
    case AIPromptType.CHARACTER_DEVELOPMENT:
      return `Suggest ways to develop the character's arc in this chapter. How can I show growth or change?`;
    case AIPromptType.STYLE_IMPROVEMENT:
      return `Please analyze my writing style in this chapter and suggest improvements for clarity, engagement, and flow.`;
    case AIPromptType.GENERAL:
    default:
      return `I'm working on my book${chapterId ? ' and specifically this chapter' : ''}. Can you help me with some creative ideas?`;
  }
};
```

#### **✅ Test Step 1**
- AI prompt selector appears in UI
- Different prompts generate different responses
- Context mode switching works

---

### **🔄 STEP 2: Progressive Writing Tools (Day 2-3)**

#### **2.1 Create Progressive Writing Component**
```typescript
// src/components/ai/ProgressiveWritingTools.tsx
interface ProgressiveWritingToolsProps {
  book: Book;
  currentChapter: Chapter;
  onContentGenerated: (content: string) => void;
}

export function ProgressiveWritingTools({ book, currentChapter, onContentGenerated }: ProgressiveWritingToolsProps) {
  const { sendContextualMessage, isLoading } = useAI();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Word count analysis
  const analyzeProgress = () => {
    const wordCount = currentChapter.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    return {
      wordCount,
      isEmpty: wordCount === 0,
      needsStart: wordCount < 100,
      canContinue: wordCount >= 100 && wordCount < 2000,
      canWrapUp: wordCount >= 1000
    };
  };
  
  const progress = analyzeProgress();
  
  // START CHAPTER FUNCTION (exact copy from spec)
  const handleStartChapter = async () => {
    setIsGenerating(true);
    const bookType = getBookType(book.genre);
    const context = buildAIContext();
    
    let aiInstruction = '';
    
    if (bookType === 'Non-Fiction') {
      aiInstruction += `Please write the opening section for the chapter titled "${currentChapter.title}". `;
      aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 500-600 words). `;
      aiInstruction += `This should be informational and practical. Start with an engaging hook that introduces the main topic of this chapter. `;
      if (currentChapter.description) {
        aiInstruction += `Chapter description: ${currentChapter.description}\n\n`;
      }
      aiInstruction += `Focus on setting up the key concepts or problems this chapter will address. Write in a clear, engaging style appropriate for ${book.targetAudience || 'general readers'}.`;
    } else {
      aiInstruction += `Please write the opening scene for the chapter titled "${currentChapter.title}". `;
      aiInstruction += `IMPORTANT: Keep your response to a maximum of 3500 characters (approximately 500-600 words). `;
      if (currentChapter.description) {
        aiInstruction += `Chapter description: ${currentChapter.description}\n\n`;
      }
      aiInstruction += `Create an engaging opening that draws the reader in. Establish the setting, introduce key characters if needed, and set up the main conflict or situation for this chapter.`;
    }
    
    aiInstruction += `\n\nIMPORTANT: This content will be used for an audio book. NEVER use hashtags, markdown headings, or any markdown formatting. All headings and section titles must be plain text only. Do not use #, ##, ###, *, _, or any other markdown symbols. Respond in plain, unformatted text only.`;
    
    try {
      const fullPrompt = `${context}\n\n${aiInstruction}`;
      const generatedContent = await sendContextualMessage('Begin writing this chapter', book.id, currentChapter.id, fullPrompt);
      onContentGenerated(generatedContent);
    } catch (error) {
      console.error('Error starting chapter:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // CONTINUE CHAPTER FUNCTION (exact copy from spec)
  const handleContinueChapter = async () => {
    // ... [Copy exact implementation from spec]
  };
  
  // WRAP UP CHAPTER FUNCTION (exact copy from spec)  
  const handleWrapUpChapter = async () => {
    // ... [Copy exact implementation from spec]
  };
  
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={handleStartChapter}
        disabled={isGenerating || isLoading}
        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
      >
        {progress.isEmpty ? 'Begin Chapter' : 'Continue Writing'}
      </button>
      
      <button
        onClick={handleWrapUpChapter}
        disabled={isGenerating || isLoading || progress.wordCount < 1000}
        className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
      >
        Wrap Up Chapter
      </button>
    </div>
  );
}
```

#### **2.2 Add TTS Formatting to All AI Calls**
```typescript
// src/app/api/ai/chat/route.ts - UPDATE system prompt
const TTS_INSTRUCTIONS = `
IMPORTANT FORMATTING INSTRUCTIONS:
1. Please provide your response in plain text without using markdown formatting like hashtags (#), asterisks (*), or other special characters, as this content may be read by a text-to-speech system.
2. Spell out all numbers (e.g., "twenty-three" instead of "23") unless they are very large numbers like millions or billions.
3. Spell out all dollar amounts (e.g., "fifty dollars" instead of "$50").
4. Spell out all degrees and percentages (e.g., "thirty-five degrees" instead of "35°", "twenty percent" instead of "20%").
5. Use "percent" instead of the % symbol.
6. Spell out all dates when possible (e.g., "January fifteenth, twenty twenty-four" instead of "January 15, 2024").
7. Do not use asterisks (*) or hashtags (#) anywhere in your response.
`;

const systemPrompt = `You are an expert book writing assistant. You help authors create engaging, well-structured content for audiobooks.

Key guidelines:
- Focus on creating content that sounds great when read aloud
- Use conversational, engaging language
- Provide specific, actionable suggestions
- Help maintain consistency in tone and style
- Consider pacing and flow for audio consumption

${TTS_INSTRUCTIONS}`;
```

#### **✅ Test Step 2**
- "Begin Chapter" button generates opening content
- "Continue Chapter" button adds to existing content  
- "Wrap Up Chapter" button creates conclusions
- All content is TTS-optimized (no markdown, numbers spelled out)
- Content limits respected (3500 characters max)

---

### **🔀 STEP 3: AI Mode Switcher (Day 4)**

#### **3.1 Create Mode Switcher Component**
```typescript
// src/components/ai/AIModeSwitcher.tsx
interface AIModeSwitcherProps {
  currentMode: AIContextMode;
  onModeChange: (mode: AIContextMode) => void;
  disabled?: boolean;
}

export function AIModeSwitcher({ currentMode, onModeChange, disabled }: AIModeSwitcherProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
      <span className="text-sm font-medium text-gray-700">AI Context:</span>
      <div className="flex rounded-md overflow-hidden border border-gray-300">
        <button
          onClick={() => onModeChange(AIContextMode.CHAPTER)}
          disabled={disabled}
          className={`px-3 py-1 text-sm font-medium transition-colors ${
            currentMode === AIContextMode.CHAPTER
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Chapter Only
        </button>
        <button
          onClick={() => onModeChange(AIContextMode.FULL_BOOK)}
          disabled={disabled}
          className={`px-3 py-1 text-sm font-medium transition-colors ${
            currentMode === AIContextMode.FULL_BOOK
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Full Book
        </button>
      </div>
    </div>
  );
}
```

#### **3.2 Implement Context Building**
```typescript
// src/utils/aiContextBuilder.ts
export function buildAIContext(book: Book, currentChapter: Chapter | null, mode: AIContextMode): string {
  let context = `Book Metadata:
Title: ${book.title}
Genre: ${book.genre}
Target Audience: ${book.targetAudience || 'General readers'}
Summary: ${book.description}

`;

  if (mode === AIContextMode.CHAPTER && currentChapter) {
    context += `Currently focused on: Chapter ${currentChapter.chapter_number}: ${currentChapter.title}

===== CHAPTER ${currentChapter.chapter_number}: ${currentChapter.title} =====
OUTLINE: ${currentChapter.description || 'No description provided'}
CONTENT: ${currentChapter.content}
`;
  } else {
    // Full book context
    context += `Currently focused on: ${currentChapter ? `Chapter ${currentChapter.chapter_number}: ${currentChapter.title}` : 'General book discussion'}

`;
    
    book.chapters?.forEach((chapter, index) => {
      context += `===== CHAPTER ${index + 1}: ${chapter.title} =====
OUTLINE: ${chapter.description || 'No description provided'}
CONTENT: ${chapter.content}

`;
    });
  }
  
  return context;
}
```

#### **✅ Test Step 3**
- Mode switcher toggles between Chapter/Full Book
- AI responses change based on context mode
- Chapter mode only knows current chapter
- Full Book mode knows entire book content

---

### **🎯 STEP 4: AI Prompt Type Selector (Day 5)**

#### **4.1 Create Prompt Type Selector**
```typescript
// src/components/ai/AIPromptTypeSelector.tsx
interface AIPromptTypeSelectorProps {
  selectedType: AIPromptType;
  onTypeChange: (type: AIPromptType) => void;
  onSendPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function AIPromptTypeSelector({ selectedType, onTypeChange, onSendPrompt, disabled }: AIPromptTypeSelectorProps) {
  const { generatePrompt } = useAI();
  
  const promptTypes = [
    { value: AIPromptType.GENERAL, label: 'General Writing Help', icon: '💬' },
    { value: AIPromptType.CHAPTER_IDEA, label: 'Chapter Ideas', icon: '💡' },
    { value: AIPromptType.PLOT_DEVELOPMENT, label: 'Plot Development', icon: '📈' },
    { value: AIPromptType.CHARACTER_DEVELOPMENT, label: 'Character Development', icon: '👤' },
    { value: AIPromptType.STYLE_IMPROVEMENT, label: 'Style Improvement', icon: '✨' },
  ];
  
  const handleSendPrompt = () => {
    const prompt = generatePrompt(selectedType, 'current-book-id', 'current-chapter-id');
    onSendPrompt(prompt);
  };
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {promptTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => onTypeChange(type.value)}
            className={`flex items-center gap-2 p-3 text-left text-sm border rounded-lg transition-colors ${
              selectedType === type.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">{type.icon}</span>
            <span className="font-medium">{type.label}</span>
          </button>
        ))}
      </div>
      
      <button
        onClick={handleSendPrompt}
        disabled={disabled}
        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
      >
        Get {promptTypes.find(t => t.value === selectedType)?.label} Suggestions
      </button>
    </div>
  );
}
```

#### **✅ Test Step 4**
- 5 prompt types display correctly
- Each type generates different prompt text
- Prompts produce relevant AI responses
- UI updates when type selection changes

---

### **📝 STEP 5: Integration with Book Editor (Day 6-7)**

#### **5.1 Update Book Editor to Include Progressive Tools**
```typescript
// src/app/book/[id]/page.tsx - ADD to editor interface
import { ProgressiveWritingTools } from '@/components/ai/ProgressiveWritingTools';
import { AIModeSwitcher } from '@/components/ai/AIModeSwitcher';
import { AIPromptTypeSelector } from '@/components/ai/AIPromptTypeSelector';

// In the editor component, add:
<div className="flex-1 flex">
  {/* Main editor content */}
  <div className="flex-1 p-6">
    {/* Existing chapter editing UI */}
  </div>

  {/* AI Assistant Sidebar */}
  {showAIChat && (
    <div className="w-96 bg-white border-l border-gray-200 shadow-sm flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">🤖 AI Assistant</h3>
          <button onClick={() => setShowAIChat(false)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        {/* AI Mode Switcher */}
        <AIModeSwitcher
          currentMode={aiContextMode}
          onModeChange={setAiContextMode}
          disabled={isLoading}
        />
      </div>
      
      <div className="p-4 border-b border-gray-200">
        {/* Progressive Writing Tools */}
        <ProgressiveWritingTools
          book={book}
          currentChapter={selectedChapter}
          onContentGenerated={(content) => {
            setEditContent(prev => prev + '\n\n' + content);
            setIsEditing(true);
          }}
        />
      </div>
      
      <div className="p-4 border-b border-gray-200">
        {/* AI Prompt Type Selector */}
        <AIPromptTypeSelector
          selectedType={selectedPromptType}
          onTypeChange={setSelectedPromptType}
          onSendPrompt={(prompt) => sendAIMessage(prompt)}
          disabled={isLoading}
        />
      </div>
      
      <div className="flex-1 min-h-0">
        {/* Existing AIAssistantChat */}
        <AIAssistantChat
          book={book}
          currentChapter={selectedChapter}
          onContentSuggestion={(content) => {
            setEditContent(prev => prev + '\n\n' + content);
            setIsEditing(true);
          }}
          className="h-full"
        />
      </div>
    </div>
  )}
</div>
```

#### **✅ Test Step 5**
- AI sidebar includes all new tools
- Progressive writing buttons insert content into editor
- Mode switcher changes AI behavior  
- Prompt types work with current chapter/book context
- Generated content flows naturally into editor

---

## 📅 **WEEK 2: ADVANCED FEATURES**
*Goal: Power user tools for serious writers*

### **📚 STEP 6: Enhanced Outline Generation (Day 8-10)**

#### **6.1 Create Fiction/Non-Fiction Outline Templates**
```typescript
// src/app/api/ai/outline/route.ts - UPDATE with exact prompts from spec

const buildOutlinePrompt = (title: string, genre: string, description: string, isNonFiction: boolean, chapterCount: number) => {
  if (isNonFiction) {
    if (chapterCount === 1) {
      return `You are an expert non-fiction book editor.
Given the following book concept, generate EXACTLY ONE chapter outline for a non-fiction book titled "${title}" in the genre "${genre}".
Provide:
- A clear, descriptive chapter title
- A summary of the chapter (3-5 sentences) that teaches, explains, or guides the reader on a specific topic

Book concept/summary: ${description}

Format your response EXACTLY as:
Chapter 1: [Title]
Summary: [3-5 sentence summary explaining what this chapter teaches or covers]

Do NOT use any other formatting. Make sure to include a complete summary.`;
    } else {
      return `You are an expert non-fiction book editor.
Given the following book concept, generate a chapter-by-chapter outline for a non-fiction book titled "${title}" in the genre "${genre}".
For each chapter, provide:
- A clear, descriptive chapter title  
- A summary of the chapter (3-5 sentences) that teaches, explains, or guides the reader on a specific topic

Book concept/summary: ${description}

Format your response EXACTLY as:
Chapter 1: [Title]
Summary: [3-5 sentence summary explaining what this chapter teaches or covers]

Chapter 2: [Title]
Summary: [3-5 sentence summary explaining what this chapter teaches or covers]

(continue this pattern for all chapters...)

Do NOT use bullet points, numbered lists, or any other format. Make sure every chapter has a complete summary.`;
    }
  } else {
    // Fiction prompts - exact same format with fiction-specific instructions
    // ... [Copy from spec]
  }
};
```

#### **6.2 Create Outline Improvement Tools**
```typescript
// src/components/ai/OutlineImprovementTools.tsx
export function OutlineImprovementTools({ book, outline, onOutlineUpdated }: OutlineImprovementToolsProps) {
  const improvePrompts = [
    {
      title: "Improve existing outline",
      action: `Analyze my current outline and suggest improvements for better pacing and structure in my ${book.genre} titled "${book.title}".`
    },
    {
      title: "Suggest missing chapters",
      action: `Based on my current outline, suggest additional chapters or scenes that might be missing to create a more complete story for my ${book.genre}.`
    },
    {
      title: "Deepen character arcs", 
      action: `Suggest how to enhance character development across my chapters to create more compelling character arcs throughout the story.`
    }
  ];
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Outline Improvement Tools</h4>
      {improvePrompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => handleImprovementPrompt(prompt.action)}
          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <span className="font-medium text-gray-900">{prompt.title}</span>
        </button>
      ))}
    </div>
  );
}
```

#### **✅ Test Step 6**
- Fiction vs Non-Fiction outline prompts work correctly
- Generated outlines follow exact format specifications
- Improvement tools provide actionable suggestions
- Outline parsing creates proper chapter structure

---

### **🔍 STEP 7: Continuity Analysis System (Day 11-12)**

#### **7.1 Create Continuity Analyzer**
```typescript
// src/components/ai/ContinuityAnalyzer.tsx
export function ContinuityAnalyzer({ book, currentChapter }: ContinuityAnalyzerProps) {
  const buildContinuityPrompt = () => {
    const bookType = getBookType(book.genre);
    let aiInstruction = '';
    
    if (currentChapter) {
      aiInstruction = `Please analyze the continuity and flow of Chapter ${currentChapter.chapter_number}: "${currentChapter.title}" in relation to the ENTIRE book. Review how this chapter fits within the complete narrative arc.\n\n`;
    } else {
      aiInstruction = `Please conduct a comprehensive continuity analysis of the entire book. Review all chapters together for overall coherence.\n\n`;
    }
    
    if (bookType === 'Fiction') {
      aiInstruction += `Focus on these Fiction elements:
1. Character consistency - personality, voice, motivations, and development across chapters
2. Plot continuity - logical story progression, cause and effect, foreshadowing payoffs
3. Timeline consistency - chronology, pacing, and time references
4. Setting and world-building consistency - locations, rules, atmosphere
5. Dialogue and voice consistency - character speech patterns, narrative voice
6. Emotional arc and tension progression throughout the story
7. Subplots and their resolution or continuation

`;
    } else {
      aiInstruction += `Focus on these Non-Fiction elements:
1. Logical flow of ideas and concepts between chapters
2. Consistency in terminology, definitions, and frameworks
3. Appropriate progression from basic to advanced concepts
4. Cross-references and callbacks that work correctly
5. Tone and voice consistency throughout
6. Examples and case studies that support the main themes
7. Chapter conclusions that lead naturally to the next chapter

`;
    }
    
    aiInstruction += `Identify specific issues:
- Plot holes or logical inconsistencies
- Character behavior that seems out of character
- Information that contradicts earlier chapters
- Abrupt transitions or missing connections
- Repetitive content or missed opportunities for callbacks

Provide actionable suggestions for improvements and highlight any continuity issues that need attention.`;

    return aiInstruction;
  };
  
  // ... [Implementation details]
}
```

#### **✅ Test Step 7**
- Continuity analysis covers Fiction vs Non-Fiction elements
- Identifies specific inconsistencies and plot holes
- Provides actionable improvement suggestions
- Works for single chapters or entire book

---

### **📋 STEP 8: Publisher Review Mode (Day 13-14)**

#### **8.1 Create Publisher Review Component**
```typescript
// src/components/ai/PublisherReviewMode.tsx
export function PublisherReviewMode({ book }: PublisherReviewModeProps) {
  const buildPublisherReviewPrompt = () => {
    return `PUBLISHER REVIEW REQUEST

You are a professional literary editor and publisher with extensive experience in the publishing industry. Your task is to provide a comprehensive, honest, and constructive review of the following book.

BOOK INFORMATION:
Title: "${book.title}"
Genre: ${book.genre}
Target Audience: ${book.targetAudience}
Summary: ${book.description}

CHAPTER STRUCTURE (${book.chapters.length} chapters total):

${book.chapters.map((chapter, index) => `
CHAPTER ${index + 1}: "${chapter.title}"
Description/Outline: ${chapter.description}
Content Sample: ${chapter.content.substring(0, 500)}...
`).join('\n')}

REVIEW INSTRUCTIONS:
Please provide a thorough, honest review of this book addressing the following aspects:
1. STRENGTHS: What are the strongest elements of the story? (Characters, plot, concept, etc.)
2. WEAKNESSES: What areas need improvement? Be honest but constructive.
3. MARKET POTENTIAL: Is there a viable market for this book? What audience would it appeal to?
4. STRUCTURE: Does the chapter structure make sense? Are there pacing issues?
5. CHARACTER DEVELOPMENT: Are the characters well-developed? Are they engaging?
6. OVERALL ASSESSMENT: Give an honest overall assessment of the book's readiness for publication.

Format your response as a professional publisher's review letter. Don't hold back critical feedback - authors need honest assessment to improve their work. But remain encouraging - point out strengths alongside areas that need improvement.

PUBLISHER REVIEW:`;
  };
  
  // ... [Implementation details]
}
```

#### **✅ Test Step 8**
- Generates comprehensive publisher-style reviews
- Covers all 6 required assessment areas
- Provides honest, constructive feedback
- Format matches professional review letters

---

## 📅 **WEEK 3: POLISH & PROFESSIONAL FEATURES**
*Goal: Production-ready system with professional tools*

### **🎨 STEP 9: Complete UI Component Library (Day 15-17)**

#### **9.1 Create Comprehensive AI Toolbar**
```typescript
// src/components/ai/AIToolbar.tsx
export function AIToolbar({ book, currentChapter, onToolAction }: AIToolbarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Mode Switcher */}
      <div className="p-4 border-b border-gray-200">
        <AIModeSwitcher currentMode={contextMode} onModeChange={setContextMode} />
      </div>
      
      {/* Progressive Writing Tools */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Quick Writing</h4>
        <ProgressiveWritingTools 
          book={book} 
          currentChapter={currentChapter}
          onContentGenerated={onToolAction}
        />
      </div>
      
      {/* AI Prompt Types */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Writing Assistance</h4>
        <AIPromptTypeSelector
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onSendPrompt={onToolAction}
        />
      </div>
      
      {/* Outline Tools */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Outline Tools</h4>
        <OutlineImprovementTools
          book={book}
          outline={book.outline}
          onOutlineUpdated={onToolAction}
        />
      </div>
      
      {/* Analysis Tools */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">Analysis</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50">
            📊 Continuity Analysis
          </button>
          <button className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50">
            📋 Publisher Review
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### **9.2 Create Text Insertion System**
```typescript
// src/components/ai/TextInsertionManager.tsx
export function TextInsertionManager({ editorRef, onInsert }: TextInsertionManagerProps) {
  const insertAtCursor = (text: string) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = textarea.value;
      
      const newContent = currentContent.substring(0, start) + 
                        '\n\n' + text + '\n\n' + 
                        currentContent.substring(end);
                        
      onInsert(newContent);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length + 4, start + text.length + 4);
      }, 0);
    }
  };
  
  return { insertAtCursor };
}
```

#### **✅ Test Step 9**
- Complete AI toolbar with all tools
- Text insertion works at cursor position
- Professional UI with consistent styling
- All tools integrate seamlessly

---

### **🔧 STEP 10: Performance & Error Handling (Day 18-19)**

#### **10.1 Implement Context Optimization**
```typescript
// src/utils/contextOptimizer.ts
export function optimizeContext(fullContext: string, userMessage: string): string {
  const APPROX_TOKEN_LIMIT = 12000;
  const estimateTokenCount = (text: string) => Math.ceil(text.length / 4);
  
  if (estimateTokenCount(fullContext) <= APPROX_TOKEN_LIMIT) {
    return fullContext;
  }
  
  console.log('Context is very large, optimizing for token usage');
  
  // Extract metadata and current chapter focus
  const metadataMatch = fullContext.match(/Book Metadata:[\s\S]*?(?=\n\n)/);
  const metadata = metadataMatch ? metadataMatch[0] : '';
  
  const currentChapterMatch = fullContext.match(/Currently focused on:[\s\S]*?(?=\n\n)/);
  const currentChapterFocus = currentChapterMatch ? currentChapterMatch[0] : '';
  
  // Split and truncate chapter sections
  const chapterSections = fullContext.split(/=====\s*CHAPTER\s+\d+:/i);
  const truncatedSections = chapterSections.map(section => {
    const titleMatch = section.match(/^.*?(?=\n)/);
    const outlineMatch = section.match(/OUTLINE:[\s\S]*?(?=\n\nCONTENT:)/);
    const contentMatch = section.match(/CONTENT:([\s\S]*?)(?=\n\n|$)/);
    
    if (titleMatch && outlineMatch && contentMatch) {
      const title = titleMatch[0];
      const outline = outlineMatch[0];
      const content = contentMatch[1];
      const words = content.split(/\s+/);
      const previewWords = words.slice(0, 150);
      const contentPreview = previewWords.join(' ');
      
      return `${title}\n${outline}\nCONTENT: ${contentPreview}...\n[Content truncated for brevity]\n`;
    }
    
    return section;
  });
  
  let optimizedContext = `${metadata}\n\n`;
  if (currentChapterFocus) {
    optimizedContext += `${currentChapterFocus}\n\n`;
  }
  
  optimizedContext += "NOTE: The following is an abbreviated version of all chapters. Full content has been truncated to work within token limits.\n\n";
  truncatedSections.forEach((section, index) => {
    if (index > 0) {
      optimizedContext += `===== CHAPTER ${index}: ${section}\n`;
    }
  });
  
  optimizedContext += `\nUser question: ${userMessage}`;
  
  console.log(`Reduced context from ~${estimateTokenCount(fullContext)} to ~${estimateTokenCount(optimizedContext)} tokens`);
  
  return optimizedContext;
}
```

#### **10.2 Add Comprehensive Error Handling**
```typescript
// src/hooks/useAIWithErrorHandling.ts
export function useAIWithErrorHandling() {
  const [retryCount, setRetryCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  
  const sendMessageWithRetry = async (message: string, context?: any, maxRetries = 3) => {
    try {
      return await sendMessage(message, context);
    } catch (error) {
      if (error.status === 429) {
        // Rate limited
        setIsRateLimited(true);
        const retryAfterSeconds = parseInt(error.headers?.['retry-after'] || '60');
        setRetryAfter(retryAfterSeconds);
        
        // Auto-retry after delay
        setTimeout(() => {
          setIsRateLimited(false);
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            sendMessageWithRetry(message, context, maxRetries);
          }
        }, retryAfterSeconds * 1000);
        
        throw new Error(`Rate limited. Please wait ${retryAfterSeconds} seconds.`);
      }
      
      if (error.status >= 500 && retryCount < maxRetries) {
        // Server error - retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          sendMessageWithRetry(message, context, maxRetries);
        }, delay);
        
        throw new Error(`Server error. Retrying in ${delay/1000} seconds...`);
      }
      
      throw error;
    }
  };
  
  return { sendMessageWithRetry, isRateLimited, retryAfter };
}
```

#### **✅ Test Step 10**
- Context optimization works for large books
- Rate limiting handled gracefully
- Retry logic works for server errors
- Performance optimized for production use

---

### **✅ STEP 11: Final Integration & Testing (Day 20-21)**

#### **11.1 Full System Integration Test**
```typescript
// Test Checklist:
const integrationTests = [
  // Progressive Writing
  { test: 'Start Chapter', input: 'Empty chapter', expect: 'Opening content generated' },
  { test: 'Continue Chapter', input: '200 words existing', expect: 'Additional content added' },
  { test: 'Wrap Up Chapter', input: '1500 words existing', expect: 'Conclusion generated' },
  
  // AI Prompt Types  
  { test: 'Chapter Ideas', input: 'CHAPTER_IDEA prompt', expect: 'Three chapter suggestions' },
  { test: 'Plot Development', input: 'PLOT_DEVELOPMENT prompt', expect: 'Plot advancement ideas' },
  { test: 'Character Development', input: 'CHARACTER_DEVELOPMENT prompt', expect: 'Character arc suggestions' },
  { test: 'Style Improvement', input: 'STYLE_IMPROVEMENT prompt', expect: 'Writing style analysis' },
  
  // Context Modes
  { test: 'Chapter Mode', input: 'Chapter-only context', expect: 'Only current chapter referenced' },
  { test: 'Full Book Mode', input: 'Full book context', expect: 'All chapters referenced' },
  
  // Outline Generation
  { test: 'Fiction Outline', input: 'Fiction book prompt', expect: 'Story-based chapter outline' },
  { test: 'Non-Fiction Outline', input: 'Non-fiction book prompt', expect: 'Educational chapter outline' },
  
  // Advanced Features
  { test: 'Continuity Analysis', input: 'Full book', expect: 'Consistency issues identified' },
  { test: 'Publisher Review', input: 'Complete book', expect: 'Professional review format' },
  
  // TTS Optimization
  { test: 'TTS Formatting', input: 'Any AI response', expect: 'No markdown, numbers spelled out' },
  
  // Error Handling
  { test: 'Rate Limiting', input: 'Rapid requests', expect: 'Graceful retry handling' },
  { test: 'Large Context', input: 'Book >50k words', expect: 'Context optimization triggered' }
];
```

#### **11.2 Performance Benchmarks**
```typescript
const performanceTargets = {
  aiResponseTime: '< 3 seconds',
  contextOptimization: '< 1 second', 
  uiInteractivity: '< 100ms',
  errorRecovery: '< 5 seconds',
  memoryUsage: '< 100MB',
  tokenEfficiency: '< 15k tokens per request'
};
```

#### **✅ Final Test Step 11**
- All 20+ AI features working correctly
- TTS optimization applied universally
- Error handling robust and user-friendly
- Performance meets production standards
- UI polished and professional

---

## 🎯 **SUCCESS CRITERIA**

### **Week 1 Success** 
- [ ] Progressive writing tools generate content
- [ ] AI prompt types work correctly  
- [ ] Context mode switching functional
- [ ] TTS formatting applied to all responses
- [ ] Integration with book editor complete

### **Week 2 Success**
- [ ] Fiction/Non-fiction outline generation working
- [ ] Outline improvement tools provide suggestions
- [ ] Continuity analysis identifies issues
- [ ] Publisher review mode generates professional reviews
- [ ] All advanced features functional

### **Week 3 Success**  
- [ ] Complete UI component library built
- [ ] Text insertion system working
- [ ] Performance optimized for production
- [ ] Error handling comprehensive
- [ ] 100% feature parity with old system achieved

---

## 🚀 **DEPLOYMENT PLAN**

### **Staging Deployment** (End of Week 2)
- Deploy core features to staging environment
- User acceptance testing with progressive writing tools
- Performance testing with large books
- Error handling validation

### **Production Deployment** (End of Week 3)
- Full feature deployment to production
- User documentation and training materials
- Performance monitoring and alerting
- Rollback plan if issues arise

---

**This plan rebuilds the complete AI system exactly as it existed in the original Biglio book system. Each step has clear specifications, test criteria, and success metrics. The result will be a sophisticated AI writing assistant that matches or exceeds the original functionality.**

**Next Step:** Begin Week 1, Step 1 - Enhanced AI Context implementation.