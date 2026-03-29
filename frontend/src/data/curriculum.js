// DreamerZ_Beta Curriculum Data Module
// Version 2.0.0 - Comprehensive learning content

// ============================================
// TYPE DEFINITIONS
// ============================================









// ============================================
// TOOLS METADATA
// ============================================

export const tools  = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    tagline: 'Your AI conversation partner',
    icon: '🤖',
    theme: {
      color: '#10A37F',
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50'
    },
    description: 'Master the art of AI conversations. Learn how ChatGPT works, write effective prompts, and use AI responsibly for learning and creativity.',
    totalXP: 800
  },
  {
    id: 'claude',
    name: 'Claude',
    tagline: 'Thoughtful AI assistant',
    icon: '🧠',
    theme: {
      color: '#D97706',
      gradient: 'from-amber-500 to-orange-600',
      lightBg: 'bg-amber-50'
    },
    description: 'Explore Anthropic\'s helpful, harmless, and honest AI. Learn safe writing workflows and thoughtful analysis techniques.',
    totalXP: 500
  },
  {
    id: 'gemini',
    name: 'Gemini',
    tagline: 'Google\'s multimodal AI',
    icon: '✨',
    theme: {
      color: '#4285F4',
      gradient: 'from-blue-500 to-indigo-600',
      lightBg: 'bg-blue-50'
    },
    description: 'Discover Google\'s AI that understands text, images, and more. Learn to use AI across Google\'s ecosystem.',
    totalXP: 500
  },
  {
    id: 'canva',
    name: 'Canva',
    tagline: 'AI-powered design',
    icon: '🎨',
    theme: {
      color: '#00C4CC',
      gradient: 'from-cyan-500 to-teal-500',
      lightBg: 'bg-cyan-50'
    },
    description: 'Create stunning designs with AI assistance. Learn design basics, AI features, and responsible media creation.',
    totalXP: 500
  },
  {
    id: 'syllaby',
    name: 'Syllaby',
    tagline: 'AI content planning',
    icon: '📝',
    theme: {
      color: '#8B5CF6',
      gradient: 'from-violet-500 to-purple-600',
      lightBg: 'bg-violet-50'
    },
    description: 'Plan and organize content with AI help. Learn content strategy, scripting, and authentic creation.',
    totalXP: 500
  }
];

// ============================================
// CHATGPT JOURNEY (8 Modules)
// ============================================

const chatgptJourney = [
  {
    id: 'chatgpt-intro',
    title: 'What is ChatGPT?',
    minutes: 10,
    level: 'beginner',
    explanation: `ChatGPT is an AI assistant created by OpenAI that can have conversations with you, answer questions, help with homework, write stories, and much more.

Think of it like a very knowledgeable friend who has read millions of books, articles, and websites. When you ask it something, it uses all that knowledge to give you helpful responses.

**Important to know:**
• ChatGPT was trained on text data up to a certain date, so it doesn't know about very recent events
• It can make mistakes (called "hallucinations") so always verify important facts
• It's a tool to help you learn, not to do your thinking for you`,
    example: `**You ask:** "Can you explain the water cycle for my geography project?"

**ChatGPT responds:** "The water cycle has four main stages:

1. **Evaporation** - The sun heats water in rivers, lakes, and oceans, turning it into water vapor that rises into the air.

2. **Condensation** - As water vapor rises and cools, it forms tiny droplets that create clouds.

3. **Precipitation** - When clouds become heavy with water droplets, they fall as rain, snow, or hail.

4. **Collection** - Water collects in rivers, lakes, and oceans, and the cycle starts again!

Fun fact: The water you drink today might have been drunk by a dinosaur millions of years ago!"`,
    activity: 'Open ChatGPT and ask it to explain your favorite sport (cricket, football, badminton) as if explaining to someone who has never heard of it. Notice how it breaks down complex rules into simple steps!',
    quiz: {
      questions: [
        {
          id: 'cg-intro-1',
          type: 'mcq',
          question: 'What company created ChatGPT?',
          options: ['Google', 'OpenAI', 'Microsoft', 'Meta'],
          correctAnswer: 1,
          explanation: 'OpenAI, founded in 2015, created ChatGPT and released it to the public in November 2022.'
        },
        {
          id: 'cg-intro-2',
          type: 'true-false',
          question: 'ChatGPT knows everything happening in the world right now.',
          correctAnswer: false,
          explanation: 'ChatGPT was trained on data up to a certain date. It doesn\'t have access to real-time information or recent events.'
        },
        {
          id: 'cg-intro-3',
          type: 'mcq',
          question: 'What is the best way to use ChatGPT for learning?',
          options: [
            'Copy its answers directly into your homework',
            'Use it as a tool to understand concepts, then write in your own words',
            'Only use it for entertainment',
            'Trust everything it says without checking'
          ],
          correctAnswer: 1,
          explanation: 'ChatGPT is best used as a learning aid. Understand the concepts it explains, then express them in your own words.'
        }
      ],
      passingScore: 70,
      hints: [
        'Think about who makes popular AI tools',
        'Consider whether any AI can know what\'s happening right now',
        'Remember: AI helps you learn, not replaces your thinking'
      ],
      safeFeedback: {
        pass: 'Excellent start! You understand what ChatGPT is and how to use it wisely. Ready for the next module!',
        fail: 'No worries! Review the module content about what ChatGPT is and its limitations. You\'ve got this!'
      }
    }
  },
  {
    id: 'chatgpt-llm-basics',
    title: 'LLM Model Basics',
    minutes: 15,
    level: 'beginner',
    explanation: `LLM stands for "Large Language Model" - it's the technology that powers ChatGPT.

**How does an LLM work?**
Imagine teaching a child to predict the next word in a sentence by reading thousands of books. That's similar to how LLMs learn!

1. **Training:** The AI reads billions of sentences from books, websites, and articles
2. **Pattern Learning:** It learns how words and ideas connect together
3. **Prediction:** When you ask something, it predicts what words should come next based on patterns

**Key Concepts:**

• **Neural Network:** The "brain" of the AI - layers of math that process information
• **Parameters:** Adjustable values (like knobs) that were tuned during training. GPT-4 has over 100 billion parameters!
• **Training Data:** All the text the AI learned from

**Important:** LLMs don't "understand" like humans. They're incredibly good at recognizing and reproducing patterns in language.`,
    example: `**Think of it like autocomplete on steroids:**

When you type "Good morning, how are..." on your phone, it might suggest "you" as the next word.

LLMs do the same thing, but for entire paragraphs! They consider:
- What you just asked
- The context of the conversation
- Patterns from all the text they've learned

**Real example:**
Prompt: "Write a haiku about monsoon in Mumbai"
The LLM predicts word by word:
"Grey → clouds → gather → fast → / → Raindrops → dance → on → hot → streets → / → Relief → at → last"

It's not thinking creatively - it's predicting what words typically follow each other in haiku poems about rain!`,
    activity: 'Try this experiment: Ask ChatGPT to complete the sentence "The best thing about learning is..." three times. Notice how each response is slightly different - that\'s because the AI has some randomness in choosing between equally likely next words!',
    quiz: {
      questions: [
        {
          id: 'cg-llm-1',
          type: 'mcq',
          question: 'What does LLM stand for?',
          options: [
            'Little Learning Machine',
            'Large Language Model',
            'Live Learning Module',
            'Language Logic Memory'
          ],
          correctAnswer: 1,
          explanation: 'LLM stands for Large Language Model - "Large" because of billions of parameters, "Language" because it works with text, "Model" because it\'s a mathematical representation.'
        },
        {
          id: 'cg-llm-2',
          type: 'mcq',
          question: 'How does an LLM primarily generate responses?',
          options: [
            'By searching the internet in real-time',
            'By predicting the most likely next words based on patterns',
            'By copying from a database of pre-written answers',
            'By asking other AI systems'
          ],
          correctAnswer: 1,
          explanation: 'LLMs work by predicting the next most likely word based on patterns learned during training. They don\'t search the internet or copy from databases.'
        },
        {
          id: 'cg-llm-3',
          type: 'true-false',
          question: 'LLMs understand language the same way humans do.',
          correctAnswer: false,
          explanation: 'LLMs recognize patterns in language but don\'t truly "understand" meaning like humans. They\'re sophisticated pattern-matching systems.'
        },
        {
          id: 'cg-llm-4',
          type: 'mcq',
          question: 'What are "parameters" in an LLM?',
          options: [
            'The questions you ask',
            'Adjustable values tuned during training',
            'The speed of responses',
            'The language settings'
          ],
          correctAnswer: 1,
          explanation: 'Parameters are like adjustable knobs in the neural network that were fine-tuned during training to produce accurate predictions.'
        }
      ],
      passingScore: 70,
      hints: [
        'Remember what each letter in LLM stands for',
        'Think about how autocomplete on your phone works',
        'Consider whether machines can truly "understand" like humans'
      ],
      safeFeedback: {
        pass: 'Great job! You now understand the basics of how LLMs work. This knowledge will help you use AI more effectively!',
        fail: 'Take another look at how LLMs process language through pattern prediction. It\'s a key concept for understanding AI!'
      }
    }
  },
  {
    id: 'chatgpt-context-tokens',
    title: 'Context Window & Tokens',
    minutes: 12,
    level: 'beginner',
    explanation: `When you chat with ChatGPT, it breaks your text into small pieces called "tokens" and can only remember a certain amount at a time (the "context window").

**What are Tokens?**
Tokens are chunks of text - usually words or parts of words.

Examples:
• "Hello" = 1 token
• "Cricket" = 1 token  
• "Unbelievable" = 3 tokens ("Un" + "believ" + "able")
• "ChatGPT is amazing!" = 5 tokens

**What is the Context Window?**
Think of it as ChatGPT's "working memory" - how much of the conversation it can hold at once.

• GPT-3.5: ~4,000 tokens (about 3,000 words)
• GPT-4: ~8,000-128,000 tokens depending on version

**Why does this matter?**
1. Very long conversations get "forgotten" - ChatGPT loses track of what you discussed earlier
2. Longer prompts use more tokens, leaving less space for the response
3. You pay for tokens when using the API (not the free version)

**Pro tip:** If ChatGPT seems to forget something, it might have exceeded its context window!`,
    example: `**Imagine ChatGPT's memory as a whiteboard:**

You start a conversation about your science project on plants. You discuss:
1. Types of plants (fills 1/4 of whiteboard)
2. Photosynthesis (fills another 1/4)
3. Your experiment design (fills another 1/4)
4. Results you expect (fills the last 1/4)

Now if you ask about fertilizers, ChatGPT needs to write new information. It erases the oldest stuff (types of plants) to make room!

**That's why:**
- ChatGPT might "forget" things you mentioned at the start
- Important info should be repeated or placed near the end
- Starting a new chat resets the context`,
    activity: 'Have a conversation with ChatGPT about planning a school event. After 10-15 messages, ask "What was the first thing I mentioned?" See if it remembers! This shows context window limits in action.',
    quiz: {
      questions: [
        {
          id: 'cg-ctx-1',
          type: 'mcq',
          question: 'What is a "token" in ChatGPT?',
          options: [
            'A virtual coin for payment',
            'A chunk of text (word or part of word)',
            'A security password',
            'A type of emoji'
          ],
          correctAnswer: 1,
          explanation: 'Tokens are pieces of text that ChatGPT processes. They can be whole words, parts of words, or punctuation.'
        },
        {
          id: 'cg-ctx-2',
          type: 'true-false',
          question: 'ChatGPT can remember everything from a very long conversation perfectly.',
          correctAnswer: false,
          explanation: 'ChatGPT has a limited context window. In very long conversations, it loses track of earlier messages.'
        },
        {
          id: 'cg-ctx-3',
          type: 'mcq',
          question: 'What happens when a conversation exceeds the context window?',
          options: [
            'ChatGPT crashes',
            'The conversation automatically saves to a file',
            'ChatGPT starts "forgetting" earlier parts',
            'You get charged extra'
          ],
          correctAnswer: 2,
          explanation: 'When the context window fills up, ChatGPT loses access to the earliest parts of the conversation.'
        },
        {
          id: 'cg-ctx-4',
          type: 'mcq',
          question: 'Where should you put important information in a long prompt?',
          options: [
            'At the very beginning only',
            'Randomly throughout',
            'Near the end or repeat it',
            'In a separate message'
          ],
          correctAnswer: 2,
          explanation: 'Important information should be near the end of your prompt or repeated, so it\'s more likely to be in the active context window.'
        }
      ],
      passingScore: 70,
      hints: [
        'Think of tokens as building blocks of text',
        'Consider what happens to old messages in a very long chat',
        'Remember the whiteboard analogy'
      ],
      safeFeedback: {
        pass: 'Excellent! Understanding tokens and context windows helps you write better prompts and have more effective conversations!',
        fail: 'Review how ChatGPT\'s memory works with tokens and context. This is important for getting better results!'
      }
    }
  },
  {
    id: 'chatgpt-prompt-patterns',
    title: 'Prompt Patterns & Techniques',
    minutes: 15,
    level: 'intermediate',
    explanation: `A "prompt" is the message you send to ChatGPT. Better prompts = better answers! Here are proven patterns that work:

**The RACE Framework:**
• **R**ole: Tell ChatGPT who to be ("You are a friendly science teacher")
• **A**ction: What you want it to do ("Explain photosynthesis")
• **C**ontext: Background info ("For a Class 8 student in India")
• **E**xpectation: How you want the output ("In simple bullet points, under 100 words")

**Powerful Prompt Patterns:**

1. **Persona Pattern**
   "You are a cricket commentator. Describe how a computer processes data like it's a cricket match."

2. **Few-Shot Pattern** (give examples)
   "Convert to formal: 'gonna go home' → 'I am going to go home'
   Now convert: 'wanna grab lunch'"

3. **Chain of Thought**
   "Solve this step by step: If a train travels 60 km in 45 minutes..."

4. **Critique Pattern**
   "Here's my essay introduction. What are 3 ways to improve it?"

5. **Template Pattern**
   "Fill in this template for my book report: Title: ___, Author: ___, Main theme: ___"`,
    example: `**Bad prompt:**
"Tell me about history"

**Good prompt using RACE:**
"**Role:** You are a fun history teacher who uses Bollywood movie references.
**Action:** Explain the Indian independence movement.
**Context:** I'm a Class 10 student preparing for my board exams.
**Expectation:** Give me 5 key events with dates, and compare each to a movie scene I might know."

**The difference:**
- Bad prompt → Vague, generic response about any history topic
- Good prompt → Specific, engaging, exam-relevant information tailored to you!`,
    activity: 'Transform this weak prompt into a strong one using RACE: "Help me with my essay." Think about what subject, what class level, what length, and what style you need. Test both versions in ChatGPT and compare!',
    quiz: {
      questions: [
        {
          id: 'cg-prompt-1',
          type: 'mcq',
          question: 'What does the "R" in RACE stand for?',
          options: ['Result', 'Role', 'Repeat', 'Research'],
          correctAnswer: 1,
          explanation: 'R stands for Role - telling ChatGPT what persona or expert to act as helps it give more relevant responses.'
        },
        {
          id: 'cg-prompt-2',
          type: 'mcq',
          question: 'Which prompt pattern involves giving examples before your actual request?',
          options: [
            'Persona Pattern',
            'Chain of Thought',
            'Few-Shot Pattern',
            'Template Pattern'
          ],
          correctAnswer: 2,
          explanation: 'The Few-Shot Pattern provides examples of what you want, helping ChatGPT understand the format or style you need.'
        },
        {
          id: 'cg-prompt-3',
          type: 'mcq',
          question: 'Which prompt would give better results?',
          options: [
            '"Write something about pollution"',
            '"You are an environmental scientist. Write a 200-word explanation of air pollution causes for Class 9 students, with 3 examples from Indian cities."',
            '"Pollution essay"',
            '"Tell me facts"'
          ],
          correctAnswer: 1,
          explanation: 'The detailed prompt specifies role, topic, length, audience, and requirements - leading to a much more useful response.'
        },
        {
          id: 'cg-prompt-4',
          type: 'true-false',
          question: 'Adding "step by step" to a prompt helps ChatGPT show its reasoning.',
          correctAnswer: true,
          explanation: 'The Chain of Thought pattern with phrases like "step by step" encourages ChatGPT to break down its reasoning, often leading to better answers.'
        }
      ],
      passingScore: 70,
      hints: [
        'RACE helps structure your prompts',
        'Examples help AI understand what you want',
        'More specific prompts get more useful responses'
      ],
      safeFeedback: {
        pass: 'You\'re becoming a prompt engineering pro! These patterns will help you get much better results from any AI.',
        fail: 'Prompt patterns are powerful tools. Review the RACE framework and try the examples again!'
      }
    }
  },
  {
    id: 'chatgpt-hallucinations',
    title: 'AI Hallucinations & Fact-Checking',
    minutes: 12,
    level: 'intermediate',
    explanation: `Sometimes ChatGPT confidently states things that are completely wrong. This is called "hallucination" - and it's one of the most important things to understand about AI.

**Why do hallucinations happen?**
• ChatGPT predicts likely words, not facts
• It fills gaps with plausible-sounding information
• It can't say "I don't know" easily - it always generates something
• Training data may have had errors

**Common hallucination types:**
1. **Fake citations:** Invents book titles, research papers, quotes
2. **Wrong facts:** Incorrect dates, statistics, names
3. **Confident nonsense:** Made-up technical explanations
4. **Outdated info:** Treats old information as current

**Red flags to watch for:**
• Very specific statistics or percentages
• Quotes attributed to famous people
• Recent events (after training cutoff)
• Detailed claims about niche topics
• Links or references (ChatGPT can't browse the web)

**The Golden Rule:** Always verify important information from reliable sources!`,
    example: `**Real hallucination example:**

**Prompt:** "Tell me about the famous Indian scientist Dr. Rajesh Kumar who invented the solar calculator."

**ChatGPT might respond:** "Dr. Rajesh Kumar (1945-2012) was a pioneering Indian physicist from IIT Bombay who invented the solar-powered calculator in 1978. His work earned him the Padma Shri in 1985..."

**The problem:** This person and invention are completely made up! ChatGPT generated a believable-sounding response because:
- The name sounds realistic
- The dates seem plausible
- The institutions are real
- The award exists

**This is why fact-checking matters!**`,
    activity: 'Ask ChatGPT for 5 "facts" about your school or hometown. Then verify each one using Google or by asking someone who would know. How many did ChatGPT get right? This exercise shows why verification is essential!',
    quiz: {
      questions: [
        {
          id: 'cg-hall-1',
          type: 'mcq',
          question: 'What is an AI "hallucination"?',
          options: [
            'When the AI shows images',
            'When the AI confidently states incorrect information',
            'When the AI asks for clarification',
            'When the AI refuses to answer'
          ],
          correctAnswer: 1,
          explanation: 'Hallucination is when AI generates confident but incorrect or made-up information.'
        },
        {
          id: 'cg-hall-2',
          type: 'true-false',
          question: 'If ChatGPT provides a specific statistic with a source, it\'s always accurate.',
          correctAnswer: false,
          explanation: 'ChatGPT can hallucinate statistics and even make up fake sources. Always verify important claims.'
        },
        {
          id: 'cg-hall-3',
          type: 'mcq',
          question: 'What should you do with important information from ChatGPT?',
          options: [
            'Trust it completely',
            'Verify it using reliable sources',
            'Assume it\'s wrong',
            'Ask ChatGPT to confirm it'
          ],
          correctAnswer: 1,
          explanation: 'Important information should always be verified using reliable sources like textbooks, official websites, or trusted experts.'
        },
        {
          id: 'cg-hall-4',
          type: 'mcq',
          question: 'Which is most likely to be a hallucination?',
          options: [
            'A general explanation of photosynthesis',
            'A specific quote with date from a lesser-known person',
            'Common historical facts',
            'Basic math calculations'
          ],
          correctAnswer: 1,
          explanation: 'Specific quotes, especially from less famous people, are high-risk for hallucination as ChatGPT may generate plausible-sounding but fake content.'
        }
      ],
      passingScore: 70,
      hints: [
        'Hallucinations are confident mistakes',
        'Specific details can be fabricated',
        'Verification is always important'
      ],
      safeFeedback: {
        pass: 'Great awareness! Knowing about hallucinations makes you a smarter AI user who can catch mistakes.',
        fail: 'Understanding hallucinations is crucial for using AI safely. Review the examples and try again!'
      }
    }
  },
  {
    id: 'chatgpt-responsible-use',
    title: 'Responsible AI Use',
    minutes: 12,
    level: 'intermediate',
    explanation: `Using AI responsibly is like being a good digital citizen. Here's your guide to ethical AI use:

**DO ✅**
• Use AI as a learning helper and thinking partner
• Write assignments in your own words after understanding concepts
• Give credit when AI helped you ("I used ChatGPT to brainstorm ideas")
• Verify facts before using them
• Report inappropriate AI responses
• Ask for explanations, not just answers

**DON'T ❌**
• Copy AI responses as your own work (that's plagiarism)
• Share personal information (address, phone, school name, photos)
• Use AI to create harmful, fake, or misleading content
• Trust everything without checking
• Use AI to do work you should learn yourself
• Try to "jailbreak" AI to bypass safety features

**Why This Matters:**
• Academic integrity: Your school has rules about AI use
• Personal safety: Protect your private information
• Learning: You miss learning opportunities if AI does everything
• Ethics: What you create with AI reflects on you

**Remember:** AI is a powerful tool. Like a calculator helps with math but doesn't make you a mathematician, AI helps with thinking but shouldn't replace YOUR brain!`,
    example: `**Scenario: You have a Hindi essay due tomorrow**

**Wrong approach:**
"ChatGPT, write my essay on 'Mera Priya Tyohaar' (My Favorite Festival)"
Then copy-paste the entire response.

**Right approach:**
1. "ChatGPT, what are some interesting angles I could explore when writing about Diwali?"
2. "What's a good essay structure for Class 9 Hindi?"
3. "I wrote this introduction: [your text]. How can I make it more engaging?"
4. Write the essay yourself using the ideas and feedback
5. At the end: "I brainstormed ideas using ChatGPT, but the essay is written by me"

**The difference:** 
- Wrong: You learn nothing, risk getting caught, violate trust
- Right: You improve your writing, understand the topic better, and maintain integrity`,
    activity: 'Create your own "AI Ethics Pledge" with 5 promises about how you\'ll use AI tools. Share it with a parent or teacher and discuss why each point matters. Consider putting it somewhere you\'ll see it often!',
    quiz: {
      questions: [
        {
          id: 'cg-resp-1',
          type: 'true-false',
          question: 'It\'s okay to use ChatGPT to understand a concept, then write about it in your own words.',
          correctAnswer: true,
          explanation: 'Using AI to learn and understand concepts is perfectly fine! The key is expressing that understanding in your own words.'
        },
        {
          id: 'cg-resp-2',
          type: 'mcq',
          question: 'Should you share your home address with ChatGPT?',
          options: [
            'Yes, it needs to know for better responses',
            'Only if it asks politely',
            'No, never share personal information with AI',
            'Only for delivery-related questions'
          ],
          correctAnswer: 2,
          explanation: 'Never share personal information like addresses, phone numbers, or school names with any AI system.'
        },
        {
          id: 'cg-resp-3',
          type: 'mcq',
          question: 'When ChatGPT helps with an assignment, you should:',
          options: [
            'Pretend you did everything yourself',
            'Be honest about AI assistance when appropriate',
            'Delete the chat so no one knows',
            'Use a different account next time'
          ],
          correctAnswer: 1,
          explanation: 'Academic honesty is important. If your school allows AI assistance, be transparent about how you used it.'
        },
        {
          id: 'cg-resp-4',
          type: 'mcq',
          question: 'What\'s the best way to use AI for a school project?',
          options: [
            'Generate the entire project with AI',
            'Use AI to learn and brainstorm, then create your own work',
            'Never use AI at all',
            'Use AI and change a few words'
          ],
          correctAnswer: 1,
          explanation: 'AI is best used as a learning tool and brainstorming partner. Your final work should be your own creation.'
        }
      ],
      passingScore: 70,
      hints: [
        'Think about what\'s fair to classmates and teachers',
        'Personal information should stay private',
        'Learning happens when YOU do the thinking'
      ],
      safeFeedback: {
        pass: 'You\'re ready to use AI ethically and responsibly. These principles will serve you well throughout your life!',
        fail: 'Ethics in AI use is very important. Review the guidelines about what to do and not do with AI.'
      }
    }
  },
  {
    id: 'chatgpt-practical-uses',
    title: 'Practical Uses for Students',
    minutes: 15,
    level: 'intermediate',
    explanation: `Let's explore real ways ChatGPT can help with school and hobbies - without doing your work for you!

**Study Help:**
• **Concept explanations:** "Explain quadratic equations like I'm watching a cricket match"
• **Study guides:** "Create a revision checklist for Class 10 Science Chapter 3"
• **Doubt clearing:** "I don't understand why water expands when frozen. Can you explain?"
• **Memory tricks:** "Give me a mnemonic to remember the planets in order"

**Writing Assistance:**
• **Brainstorming:** "What are 10 unique essay topics about technology in India?"
• **Structure:** "What's a good outline for a debate on online education?"
• **Feedback:** "Review my introduction and suggest improvements: [your text]"
• **Grammar:** "Is this sentence correct? 'The students was going...'"

**Creative Projects:**
• **Story ideas:** "Suggest plot twists for a mystery story set in Mumbai"
• **Script help:** "Help me write dialogue for a school play about time travel"
• **Presentation:** "What are engaging ways to present about climate change?"

**Skill Building:**
• **Language practice:** "Chat with me in French about my hobbies"
• **Interview prep:** "Ask me practice questions for school captain election"
• **Problem-solving:** "Walk me through how to approach this math word problem"`,
    example: `**Real student scenario: Preparing for a debate competition**

**Step 1 - Topic research:**
"I'm debating 'Social media does more harm than good for teenagers.' What are the strongest arguments for both sides?"

**Step 2 - Structure:**
"Create a 3-minute debate speech outline with intro, 3 main points, and conclusion"

**Step 3 - Counter-arguments:**
"What might the opposing team argue, and how can I respond?"

**Step 4 - Practice:**
"Act as my debate opponent and challenge my points. I'll defend my position."

**Step 5 - Polish:**
"Here's my opening line: [your text]. How can I make it more attention-grabbing?"

**Result:** You're well-prepared, you understand both sides, and everything is in YOUR words!`,
    activity: 'Pick something you\'re working on (homework, hobby, or interest). Use ChatGPT as a study buddy in 3 different ways: ask for an explanation, get feedback on something you created, and brainstorm new ideas. Notice which approach helps most!',
    quiz: {
      questions: [
        {
          id: 'cg-prac-1',
          type: 'mcq',
          question: 'Which is a good way to use ChatGPT for an essay?',
          options: [
            'Ask it to write the entire essay',
            'Get topic ideas and feedback, write the essay yourself',
            'Copy one paragraph and write one yourself',
            'Use it only for the conclusion'
          ],
          correctAnswer: 1,
          explanation: 'ChatGPT is best used for brainstorming and feedback while you do the actual writing to learn and improve.'
        },
        {
          id: 'cg-prac-2',
          type: 'true-false',
          question: 'ChatGPT can help you practice for debates by acting as your opponent.',
          correctAnswer: true,
          explanation: 'Yes! ChatGPT can roleplay as a debate opponent, helping you prepare counter-arguments and strengthen your position.'
        },
        {
          id: 'cg-prac-3',
          type: 'mcq',
          question: 'How can ChatGPT help with learning a new language?',
          options: [
            'It cannot help with languages',
            'Practice conversations, vocabulary, and grammar explanations',
            'Only by translating',
            'Only by correcting spelling'
          ],
          correctAnswer: 1,
          explanation: 'ChatGPT can engage in practice conversations, explain grammar, help with vocabulary, and provide translation - all useful for language learning.'
        },
        {
          id: 'cg-prac-4',
          type: 'mcq',
          question: 'When using ChatGPT to explain a concept you don\'t understand, you should:',
          options: [
            'Accept the first explanation',
            'Ask follow-up questions until you truly understand',
            'Copy the explanation for your notes',
            'Move on to a different topic'
          ],
          correctAnswer: 1,
          explanation: 'The best learning happens when you ask follow-up questions and ensure you truly understand, not just get an answer.'
        }
      ],
      passingScore: 70,
      hints: [
        'AI helps you learn, not replaces learning',
        'Creative uses include practice and roleplay',
        'Understanding comes from asking questions'
      ],
      safeFeedback: {
        pass: 'You\'ve got great ideas for using AI productively! These skills will help you learn more effectively.',
        fail: 'There are so many good ways to use AI for learning. Review the practical examples and try again!'
      }
    }
  },
  {
    id: 'chatgpt-technical-deep-dive',
    title: 'Technical Deep Dive',
    minutes: 20,
    level: 'advanced',
    explanation: `Ready for some behind-the-scenes AI knowledge? This module is optional but great for curious minds!

**Transformer Architecture:**
ChatGPT uses a "Transformer" - a type of neural network invented in 2017. The key innovation is "attention" - the ability to focus on relevant parts of input.

When you ask "What did the cat do?" after saying "The cat sat on the mat," the transformer's attention mechanism connects "cat" to "sat" across the sentence.

**Temperature & Sampling:**
"Temperature" controls how creative vs predictable the AI is:
• Low (0.1-0.3): Very consistent, predictable responses
• Medium (0.5-0.7): Balanced creativity and accuracy
• High (0.8-1.0): More creative, sometimes unexpected

**Reinforcement Learning from Human Feedback (RLHF):**
ChatGPT was trained in stages:
1. Pre-training on massive text data
2. Fine-tuning with human demonstrations
3. RLHF: Humans ranked responses, AI learned preferences

**Tokenization Details:**
Different tokenizers break text differently:
• "Namaste" might be 2 tokens: "Nam" + "aste"
• Rare words get split into more tokens
• Code and special characters use more tokens

**Model Sizes:**
• GPT-3: ~175 billion parameters
• GPT-4: Estimated 100+ billion parameters (exact number not public)
• More parameters generally = more capable but slower`,
    example: `**Understanding Attention with an example:**

Sentence: "The trophy didn't fit in the suitcase because it was too big."

What does "it" refer to? The trophy or the suitcase?

**Human brain:** Instantly connects "it" to "trophy" (because "too big" makes sense for trophy not fitting)

**Transformer attention:** 
1. Calculates "attention scores" between "it" and every other word
2. Highest attention between "it" and "trophy"
3. Uses this to understand "it" refers to the trophy

This "attention" mechanism is why transformers are so good at understanding context!

**Temperature in action:**
Prompt: "Write a creative opening line for a story"

Temperature 0.2: "The sun rose over the mountains as Sarah began her journey."
Temperature 0.9: "The clouds tasted like forgotten birthday cake that Tuesday when I discovered I could fly."

Low temperature = safe and predictable
High temperature = creative but sometimes weird!`,
    activity: 'If you have access to ChatGPT settings or the API, try the same prompt with different temperatures. Or ask ChatGPT: "Explain the transformer architecture in simple terms. Then explain it again but more technically." Notice how it adjusts the complexity!',
    quiz: {
      questions: [
        {
          id: 'cg-tech-1',
          type: 'mcq',
          question: 'What is the key innovation in Transformer architecture?',
          options: [
            'Speed of processing',
            'The attention mechanism',
            'Smaller file size',
            'Internet connectivity'
          ],
          correctAnswer: 1,
          explanation: 'The attention mechanism allows transformers to focus on relevant parts of input, understanding context better than previous approaches.'
        },
        {
          id: 'cg-tech-2',
          type: 'mcq',
          question: 'What does "temperature" control in AI responses?',
          options: [
            'Speed of generation',
            'Length of response',
            'Creativity vs predictability',
            'Language complexity'
          ],
          correctAnswer: 2,
          explanation: 'Temperature controls how random/creative the outputs are. Low = predictable, High = creative and varied.'
        },
        {
          id: 'cg-tech-3',
          type: 'true-false',
          question: 'RLHF stands for Reinforcement Learning from Human Feedback.',
          correctAnswer: true,
          explanation: 'Yes! RLHF is a training technique where human feedback helps the AI learn to give better, safer responses.'
        },
        {
          id: 'cg-tech-4',
          type: 'mcq',
          question: 'Why might a rare word use more tokens?',
          options: [
            'Rare words are harder to understand',
            'The tokenizer splits unfamiliar words into smaller pieces',
            'Rare words need more computing power',
            'Token limits increase for rare words'
          ],
          correctAnswer: 1,
          explanation: 'Tokenizers are trained on common text. Rare or unusual words get split into more pieces (subword tokens) because they weren\'t common in training data.'
        }
      ],
      passingScore: 70,
      hints: [
        'Attention helps AI focus on what matters',
        'Temperature is like a creativity dial',
        'Human feedback shaped ChatGPT\'s behavior'
      ],
      safeFeedback: {
        pass: 'Impressive! You now have deeper technical knowledge about how AI works. This understanding sets you apart!',
        fail: 'These technical concepts take time. Review the attention mechanism and temperature concepts, then try again!'
      }
    }
  }
];

// ============================================
// CLAUDE JOURNEY (5 Modules)
// ============================================

const claudeJourney = [
  {
    id: 'claude-intro',
    title: 'Meet Claude',
    minutes: 10,
    level: 'beginner',
    explanation: `Claude is an AI assistant created by Anthropic, a company focused on AI safety. What makes Claude special?

**Anthropic's Philosophy - The Three H's:**
• **Helpful:** Genuinely tries to assist you effectively
• **Harmless:** Designed to avoid causing harm
• **Honest:** Admits when it doesn't know something

**How is Claude different from ChatGPT?**
• More cautious with sensitive topics
• Often more nuanced responses
• Tends to acknowledge uncertainty more
• Strong focus on being truthful
• Excellent at following complex instructions

**Claude's Personality:**
Claude is designed to be thoughtful and careful. If you ask about something sensitive, it might say: "I want to be helpful, but I also want to be careful here. Let me explain what I can share..."

**Fun fact:** Claude is named after Claude Shannon, the "father of information theory" who pioneered the math behind digital communication!`,
    example: `**Comparing responses:**

**You ask about a controversial topic:**

**ChatGPT might:** Give a balanced overview and let you decide

**Claude might:** Say "This is a topic where reasonable people disagree. Here's what I can share factually... but I'd encourage you to explore multiple perspectives and form your own view."

**You ask Claude to help with homework:**

"I'd be happy to help you understand this topic! Let me explain the concept first, and then you can try solving it yourself. If you get stuck, I'm here to help with hints rather than just giving the answer."

Claude's approach emphasizes learning over just getting answers!`,
    activity: 'If you have access to both Claude and ChatGPT, ask them the same question and compare responses. Notice how Claude might be more cautious or add more caveats. What differences do you observe?',
    quiz: {
      questions: [
        {
          id: 'cl-intro-1',
          type: 'mcq',
          question: 'What company created Claude?',
          options: ['OpenAI', 'Google', 'Anthropic', 'Meta'],
          correctAnswer: 2,
          explanation: 'Anthropic, an AI safety company founded in 2021, created Claude.'
        },
        {
          id: 'cl-intro-2',
          type: 'mcq',
          question: 'What are Anthropic\'s three H\'s for Claude?',
          options: [
            'Happy, Helpful, Humble',
            'Helpful, Harmless, Honest',
            'Human, Helpful, Hopeful',
            'Honest, Humble, Hardworking'
          ],
          correctAnswer: 1,
          explanation: 'Anthropic designed Claude to be Helpful, Harmless, and Honest - these are their core principles.'
        },
        {
          id: 'cl-intro-3',
          type: 'true-false',
          question: 'Claude is designed to always give a definitive answer even when uncertain.',
          correctAnswer: false,
          explanation: 'Claude is designed to be honest about uncertainty, often acknowledging when it doesn\'t know something or when multiple perspectives exist.'
        }
      ],
      passingScore: 70,
      hints: [
        'Think about AI safety-focused companies',
        'The three H\'s are core to Claude\'s design',
        'Honesty includes admitting uncertainty'
      ],
      safeFeedback: {
        pass: 'Great job! You understand what makes Claude unique among AI assistants.',
        fail: 'Review Claude\'s design principles - the three H\'s are key to understanding this AI!'
      }
    }
  },
  {
    id: 'claude-writing',
    title: 'Writing with Claude',
    minutes: 12,
    level: 'beginner',
    explanation: `Claude excels at helping with writing tasks! Here's how to use it effectively:

**Best Uses for Writing:**
• Brainstorming essay topics and angles
• Creating outlines and structures
• Getting feedback on your drafts
• Understanding different writing styles
• Learning grammar and vocabulary

**Claude's Writing Workflow:**

1. **Explore the topic:** "What are interesting angles for writing about renewable energy in India?"

2. **Get structure:** "Create an outline for a 500-word persuasive essay on this topic"

3. **Write yourself** (this is the important part!)

4. **Get feedback:** "Review my essay and suggest 3 specific improvements"

5. **Polish:** "Is this sentence grammatically correct: [your sentence]?"

**Claude as Writing Coach:**
Ask Claude to act as a writing coach rather than a writer:
"Be my writing coach. Don't write for me, but guide me through improving my essay. Ask me questions and give feedback."`,
    example: `**Student writing a letter for Model UN application:**

**Step 1 - Brainstorm:**
"I'm applying for Model UN at my school. What should I include in my application letter?"

**Claude:** "Great initiative! For a Model UN application, consider including:
- Your interest in international affairs
- Any relevant experience (debates, public speaking)
- Countries/issues you'd like to represent
- What skills you want to develop..."

**Step 2 - Get structure:**
"Help me organize this into a professional letter format"

**Step 3 - Write it yourself**

**Step 4 - Get feedback:**
"Here's my draft. What could make it stronger?"

**Claude:** "Your draft is a good start! I notice:
1. The opening is a bit generic - could you start with something more memorable?
2. You mention teamwork but don't give an example
3. The closing could be more confident..."

**Result:** YOUR letter, but refined with helpful guidance!`,
    activity: 'Write a 100-word paragraph about your favorite hobby. Then share it with Claude and ask: "What are 3 specific ways I could make this more engaging?" Apply the feedback and compare the versions!',
    quiz: {
      questions: [
        {
          id: 'cl-write-1',
          type: 'mcq',
          question: 'What\'s the best first step when using Claude for an essay?',
          options: [
            'Ask Claude to write the whole thing',
            'Get topic ideas and brainstorm',
            'Skip to proofreading',
            'Only use it for the conclusion'
          ],
          correctAnswer: 1,
          explanation: 'Start with brainstorming and exploring angles - let Claude help you think, not replace your thinking.'
        },
        {
          id: 'cl-write-2',
          type: 'true-false',
          question: 'Asking Claude to be a "writing coach" helps you learn more than asking it to write for you.',
          correctAnswer: true,
          explanation: 'When Claude coaches you with questions and feedback, you develop your writing skills. Direct writing doesn\'t help you improve.'
        },
        {
          id: 'cl-write-3',
          type: 'mcq',
          question: 'What should you share with Claude for the best feedback?',
          options: [
            'Just the topic',
            'Your actual draft or specific sentences',
            'Only questions',
            'Just the title'
          ],
          correctAnswer: 1,
          explanation: 'Sharing your actual work allows Claude to give specific, actionable feedback on your writing.'
        }
      ],
      passingScore: 70,
      hints: [
        'Brainstorming comes before writing',
        'Coaching develops skills better than doing',
        'Specific input gets specific feedback'
      ],
      safeFeedback: {
        pass: 'You know how to use Claude as a writing partner! These skills will improve your writing over time.',
        fail: 'Remember: Claude is best as a coach and helper, not a ghostwriter. Review the workflow!'
      }
    }
  },
  {
    id: 'claude-analysis',
    title: 'Analysis & Research',
    minutes: 12,
    level: 'intermediate',
    explanation: `Claude is excellent at breaking down complex information. Here's how to use it for research and analysis:

**Strong Analysis Uses:**
• Summarizing long articles or chapters
• Explaining complex concepts simply
• Comparing different viewpoints
• Finding patterns in information
• Breaking down arguments logically

**Effective Analysis Prompts:**

1. **Summarize:** "Summarize this chapter in 5 bullet points"

2. **Explain:** "Explain the causes of inflation like I'm in Class 9"

3. **Compare:** "Compare parliamentary and presidential systems - give me a table format"

4. **Analyze:** "What are the main arguments in this paragraph? Are they strong or weak?"

5. **Question:** "What questions should I ask to understand this topic better?"

**Claude's Analysis Strengths:**
• Good at seeing multiple sides of issues
• Carefully separates facts from opinions
• Acknowledges complexity rather than oversimplifying
• Helps you think critically about sources`,
    example: `**Student researching for a project on Indian economy:**

**Request:** "I found this news article about India's GDP growth. Can you help me analyze it?"

**Claude's analysis:**
"I'd be happy to help you analyze this! Let me break it down:

**Main claims:**
1. GDP grew by X% this quarter
2. Manufacturing was the main driver
3. Experts predict continued growth

**Questions to consider:**
- What time period is this comparing to?
- Which sectors weren't mentioned?
- Who are the 'experts' cited?

**What's strong:**
- Uses official government data
- Provides specific numbers

**What to verify:**
- Check if other sources report similar figures
- Look for opposing viewpoints

Would you like me to help you understand any of these points further?"`,
    activity: 'Find a news article about something you\'re interested in. Share 2-3 paragraphs with Claude and ask: "Help me analyze this critically. What are the main claims, and what should I verify?" Notice how Claude helps you think deeper!',
    quiz: {
      questions: [
        {
          id: 'cl-ana-1',
          type: 'mcq',
          question: 'What\'s a good way to use Claude for understanding a complex topic?',
          options: [
            'Ask for the answer to memorize',
            'Request an explanation at your level plus follow-up questions',
            'Just read Claude\'s first response',
            'Skip the explanation and ask for a summary'
          ],
          correctAnswer: 1,
          explanation: 'Asking for explanations at your level and follow-up questions helps you truly understand, not just memorize.'
        },
        {
          id: 'cl-ana-2',
          type: 'true-false',
          question: 'Claude can help you analyze arguments by separating facts from opinions.',
          correctAnswer: true,
          explanation: 'Yes! Claude is good at identifying what\'s factual versus what\'s opinion or interpretation in an argument.'
        },
        {
          id: 'cl-ana-3',
          type: 'mcq',
          question: 'When Claude analyzes information, you should still:',
          options: [
            'Accept everything as true',
            'Verify important claims from other sources',
            'Ignore the analysis',
            'Only trust Claude\'s opinion'
          ],
          correctAnswer: 1,
          explanation: 'Even good analysis should be verified. Claude helps you think critically, but verification is still your job.'
        }
      ],
      passingScore: 70,
      hints: [
        'Understanding > memorizing',
        'Facts and opinions are different things',
        'Always verify important information'
      ],
      safeFeedback: {
        pass: 'Excellent! You can use Claude effectively for research and critical thinking.',
        fail: 'Analysis is about thinking deeper, not just getting summaries. Review the approaches!'
      }
    }
  },
  {
    id: 'claude-safety',
    title: 'Claude\'s Safety Features',
    minutes: 10,
    level: 'intermediate',
    explanation: `Anthropic built Claude with strong safety features. Understanding these helps you use it better:

**Constitutional AI:**
Claude was trained using "Constitutional AI" - a set of principles it tries to follow:
• Be helpful but avoid harm
• Be honest about limitations
• Refuse harmful requests politely
• Consider multiple perspectives
• Protect user privacy

**What Claude Won't Do:**
• Help create harmful content
• Pretend to be human when directly asked
• Give dangerous instructions
• Encourage illegal activities
• Share others' private information

**How Claude Handles Difficult Topics:**
Instead of refusing bluntly, Claude often:
• Explains why it can't help with something
• Offers alternative approaches
• Provides educational context
• Suggests speaking to trusted adults or experts

**Why Safety Matters:**
These features protect you and others. An AI without safety measures could be misused. Claude's careful approach means it's a trustworthy learning companion.`,
    example: `**How Claude handles sensitive requests:**

**User:** "How can I cheat on my exam?"

**Claude's approach:**
"I understand exams can be stressful, but I can't help with cheating - it wouldn't be fair to classmates who studied, and you'd miss the learning.

Instead, I can help you:
- Create a study schedule for the time you have
- Explain difficult concepts
- Make practice questions
- Share memory techniques

Would any of these help? What subject is the exam in?"

**Notice:** Claude:
✓ Doesn't lecture or shame
✓ Explains the reasoning
✓ Offers helpful alternatives
✓ Stays supportive`,
    activity: 'Have a conversation with Claude about a topic you find difficult or sensitive (like peer pressure or exam stress). Notice how Claude responds thoughtfully and offers support while maintaining appropriate boundaries.',
    quiz: {
      questions: [
        {
          id: 'cl-safe-1',
          type: 'mcq',
          question: 'What is "Constitutional AI"?',
          options: [
            'AI that follows government laws',
            'A set of principles guiding Claude\'s behavior',
            'AI that writes legal documents',
            'A type of programming language'
          ],
          correctAnswer: 1,
          explanation: 'Constitutional AI refers to the principles Anthropic built into Claude to guide its responses toward being helpful, harmless, and honest.'
        },
        {
          id: 'cl-safe-2',
          type: 'true-false',
          question: 'When Claude can\'t help with something, it usually just says "I can\'t" without explanation.',
          correctAnswer: false,
          explanation: 'Claude typically explains why it can\'t help and offers alternative approaches or resources.'
        },
        {
          id: 'cl-safe-3',
          type: 'mcq',
          question: 'Why are safety features important in AI?',
          options: [
            'They make AI slower',
            'They prevent misuse and protect users',
            'They\'re not important',
            'They only matter for adults'
          ],
          correctAnswer: 1,
          explanation: 'Safety features prevent AI from being misused for harmful purposes and protect all users, including teens.'
        }
      ],
      passingScore: 70,
      hints: [
        'Constitutional AI = guiding principles',
        'Claude explains, doesn\'t just refuse',
        'Safety protects everyone'
      ],
      safeFeedback: {
        pass: 'Great understanding of AI safety! This knowledge helps you be a responsible AI user.',
        fail: 'AI safety is important for everyone. Review how Claude\'s safety features protect users.'
      }
    }
  },
  {
    id: 'claude-creative',
    title: 'Creative Projects with Claude',
    minutes: 15,
    level: 'intermediate',
    explanation: `Claude is a great creative collaborator! Here's how to use it for creative projects:

**Creative Uses:**
• Story writing and plot development
• Script and dialogue creation
• Poetry and song lyrics
• Character development
• World-building for fiction
• Creative problem-solving

**Collaboration Techniques:**

1. **Brainstorm Together:**
   "I want to write a mystery story set in my school. What are some unexpected plot twists?"

2. **Build on Ideas:**
   "I like the idea of [your concept]. How could I make it more interesting?"

3. **Get Unstuck:**
   "My character needs to escape from [situation]. What are creative ways this could happen?"

4. **Polish Your Work:**
   "Here's my poem. Does the rhythm feel right? Any words I could improve?"

**Important:** Keep your creative voice!
• Use Claude for inspiration, not replacement
• Mix Claude's ideas with your own
• The final creation should feel like yours
• Give credit if Claude significantly helped`,
    example: `**Creating a script for a school drama:**

**Student:** "I'm writing a 5-minute play about climate change for my school's environment day. I want it to be funny but also meaningful."

**Claude:** "What a great project! Here are some approaches:

**Option 1 - Time Traveler:** A student from 2050 visits today's classroom and is shocked by things we take for granted.

**Option 2 - Object POV:** The plastic bottle's journey from manufacture to ocean - told by the bottle itself.

**Option 3 - Role Reversal:** Animals hold a 'human zoo' and discuss strange human behaviors.

Which appeals to you? I can help develop dialogue once you pick a direction!"

**Student picks Option 2**

**Claude:** "Great choice! Let me help you outline:
- Scene 1: Birth in factory (proud to be made)
- Scene 2: Purchased and used (purpose fulfilled!)
- Scene 3: Thrown away (confused - 'Is that it?')
- Scene 4: Ocean journey (realization and regret)

What tone do you want for each scene? We can write dialogue together!"`,
    activity: 'Start a creative project with Claude: a short story, poem, or script. Begin with your own idea, then ask Claude for suggestions to improve it. Add your own twists to Claude\'s suggestions. Create something uniquely yours!',
    quiz: {
      questions: [
        {
          id: 'cl-create-1',
          type: 'mcq',
          question: 'What\'s the best way to use Claude for creative writing?',
          options: [
            'Ask Claude to write the whole thing',
            'Collaborate and build on each other\'s ideas',
            'Never use AI for creativity',
            'Only use it for spell-check'
          ],
          correctAnswer: 1,
          explanation: 'Collaboration is key - use Claude for brainstorming and feedback while keeping your creative voice central.'
        },
        {
          id: 'cl-create-2',
          type: 'true-false',
          question: 'When Claude gives creative suggestions, you should add your own twists to make them unique.',
          correctAnswer: true,
          explanation: 'Yes! The best creative work combines Claude\'s suggestions with your own ideas and perspective.'
        },
        {
          id: 'cl-create-3',
          type: 'mcq',
          question: 'If you\'re stuck on a creative project, what should you ask Claude?',
          options: [
            '"Finish this for me"',
            '"Give me ideas for how to continue" or "What if..." questions',
            '"Is this good?"',
            '"What would a famous author write?"'
          ],
          correctAnswer: 1,
          explanation: 'Asking for possibilities and "what if" scenarios helps you get unstuck while staying in the creative driver\'s seat.'
        }
      ],
      passingScore: 70,
      hints: [
        'Collaboration > automation',
        'Your voice matters most',
        'Ideas are starting points'
      ],
      safeFeedback: {
        pass: 'You\'re ready to use Claude as a creative partner! Remember to always add your unique perspective.',
        fail: 'Creative collaboration is about partnership. Review how to brainstorm and build on ideas together!'
      }
    }
  }
];

// ============================================
// GEMINI JOURNEY (5 Modules)
// ============================================

const geminiJourney = [
  {
    id: 'gemini-intro',
    title: 'Meet Gemini',
    minutes: 10,
    level: 'beginner',
    explanation: `Gemini is Google's most advanced AI system. What makes it special?

**Multimodal Abilities:**
Unlike earlier AI that only worked with text, Gemini can understand:
• Text (like ChatGPT)
• Images (photos, diagrams, charts)
• Code (multiple programming languages)
• Audio and video (in some versions)

**Gemini Family:**
• **Gemini Ultra:** Most powerful, complex tasks
• **Gemini Pro:** Balanced for everyday use
• **Gemini Nano:** Runs on phones, fast and efficient

**Where You'll Find Gemini:**
• Google Search (AI-generated summaries)
• Google Docs ("Help me write")
• Gmail (draft suggestions)
• Google Photos (search and organize)
• Pixel phones (built-in AI features)

**Google's Advantage:**
Gemini can integrate with Google services you might already use - Drive, Calendar, YouTube, Maps - creating a connected AI experience.`,
    example: `**Gemini's multimodal abilities in action:**

**Scenario 1 - Homework help:**
Take a photo of a math problem from your textbook. Gemini can see the equation and help you solve it step by step!

**Scenario 2 - Understanding diagrams:**
Screenshot a complex biology diagram of the human heart. Ask "What does this diagram show? Explain each part."

**Scenario 3 - Google Docs:**
While writing an essay in Google Docs, click "Help me write" and say:
"Add a paragraph about the environmental impact of plastic"
Gemini generates text right in your document!

**Scenario 4 - Photo organization:**
In Google Photos, search "pictures of my project work" - Gemini understands what's in your photos and finds relevant ones.`,
    activity: 'If you use any Google products, look for AI features! In Google Docs, try "Help me write." In Google Search, notice the AI-generated summaries. In Google Photos, try searching for objects in your photos.',
    quiz: {
      questions: [
        {
          id: 'gem-intro-1',
          type: 'mcq',
          question: 'What does "multimodal" mean for Gemini?',
          options: [
            'It has multiple subscription modes',
            'It can understand different types of content (text, images, audio)',
            'It works in multiple languages only',
            'It can run on multiple devices simultaneously'
          ],
          correctAnswer: 1,
          explanation: 'Multimodal means Gemini can process and understand multiple types of input: text, images, code, and more.'
        },
        {
          id: 'gem-intro-2',
          type: 'mcq',
          question: 'Which company created Gemini?',
          options: ['OpenAI', 'Microsoft', 'Google', 'Apple'],
          correctAnswer: 2,
          explanation: 'Google DeepMind created Gemini as Google\'s most advanced AI system.'
        },
        {
          id: 'gem-intro-3',
          type: 'true-false',
          question: 'Gemini is only available as a standalone app.',
          correctAnswer: false,
          explanation: 'Gemini is integrated into many Google products including Search, Docs, Gmail, and more.'
        }
      ],
      passingScore: 70,
      hints: [
        'Multi = many, modal = types/ways',
        'Think about major tech companies',
        'Google integrates AI across products'
      ],
      safeFeedback: {
        pass: 'You understand what makes Gemini unique! Its multimodal abilities open up new possibilities.',
        fail: 'Review what makes Gemini different - its ability to understand multiple types of content is key!'
      }
    }
  },
  {
    id: 'gemini-visual',
    title: 'Visual Understanding',
    minutes: 12,
    level: 'beginner',
    explanation: `One of Gemini's superpowers is understanding images! Here's how to use it:

**What Gemini Can Do With Images:**
• Describe what's in a photo
• Read and explain diagrams
• Analyze charts and graphs
• Extract text from images (OCR)
• Identify objects, places, animals
• Answer questions about visual content

**Great Uses for Students:**

1. **Diagram Explanations:**
   Upload a science diagram and ask "Explain this diagram step by step"

2. **Math Problem Photos:**
   Take a photo of a textbook problem and ask for help solving it

3. **Chart Analysis:**
   Share a graph and ask "What does this data show? What trends do you notice?"

4. **Note Organization:**
   Take photos of handwritten notes and ask Gemini to organize them

5. **Visual Learning:**
   "Looking at this image of a cell, quiz me on the parts"`,
    example: `**Student using Gemini for biology homework:**

**Step 1:** Takes photo of a complex cell diagram from textbook

**Step 2:** Uploads to Gemini with prompt:
"Here's a diagram of an animal cell. Can you:
1. Label all the parts you can identify
2. Explain what each part does
3. Point out what makes this an animal cell vs plant cell"

**Gemini's response:**
"I can see this is an animal cell diagram. Let me identify the parts:

**Nucleus** (the large circular structure in center) - Contains DNA, controls cell activities
**Mitochondria** (the oval shapes) - Produces energy for the cell
**Cell membrane** (the outer boundary) - Controls what enters and leaves
...

This is an animal cell because:
- No cell wall (plant cells have one)
- No chloroplasts (plant cells have these for photosynthesis)
- Smaller vacuoles (plant cells have one large one)

Would you like me to quiz you on these parts?"`,
    activity: 'Find a complex diagram from your textbook (science, geography, or any subject). Share it with Gemini and ask for an explanation. Then ask follow-up questions about anything you don\'t understand!',
    quiz: {
      questions: [
        {
          id: 'gem-vis-1',
          type: 'mcq',
          question: 'What can Gemini do with an image of a chart?',
          options: [
            'Only save it',
            'Analyze data, identify trends, and answer questions about it',
            'Just change the colors',
            'Only identify if it\'s a chart'
          ],
          correctAnswer: 1,
          explanation: 'Gemini can analyze charts and graphs, identify trends, and answer questions about the data shown.'
        },
        {
          id: 'gem-vis-2',
          type: 'true-false',
          question: 'You can take a photo of a textbook problem and ask Gemini for help.',
          correctAnswer: true,
          explanation: 'Yes! Gemini\'s visual capabilities let you share photos of problems from books and get help understanding them.'
        },
        {
          id: 'gem-vis-3',
          type: 'mcq',
          question: 'How can visual AI help with studying?',
          options: [
            'By replacing the need to read',
            'By explaining diagrams, solving photo-shared problems, and analyzing charts',
            'Only by taking notes',
            'It can\'t help with studying'
          ],
          correctAnswer: 1,
          explanation: 'Visual AI can explain complex diagrams, help with photographed problems, and analyze visual data - all useful for studying.'
        }
      ],
      passingScore: 70,
      hints: [
        'AI can analyze visual data',
        'Photos are a valid input method',
        'Visual + text understanding = powerful tool'
      ],
      safeFeedback: {
        pass: 'You\'re ready to use visual AI for learning! This skill opens up new ways to study.',
        fail: 'Visual AI is a powerful learning tool. Review how you can use images as input!'
      }
    }
  },
  {
    id: 'gemini-google-ecosystem',
    title: 'Gemini in Google Apps',
    minutes: 12,
    level: 'intermediate',
    explanation: `Gemini is integrated throughout Google's apps. Here's how to use it:

**Google Docs - "Help me write":**
• Generate first drafts
• Improve existing text
• Change tone (formal/casual)
• Summarize long documents
• Brainstorm ideas

**Gmail - Smart Compose & Reply:**
• Suggests how to complete sentences
• Offers quick reply options
• Can help draft longer emails
• Summarizes long email threads

**Google Search - AI Overview:**
• Get summaries for complex questions
• See AI-generated answers at the top
• Follow up with related questions
• Still provides regular search results

**Google Slides:**
• Generate images for presentations
• Help with slide text
• Suggest layouts

**Google Sheets:**
• Help with formulas
• Analyze data patterns
• Create visualizations`,
    example: `**Student preparing a presentation on Indian Independence:**

**In Google Docs:**
"Help me write an outline for a 10-minute presentation about the Indian Independence movement, covering 1857-1947"

**Gemini generates:**
- Intro: Why independence matters
- Section 1: First War of Independence (1857)
- Section 2: Rise of Indian National Congress
- Section 3: Gandhi's Non-Violent Movement
- Section 4: Final Years (1942-1947)
- Conclusion: Legacy and significance

**In Google Slides:**
"Generate an image of a peaceful protest during the Indian Independence movement"
(Note: Always verify AI-generated historical images aren't misleading)

**In Google Search:**
"Who were the key leaders of Indian independence?"
→ AI Overview shows summary + you can ask follow-up questions!

**Result:** Multiple Google tools working together to help your project!`,
    activity: 'Open Google Docs and try the "Help me write" feature. Ask it to write a short paragraph about your favorite subject. Then ask it to make the same content more formal, then more casual. See how the tone changes!',
    quiz: {
      questions: [
        {
          id: 'gem-eco-1',
          type: 'mcq',
          question: 'What is the "Help me write" feature in Google Docs?',
          options: [
            'A spell checker',
            'An AI writing assistant powered by Gemini',
            'A dictionary feature',
            'A voice typing tool'
          ],
          correctAnswer: 1,
          explanation: '"Help me write" is Gemini-powered AI that can generate, improve, and modify text in Google Docs.'
        },
        {
          id: 'gem-eco-2',
          type: 'true-false',
          question: 'Google Search now shows AI-generated summaries for some queries.',
          correctAnswer: true,
          explanation: 'Yes! Google Search now includes "AI Overviews" that summarize information from multiple sources.'
        },
        {
          id: 'gem-eco-3',
          type: 'mcq',
          question: 'What\'s the benefit of Gemini being in multiple Google apps?',
          options: [
            'It\'s confusing',
            'The same AI helps across different tasks seamlessly',
            'You have to pay more',
            'It only works when all apps are open'
          ],
          correctAnswer: 1,
          explanation: 'Integration means you can use familiar AI assistance across all your work - docs, email, search, and more.'
        }
      ],
      passingScore: 70,
      hints: [
        'Google Docs has built-in AI',
        'Search has evolved with AI',
        'Integration means convenience'
      ],
      safeFeedback: {
        pass: 'You can navigate AI features across Google\'s ecosystem! This helps you work more efficiently.',
        fail: 'Google\'s integrated AI can help in many ways. Review where you can find Gemini across Google apps!'
      }
    }
  },
  {
    id: 'gemini-code',
    title: 'Coding with Gemini',
    minutes: 15,
    level: 'intermediate',
    explanation: `Gemini is excellent at understanding and helping with code! Even if you're just starting to learn programming:

**What Gemini Can Help With:**
• Explain code line by line
• Find and fix errors (debugging)
• Write simple programs
• Translate between programming languages
• Suggest improvements
• Answer coding questions

**Beginner-Friendly Uses:**

1. **Understanding existing code:**
   "Explain this Python code step by step: [paste code]"

2. **Learning concepts:**
   "What is a variable in programming? Give me a simple example in Python"

3. **Debugging help:**
   "My code gives an error: [paste error]. What's wrong?"

4. **Building simple projects:**
   "How would I make a simple calculator program in Python?"

**Why This Matters:**
Coding is becoming essential in many fields. Using AI to learn programming is like having a patient tutor who can explain things multiple ways until you understand!`,
    example: `**Student learning Python:**

**Student:** "I wrote this code but it's not working:

print("What's your name?")
name = input
print("Hello" + name)

Can you help?"

**Gemini:**
"I can see a couple of issues! Let me explain:

**Line 2 Problem:**
You wrote \`name = input\` but you need \`name = input()\`

The parentheses () are important because:
- \`input\` = the function itself
- \`input()\` = calling the function to get user's input

**Line 3 Problem:**
\`"Hello" + name\` will work, but add a space: \`"Hello " + name\` or better: \`"Hello, " + name + "!"\`

**Fixed code:**
print("What's your name?")
name = input()
print("Hello, " + name + "!")

**Try it now!** Would you like me to explain how input() works in more detail?"`,
    activity: 'If you\'re learning to code, share a simple program or code snippet with Gemini. Ask it to explain each line. If you get an error, share it and ask for help. Don\'t worry if you\'re a complete beginner!',
    quiz: {
      questions: [
        {
          id: 'gem-code-1',
          type: 'mcq',
          question: 'How can Gemini help someone learning to code?',
          options: [
            'Only by writing entire programs',
            'Explaining code, fixing errors, answering questions',
            'It can\'t help with coding',
            'Only checking spelling in code'
          ],
          correctAnswer: 1,
          explanation: 'Gemini can explain code, help debug errors, answer questions, and guide you through learning - like a coding tutor.'
        },
        {
          id: 'gem-code-2',
          type: 'true-false',
          question: 'You should try to understand code that Gemini writes for you, not just copy it.',
          correctAnswer: true,
          explanation: 'Yes! Understanding the code helps you learn. Copying without understanding doesn\'t develop your skills.'
        },
        {
          id: 'gem-code-3',
          type: 'mcq',
          question: 'If your code has an error, what should you share with Gemini?',
          options: [
            'Just say "it doesn\'t work"',
            'The code AND the error message',
            'Only the error message',
            'Nothing - figure it out yourself'
          ],
          correctAnswer: 1,
          explanation: 'Sharing both the code and the error message helps Gemini understand exactly what\'s going wrong.'
        }
      ],
      passingScore: 70,
      hints: [
        'AI is like a patient coding tutor',
        'Understanding beats copying',
        'Context helps with debugging'
      ],
      safeFeedback: {
        pass: 'You know how to use AI for learning to code! This is a valuable skill for the future.',
        fail: 'AI can be a great coding helper. Review how to get the best help with programming!'
      }
    }
  },
  {
    id: 'gemini-responsible',
    title: 'Using Gemini Responsibly',
    minutes: 10,
    level: 'beginner',
    explanation: `Google has built safety features into Gemini. Here's how to use it responsibly:

**What Gemini Won't Do:**
• Generate harmful or illegal content
• Create misleading information intentionally
• Make realistic fake images of real people
• Help with academic dishonesty
• Share private information

**Best Practices:**

1. **Verify important information:**
   Gemini integrates with Search, but still verify facts

2. **Use for learning, not cheating:**
   Let Gemini help you understand, not do your work

3. **Understand AI limitations:**
   Even with images, Gemini can make mistakes

4. **Respect privacy:**
   Don't upload others' private photos or information

5. **Credit appropriately:**
   If AI significantly helped, acknowledge it

**Remember:**
Google's AI principles include being socially beneficial and avoiding unfair bias. Gemini is designed to be helpful while maintaining these standards.`,
    example: `**Responsible vs irresponsible use:**

**Irresponsible:** 
"Gemini, write my entire history essay for me"
Problem: That's academic dishonesty

**Responsible:**
"Help me understand the causes of World War I so I can write my essay"
Why it's better: You learn, you write, AI helps you understand

**Irresponsible:**
Uploading classmate's private photos to "analyze"
Problem: Privacy violation

**Responsible:**
Uploading your own diagrams or public images for learning
Why it's better: Respects privacy, focuses on education

**Irresponsible:**
Trusting every AI-generated fact without checking
Problem: AI can be wrong

**Responsible:**
Using Gemini's connected Search to verify, and checking other sources too
Why it's better: You're thinking critically`,
    activity: 'Think about your own AI use. Write down 3 situations where AI helped you appropriately and 3 situations where you should NOT use AI. Discuss with a parent or teacher!',
    quiz: {
      questions: [
        {
          id: 'gem-resp-1',
          type: 'true-false',
          question: 'It\'s okay to upload anyone\'s photos to Gemini for analysis.',
          correctAnswer: false,
          explanation: 'You should respect others\' privacy. Only upload your own images or publicly available ones for appropriate purposes.'
        },
        {
          id: 'gem-resp-2',
          type: 'mcq',
          question: 'What\'s the right way to use Gemini for homework?',
          options: [
            'Have it do all your homework',
            'Use it to understand concepts, then do the work yourself',
            'Never use it at all',
            'Copy answers and change a few words'
          ],
          correctAnswer: 1,
          explanation: 'AI should help you learn and understand. The actual work should be yours.'
        },
        {
          id: 'gem-resp-3',
          type: 'mcq',
          question: 'Even though Gemini is connected to Google Search, you should:',
          options: [
            'Trust all information completely',
            'Still verify important facts',
            'Never use it for research',
            'Only use it for entertainment'
          ],
          correctAnswer: 1,
          explanation: 'No AI is perfect. Verification is always important for important facts.'
        }
      ],
      passingScore: 70,
      hints: [
        'Privacy matters for everyone',
        'Learning > copying',
        'Verification is always smart'
      ],
      safeFeedback: {
        pass: 'You understand how to use Gemini responsibly! These principles apply to all AI tools.',
        fail: 'Responsible AI use is crucial. Review the guidelines about privacy and academic honesty!'
      }
    }
  }
];

// ============================================
// CANVA JOURNEY (5 Modules)
// ============================================

const canvaJourney = [
  {
    id: 'canva-intro',
    title: 'Getting Started with Canva',
    minutes: 10,
    level: 'beginner',
    explanation: `Canva is a design tool that makes creating beautiful graphics easy - even if you're not an artist!

**What You Can Create:**
• School presentations
• Posters and flyers for events
• Social media posts
• Infographics for projects
• Videos and animations
• Logos and banners
• Birthday cards and invitations

**Why Canva is Great for Students:**
• Free version has tons of features
• Thousands of templates to start from
• Drag-and-drop (no design skills needed)
• Works in your browser
• Collaborate with classmates

**Getting Started:**
1. Go to canva.com
2. Create a free account
3. Choose what you want to create
4. Pick a template
5. Customize with your content
6. Download or share!

**Pro tip:** Search for templates related to your project (e.g., "science poster" or "book report") - someone has probably already made something similar!`,
    example: `**Creating a poster for a school science fair:**

**Step 1:** Go to Canva, search "science poster"
→ Hundreds of templates appear!

**Step 2:** Pick one you like
→ It opens in the editor

**Step 3:** Customize:
- Click on title text → Type your project name: "Effect of Plants on Air Quality"
- Click on images → Replace with your project photos
- Change colors to match your school colors
- Add your name and class

**Step 4:** Use AI features:
- "Magic Write": Generate text for your key findings
- "Magic Edit": Remove unwanted parts of photos
- "Text to Image": Create illustrations you can't find

**Step 5:** Download as PDF (for printing) or PNG (for digital)

**Time taken:** About 20 minutes for a professional-looking poster!`,
    activity: 'Create a free Canva account and make a simple "About Me" poster. Include your name, grade, hobbies, and a fun fact. Use a template to make it look professional!',
    quiz: {
      questions: [
        {
          id: 'can-intro-1',
          type: 'mcq',
          question: 'What is Canva primarily used for?',
          options: [
            'Video games',
            'Creating graphics and designs',
            'Sending emails',
            'Writing documents'
          ],
          correctAnswer: 1,
          explanation: 'Canva is a graphic design platform for creating posters, presentations, social media posts, and more.'
        },
        {
          id: 'can-intro-2',
          type: 'true-false',
          question: 'You need professional design skills to use Canva.',
          correctAnswer: false,
          explanation: 'Canva is designed for everyone! Templates and drag-and-drop tools make it easy for beginners.'
        },
        {
          id: 'can-intro-3',
          type: 'mcq',
          question: 'What\'s a good first step when starting a Canva project?',
          options: [
            'Start from a blank page',
            'Search for templates related to your project',
            'Draw everything by hand first',
            'Watch a 10-hour tutorial'
          ],
          correctAnswer: 1,
          explanation: 'Starting with a template saves time and gives you a professional foundation to customize.'
        }
      ],
      passingScore: 70,
      hints: [
        'Canva is for visual content',
        'Templates make things easier',
        'No special skills needed'
      ],
      safeFeedback: {
        pass: 'You\'re ready to start designing in Canva! Templates will be your best friend.',
        fail: 'Canva is easier than you might think. Review how templates help beginners create professional designs!'
      }
    }
  },
  {
    id: 'canva-ai-features',
    title: 'AI Features in Canva',
    minutes: 12,
    level: 'beginner',
    explanation: `Canva has built-in AI tools that make designing even easier:

**Magic Write:**
• Generate text for your designs
• Create captions, headlines, paragraphs
• Works in multiple languages including Hindi!

**Text to Image:**
• Describe what you want → AI creates an image
• Great for illustrations you can't find
• Multiple styles available

**Magic Edit:**
• Remove unwanted objects from photos
• Change specific parts of an image
• Extend images beyond their edges

**Background Remover:**
• One-click background removal
• Perfect for product photos
• Make transparent PNGs

**Magic Resize:**
• Convert designs for different platforms
• Instagram post → Instagram story → YouTube thumbnail
• Saves hours of reformatting

**Translation:**
• Translate designs to different languages
• Maintain design while changing text

**Important:** These AI tools are powerful but should be used thoughtfully. Always check that AI-generated content is appropriate and accurate!`,
    example: `**Using AI for a school project on Indian wildlife:**

**Need an image of a tiger in a forest:**
1. Open Canva's "Text to Image"
2. Type: "Bengal tiger walking through a misty Indian forest, realistic style"
3. Generate several options
4. Pick the best one

**Need to write a caption:**
1. Use "Magic Write"
2. Prompt: "Write a short, engaging caption about tiger conservation for a school poster"
3. Edit the result to match your voice

**Your photo has a distracting background:**
1. Upload your nature photo
2. Use "Background Remover"
3. Get a clean image to place on your design

**Need to resize for presentation:**
1. Made an A4 poster
2. Use "Magic Resize"
3. Instantly get versions for:
   - PowerPoint slide
   - Instagram post
   - WhatsApp status

**Time saved:** What might take hours of manual work takes minutes with AI!`,
    activity: 'In Canva, try the "Text to Image" feature. Create an image for a subject you\'re studying (like "ancient Indian architecture" or "solar system"). Then use Magic Write to generate a caption. How well does it work?',
    quiz: {
      questions: [
        {
          id: 'can-ai-1',
          type: 'mcq',
          question: 'What does Canva\'s "Magic Write" do?',
          options: [
            'Checks spelling only',
            'Generates text content using AI',
            'Changes font styles',
            'Draws pictures'
          ],
          correctAnswer: 1,
          explanation: 'Magic Write uses AI to generate text content like captions, headlines, and paragraphs.'
        },
        {
          id: 'can-ai-2',
          type: 'mcq',
          question: 'How do you create an AI image in Canva?',
          options: [
            'Draw it yourself',
            'Use "Text to Image" and describe what you want',
            'Copy from Google',
            'You can\'t create images in Canva'
          ],
          correctAnswer: 1,
          explanation: 'The "Text to Image" feature lets you describe an image in words, and AI generates it for you.'
        },
        {
          id: 'can-ai-3',
          type: 'true-false',
          question: 'Magic Resize can convert your design for different platforms automatically.',
          correctAnswer: true,
          explanation: 'Yes! Magic Resize adjusts your design dimensions for different platforms like Instagram, YouTube, or presentations.'
        }
      ],
      passingScore: 70,
      hints: [
        'Magic Write = text generation',
        'Text to Image = describe what you want',
        'Magic Resize = format conversion'
      ],
      safeFeedback: {
        pass: 'You know Canva\'s AI tools! These will speed up your design process significantly.',
        fail: 'Canva\'s AI features are powerful helpers. Review what each tool does!'
      }
    }
  },
  {
    id: 'canva-design-basics',
    title: 'Design Basics',
    minutes: 15,
    level: 'beginner',
    explanation: `Even with AI and templates, knowing basic design principles makes your work better:

**1. Color:**
• Use 2-3 main colors (not more!)
• Pick colors that work together
• Canva suggests color palettes
• Consider readability (dark text on light, or light on dark)

**2. Typography:**
• Maximum 2-3 fonts per design
• One for headings, one for body text
• Make sure text is readable
• Don't use "fun" fonts for serious content

**3. Alignment:**
• Keep elements aligned (not scattered)
• Use Canva's guides and grids
• Consistent spacing looks professional

**4. White Space:**
• Don't fill every empty spot
• Breathing room makes designs cleaner
• Less is often more

**5. Hierarchy:**
• Most important info = biggest/boldest
• Guide the viewer's eye
• What should they see first?

**6. Images:**
• Use high-quality images
• Keep consistent style
• Don't stretch or distort
• Ensure appropriate attribution`,
    example: `**Good vs Bad Design Comparison:**

**Bad Poster:**
- 6 different fonts
- 10 bright colors that clash
- Text placed randomly
- Every inch filled with content
- Tiny, unreadable text

**Good Poster:**
- 2 fonts (one bold heading, one clean body)
- 3 colors that complement each other
- Clear alignment with margins
- White space around elements
- Large title, medium subheading, smaller details

**The Squint Test:**
Squint at your design. Can you still tell what's important?
- If yes = good hierarchy
- If everything blurs together = needs improvement

**The 5-Second Test:**
Show someone your design for 5 seconds. Can they tell:
- What it's about?
- What's most important?
If yes, your design communicates well!`,
    activity: 'Find a poster or presentation you made before. Apply the design principles: Does it use 2-3 colors? 2-3 fonts? Is there white space? Is there clear hierarchy? Make a list of improvements!',
    quiz: {
      questions: [
        {
          id: 'can-design-1',
          type: 'mcq',
          question: 'How many fonts should you typically use in one design?',
          options: [
            'As many as possible for variety',
            '2-3 maximum',
            'Only 1',
            '5-6 minimum'
          ],
          correctAnswer: 1,
          explanation: 'Using 2-3 fonts keeps designs cohesive. Too many fonts looks chaotic and unprofessional.'
        },
        {
          id: 'can-design-2',
          type: 'true-false',
          question: 'White space (empty areas) should be filled with content.',
          correctAnswer: false,
          explanation: 'White space is important! It makes designs cleaner and easier to read. Don\'t fill every inch.'
        },
        {
          id: 'can-design-3',
          type: 'mcq',
          question: 'What is design "hierarchy"?',
          options: [
            'Organizing files in folders',
            'Arranging elements to show what\'s most important',
            'Making everything the same size',
            'Using only premium features'
          ],
          correctAnswer: 1,
          explanation: 'Hierarchy uses size, color, and placement to guide viewers to the most important information first.'
        }
      ],
      passingScore: 70,
      hints: [
        'Less is often more with fonts',
        'Empty space has purpose',
        'Big/bold = important'
      ],
      safeFeedback: {
        pass: 'You understand design basics! These principles will make all your visual work better.',
        fail: 'Design basics are simple but important. Review the rules about colors, fonts, and white space!'
      }
    }
  },
  {
    id: 'canva-responsible-media',
    title: 'Responsible Media Creation',
    minutes: 12,
    level: 'intermediate',
    explanation: `With powerful design tools comes responsibility. Here's how to create media ethically:

**Credit & Copyright:**
• Don't use copyrighted images without permission
• Canva's library is licensed for use
• Credit creators when required
• Stock photos ≠ free to use anywhere

**AI-Generated Images:**
• Label AI images when it matters
• Don't create fake photos of real people
• Consider impact before sharing
• Check for unintended biases

**Accurate Information:**
• Don't create misleading graphics
• Verify statistics before designing infographics
• "Professional-looking" doesn't mean "true"
• Consider how your design might be misunderstood

**Privacy:**
• Get permission before using others' photos
• Don't create content that could embarrass others
• Think twice before sharing personal content

**Representation:**
• Include diverse representations
• Avoid stereotypes in your designs
• Be thoughtful about cultural imagery`,
    example: `**Scenario: Creating an infographic for a school project**

**Wrong approach:**
1. Find a statistic online without checking the source
2. Make it look impressive with big numbers
3. Use Canva to make it professional-looking
4. Don't cite any sources

**Why it's wrong:** Professional design can spread misinformation. A fake stat in a nice infographic might be shared and believed.

**Right approach:**
1. Find statistics from reliable sources (government data, research papers)
2. Note the source, date, and context
3. Design the infographic with accurate data
4. Include source citations on the design
5. If using AI-generated images, note that they're illustrations

**Golden rule:** Your design should inform, not deceive. Just because you CAN make something look official doesn't mean you SHOULD if the content isn't accurate.`,
    activity: 'Look at an infographic or designed post online. Think critically: What sources are cited? Could any statistics be misleading? Could any images be AI-generated? Practice spotting responsible vs irresponsible media.',
    quiz: {
      questions: [
        {
          id: 'can-resp-1',
          type: 'mcq',
          question: 'When using AI to generate images for a project, you should:',
          options: [
            'Always pretend they\'re real photos',
            'Label them as AI-generated when appropriate',
            'Never use AI images',
            'Only use them for fake news'
          ],
          correctAnswer: 1,
          explanation: 'Being transparent about AI-generated content maintains trust and honesty.'
        },
        {
          id: 'can-resp-2',
          type: 'true-false',
          question: 'If you make an infographic look professional, the statistics don\'t need to be accurate.',
          correctAnswer: false,
          explanation: 'Professional design and accurate content are BOTH important. Looking good doesn\'t make false info true.'
        },
        {
          id: 'can-resp-3',
          type: 'mcq',
          question: 'Before using someone else\'s photo in your design, you should:',
          options: [
            'Just use it - it\'s online',
            'Check permissions and get consent if needed',
            'Only use celebrity photos',
            'Make it smaller so it\'s okay'
          ],
          correctAnswer: 1,
          explanation: 'Always check if you have permission to use images, especially photos of real people.'
        }
      ],
      passingScore: 70,
      hints: [
        'Transparency builds trust',
        'Design + accuracy = responsible media',
        'Permission matters'
      ],
      safeFeedback: {
        pass: 'You understand responsible media creation! These ethics apply to all content you create.',
        fail: 'Media responsibility is important in the AI age. Review the guidelines about accuracy and transparency!'
      }
    }
  },
  {
    id: 'canva-projects',
    title: 'Student Projects in Canva',
    minutes: 15,
    level: 'intermediate',
    explanation: `Let's put it all together! Here are complete project ideas:

**1. Book Report Presentation**
• Create title slide with AI-generated imagery
• Add chapter summary slides
• Include character analysis with graphics
• Design a "Would I recommend?" finale

**2. Science Fair Poster**
• Professional layout with sections
• Add your experiment photos
• Use AI to create diagrams
• Include data visualizations

**3. History Timeline**
• Horizontal timeline template
• Add images for each event
• Use consistent styling
• Include photos or illustrations

**4. Club or Event Promotion**
• Eye-catching poster for school events
• Social media versions (Magic Resize!)
• Digital flyer for WhatsApp groups
• Print version for notice boards

**5. Video Presentation**
• Canva can create videos too!
• Add animations and transitions
• Include text overlays
• Export for submission or social media

**Tips for all projects:**
• Start with templates
• Customize to make it yours
• Use AI features to save time
• Always proofread before sharing`,
    example: `**Complete project: Independence Day School Assembly Presentation**

**Step 1: Plan (5 mins)**
- Cover slide
- History overview (2-3 slides)
- Freedom fighters spotlight (2-3 slides)
- Quiz for audience (2 slides)
- Thank you slide

**Step 2: Design in Canva (30 mins)**
- Search template: "patriotic presentation" or "Indian flag presentation"
- Customize colors: saffron, white, green
- Use Text to Image: "Ashoka chakra illustration"
- Add photos of freedom fighters from library
- Use Magic Write for engaging bullet points

**Step 3: Enhance (15 mins)**
- Add simple animations to key points
- Include a interactive quiz slide
- Background music if presenting digitally
- Speaker notes for you

**Step 4: Export**
- Download as PDF for printing
- Export as video for digital presentation
- Create WhatsApp-sized version to share

**Total time:** Under 1 hour for a professional presentation!`,
    activity: 'Create a presentation for an upcoming school project using Canva. Use at least 2 AI features (Magic Write, Text to Image, Magic Resize, etc.). Share your finished project with classmates or family!',
    quiz: {
      questions: [
        {
          id: 'can-proj-1',
          type: 'mcq',
          question: 'When starting a school project in Canva, the best first step is:',
          options: [
            'Start from scratch every time',
            'Search for relevant templates, then customize',
            'Copy a classmate\'s design',
            'Spend hours choosing colors'
          ],
          correctAnswer: 1,
          explanation: 'Templates provide a professional starting point. Customizing saves time while still making it your own.'
        },
        {
          id: 'can-proj-2',
          type: 'true-false',
          question: 'Canva can only create static images, not videos.',
          correctAnswer: false,
          explanation: 'Canva can create videos too! You can add animations, transitions, music, and export video files.'
        },
        {
          id: 'can-proj-3',
          type: 'mcq',
          question: 'What makes AI features most useful in Canva projects?',
          options: [
            'They do all the work automatically',
            'They save time on specific tasks while you control the creative direction',
            'They only work for professionals',
            'They replace the need for any human input'
          ],
          correctAnswer: 1,
          explanation: 'AI features speed up specific tasks, but you remain the creative director making decisions.'
        }
      ],
      passingScore: 70,
      hints: [
        'Templates are starting points',
        'Canva does more than images',
        'AI assists, you direct'
      ],
      safeFeedback: {
        pass: 'You\'re ready to create impressive school projects with Canva! Time to put these skills to use.',
        fail: 'Canva is a versatile tool for students. Review how to combine templates, AI, and your creativity!'
      }
    }
  }
];

// ============================================
// SYLLABY JOURNEY (5 Modules)
// ============================================

const syllabyJourney = [
  {
    id: 'syllaby-intro',
    title: 'Introduction to Content Planning',
    minutes: 10,
    level: 'beginner',
    explanation: `Syllaby is an AI tool that helps plan and organize content. While it's designed for content creators, the skills you'll learn are valuable for any project!

**What is Content Planning?**
Content planning means organizing what you'll create before you create it:
• Topics you'll cover
• Order of content
• Key points for each piece
• Schedule for creation

**Why Learn Content Planning?**

Even if you're not a YouTuber, these skills help with:
• School presentations
• Project organization
• Speech preparation
• Blog posts or stories
• Club activities

**What Syllaby Can Do:**
• Generate content ideas based on topics
• Create outlines for videos/posts
• Suggest trending topics
• Help plan content calendars

**The bigger lesson:**
AI tools like Syllaby teach you how to plan before creating - a skill that applies to everything from essays to science projects!`,
    example: `**How content planning applies to school:**

**Without planning:**
"I need to make a presentation on climate change"
→ Starts PowerPoint immediately
→ Gets stuck halfway
→ Realizes they missed important topics
→ Rushes at the end

**With planning (Syllaby mindset):**
"I need to make a presentation on climate change"

Step 1: Brainstorm topics
- What is climate change?
- Causes (natural vs human)
- Effects (local and global)
- Solutions
- What teens can do

Step 2: Organize flow
- Start with attention-grabbing fact
- Build understanding progressively
- End with call to action

Step 3: Estimate time
- Introduction: 1 minute
- Main content: 5 minutes
- Conclusion: 1 minute

Step 4: Now create with a clear map!

**The result:** Better, faster, more organized work`,
    activity: 'Think of a presentation or project you have coming up. Instead of starting immediately, spend 10 minutes planning: What are all the topics? What order makes sense? What\'s the main message? Notice how planning makes creating easier!',
    quiz: {
      questions: [
        {
          id: 'syl-intro-1',
          type: 'mcq',
          question: 'What is content planning?',
          options: [
            'Copying other people\'s work',
            'Organizing what you\'ll create before creating it',
            'Only for YouTube creators',
            'Writing everything at once'
          ],
          correctAnswer: 1,
          explanation: 'Content planning is organizing your topics, structure, and approach before you start creating.'
        },
        {
          id: 'syl-intro-2',
          type: 'true-false',
          question: 'Content planning skills are only useful for social media creators.',
          correctAnswer: false,
          explanation: 'Planning skills apply to school projects, presentations, essays, speeches - any organized content creation!'
        },
        {
          id: 'syl-intro-3',
          type: 'mcq',
          question: 'What\'s a benefit of planning before creating?',
          options: [
            'It takes more time overall',
            'You avoid getting stuck and missing important topics',
            'You don\'t need to think',
            'Planning is only for professionals'
          ],
          correctAnswer: 1,
          explanation: 'Planning helps you see the big picture, so you don\'t get stuck or forget important elements.'
        }
      ],
      passingScore: 70,
      hints: [
        'Planning = organizing before creating',
        'The skill applies widely',
        'Planning prevents problems'
      ],
      safeFeedback: {
        pass: 'You understand why planning matters! This skill will improve everything you create.',
        fail: 'Planning is a powerful skill. Review how organizing first helps you create better!'
      }
    }
  },
  {
    id: 'syllaby-idea-generation',
    title: 'AI-Powered Idea Generation',
    minutes: 12,
    level: 'beginner',
    explanation: `One of the hardest parts of creating content is coming up with ideas. AI tools can help!

**How AI Helps Generate Ideas:**
• Suggests topics you might not think of
• Explores different angles on a subject
• Identifies what audiences care about
• Breaks creative blocks

**Idea Generation Prompts:**
You can use any AI (ChatGPT, Claude, etc.) with these prompts:

1. **Topic expansion:**
   "Give me 10 different angles for a presentation about [topic]"

2. **Question-based:**
   "What questions do teenagers have about [topic]?"

3. **Connection finding:**
   "How does [topic] connect to [other interest]?"

4. **Format ideas:**
   "What are creative ways to present information about [topic]?"

5. **Audience-specific:**
   "What would Class 10 students find interesting about [topic]?"

**Remember:**
• AI gives starting points - you add your perspective
• Not all AI suggestions are good - use judgment
• The best ideas often combine AI suggestions with your own`,
    example: `**Brainstorming for a YouTube channel about study tips:**

**Student's prompt:**
"I want to make videos helping Indian students study better. Give me 10 video topic ideas that would be useful for Class 10-12 students."

**AI suggestions:**
1. "How to make a study timetable that actually works"
2. "Best apps for students in India (free options!)"
3. "How to study for boards: Science vs. Arts"
4. "Memory techniques using Hindi/regional mnemonics"
5. "How to stay focused during exam season"
6. "Study room setup on a budget"
7. "How toppers actually study (myth vs reality)"
8. "Dealing with exam anxiety: What works"
9. "How to balance school, coaching, and personal time"
10. "Note-taking methods compared"

**Student's process:**
1. Read all suggestions
2. Star favorites (3, 4, 7 seem most interesting)
3. Add own ideas: "How I went from 60% to 90%" (personal story)
4. Combine: "Memory techniques + regional examples = unique angle!"

**Result:** A list of ideas that blend AI suggestions with personal perspective`,
    activity: 'Pick a topic you\'re interested in (hobby, school subject, current interest). Use AI to generate 10 different angles or ideas for that topic. Then pick your top 3 and add your own twist to each!',
    quiz: {
      questions: [
        {
          id: 'syl-idea-1',
          type: 'mcq',
          question: 'How should you use AI-generated content ideas?',
          options: [
            'Use them exactly as given',
            'As starting points to build on with your own perspective',
            'Ignore them all',
            'Only use the first suggestion'
          ],
          correctAnswer: 1,
          explanation: 'AI gives starting points. The best content adds your unique perspective and experience.'
        },
        {
          id: 'syl-idea-2',
          type: 'true-false',
          question: 'Every idea AI generates will be good and usable.',
          correctAnswer: false,
          explanation: 'AI suggestions vary in quality. You need to use judgment to pick the best ones.'
        },
        {
          id: 'syl-idea-3',
          type: 'mcq',
          question: 'What makes the best content ideas?',
          options: [
            'Pure AI generation',
            'Combination of AI suggestions and your personal perspective',
            'Copying exactly what others did',
            'Random topics'
          ],
          correctAnswer: 1,
          explanation: 'The best ideas combine AI\'s breadth with your unique angle and authentic voice.'
        }
      ],
      passingScore: 70,
      hints: [
        'AI = starting point',
        'Quality > quantity in ideas',
        'Your perspective makes it unique'
      ],
      safeFeedback: {
        pass: 'You know how to use AI for brainstorming! This skill helps with writer\'s block.',
        fail: 'AI brainstorming is about combination, not just copying. Review how to add your own angle!'
      }
    }
  },
  {
    id: 'syllaby-scripting',
    title: 'Creating Outlines & Scripts',
    minutes: 15,
    level: 'intermediate',
    explanation: `Once you have ideas, the next step is organizing them into outlines or scripts:

**The Power of Outlines:**
An outline is your content's skeleton. It helps you:
• Organize thoughts logically
• Ensure you cover everything
• Estimate time/length
• Stay focused while creating

**Script Structure (for videos, presentations, speeches):**

1. **Hook (10%):** Grab attention immediately
   "What if I told you that you've been studying wrong your whole life?"

2. **Introduction (10%):** Set expectations
   "In this video, I'll share 3 techniques that helped me top my class"

3. **Main Content (70%):** The core information
   - Point 1 with example
   - Point 2 with example
   - Point 3 with example

4. **Conclusion (10%):** Wrap up with action
   "Try technique #1 today and let me know if it works!"

**AI for Scripting:**
"Create an outline for a 5-minute video about [topic] for [audience]"
"Help me write a script for [topic] - I want to cover [points]"`,
    example: `**Creating a script for a school assembly speech:**

**Topic:** "Why Reading Matters"
**Time:** 3 minutes

**Outline created with AI help:**

**Hook (15 sec):**
"Raise your hand if you'd rather watch a movie than read a book..." 
[Most hands go up]
"What if I told you that readers actually enjoy movies MORE?"

**Introduction (20 sec):**
"I'm [name], and today I want to share why reading changed how I see everything - including movies, games, and yes, even studying."

**Point 1 (45 sec): Reading = Better Imagination**
- Example: Reading Harry Potter vs. watching it
- Your imagination creates YOUR perfect Hogwarts
- Quiz scores improve when you can visualize

**Point 2 (45 sec): Reading = Better Focus**
- Our phones train us for 30-second attention
- Reading trains deep focus
- My own experience with longer study sessions

**Point 3 (45 sec): Reading = Better Vocabulary**
- Story about learning words from books
- How it helped in essays and conversations
- "Wasn't trying to learn - just happened!"

**Conclusion (30 sec):**
"You don't have to give up screens. Just add 20 minutes of reading. Try it for one week. I bet you'll notice a difference. Thank you!"

**Total: ~3 minutes ✓**`,
    activity: 'Create an outline for a 3-minute speech about something you care about. Use the Hook → Intro → 3 Points → Conclusion structure. Time yourself mentally to see if it fits!',
    quiz: {
      questions: [
        {
          id: 'syl-script-1',
          type: 'mcq',
          question: 'What is the purpose of a "hook" in content?',
          options: [
            'To summarize everything',
            'To grab attention at the start',
            'To list credits',
            'To fill time'
          ],
          correctAnswer: 1,
          explanation: 'A hook grabs attention immediately, making people want to hear/read more.'
        },
        {
          id: 'syl-script-2',
          type: 'mcq',
          question: 'What percentage of a script should be the main content?',
          options: [
            '10%',
            '30%',
            'About 70%',
            '100%'
          ],
          correctAnswer: 2,
          explanation: 'Main content typically takes about 70% of a script, with hooks, intros, and conclusions taking the rest.'
        },
        {
          id: 'syl-script-3',
          type: 'true-false',
          question: 'An outline helps you stay organized while creating content.',
          correctAnswer: true,
          explanation: 'Yes! Outlines are roadmaps that keep you focused and ensure you cover all important points.'
        }
      ],
      passingScore: 70,
      hints: [
        'Hooks come first',
        'Main content dominates',
        'Outlines keep you on track'
      ],
      safeFeedback: {
        pass: 'You can structure content effectively! This skill helps with any presentation or writing.',
        fail: 'Content structure is learnable. Review the Hook → Main → Conclusion framework!'
      }
    }
  },
  {
    id: 'syllaby-authenticity',
    title: 'Authenticity & Ethics',
    minutes: 12,
    level: 'intermediate',
    explanation: `When creating content - whether for social media, school, or hobbies - authenticity matters:

**What is Authenticity?**
Being authentic means:
• Your voice and perspective shine through
• AI assists but doesn't replace you
• Your experiences and opinions are real
• You don't pretend to be someone you're not

**Why Authenticity Matters:**
• Audiences can sense fake content
• Authentic creators build trust
• Your unique perspective is valuable
• Copying doesn't develop your skills

**Ethical Content Creation:**

1. **Give Credit:**
   - If AI helped significantly, acknowledge it
   - Credit others' ideas you build on
   - Don't claim AI work as entirely yours

2. **Be Truthful:**
   - Don't fake experiences for content
   - Be honest about what you know and don't know
   - Verify facts before sharing

3. **Consider Impact:**
   - Will your content help or harm?
   - Think about how different people might react
   - Would you be proud of this tomorrow?

4. **Respect Others:**
   - Don't use content to mock or hurt
   - Respect privacy
   - Think before posting about others`,
    example: `**Authentic vs. Inauthentic Content:**

**Inauthentic approach:**
"Here's how I scored 99% in boards" 
(When you actually scored 75%)
Uses AI to write everything
Never studied what they're teaching
Just wants views

**Why it fails:**
- Deceptive to viewers
- Advice may not work
- Builds fake persona
- Gets exposed eventually

**Authentic approach:**
"How I improved from 60% to 80%"
(Real story with real struggles)
Uses AI to organize ideas
Shares genuine techniques that worked
Wants to help others

**Why it works:**
- Relatable and honest
- Viewers trust you
- Advice is tested
- Builds real connection

**The Authenticity Test:**
Ask yourself:
- Is this really my story/experience?
- Would I say this if my teacher/parents watched?
- Am I helping or just seeking attention?
- Would I respect someone who created this?`,
    activity: 'Think about content you consume online. Can you identify 3 creators who seem authentic and 3 who seem fake? What makes the difference? Discuss with friends or family.',
    quiz: {
      questions: [
        {
          id: 'syl-auth-1',
          type: 'mcq',
          question: 'What does "authentic" content mean?',
          options: [
            'Content that goes viral',
            'Content that reflects your real voice and experiences',
            'Content copied from famous creators',
            'Content that uses lots of AI'
          ],
          correctAnswer: 1,
          explanation: 'Authentic content reflects your real perspective, experiences, and voice - not fake personas.'
        },
        {
          id: 'syl-auth-2',
          type: 'true-false',
          question: 'If AI writes most of your content, you should still claim you wrote everything yourself.',
          correctAnswer: false,
          explanation: 'Honesty matters. If AI significantly helped, being transparent builds trust.'
        },
        {
          id: 'syl-auth-3',
          type: 'mcq',
          question: 'Before posting content, you should ask:',
          options: [
            'How many likes will this get?',
            'Will this help or potentially harm others?',
            'Did famous creators do this?',
            'Is this trending right now?'
          ],
          correctAnswer: 1,
          explanation: 'Ethical creators consider the impact of their content on others before sharing.'
        }
      ],
      passingScore: 70,
      hints: [
        'Authentic = real you',
        'Honesty builds trust',
        'Consider impact on others'
      ],
      safeFeedback: {
        pass: 'You understand why authenticity matters! This integrity will serve you in all content creation.',
        fail: 'Authenticity is about being real. Review why honest content is better than fake personas!'
      }
    }
  },
  {
    id: 'syllaby-practical',
    title: 'Practical Applications',
    minutes: 15,
    level: 'intermediate',
    explanation: `Let's apply content planning skills to real student scenarios:

**School Presentations:**
Use planning for every presentation:
- Brainstorm angles
- Create clear outline
- Write hook and conclusion
- Estimate timing

**Club & Activities:**
If you run a club or organize events:
- Plan promotional content
- Schedule announcements
- Create consistent messaging
- Coordinate with team members

**Creative Projects:**
For stories, videos, or art:
- Plan story arcs
- Outline chapters/scenes
- Schedule creation time
- Gather feedback systematically

**Personal Branding:**
Even for personal social media:
- What topics define you?
- What's your authentic voice?
- How consistent are you?
- What value do you provide?

**Study Planning:**
Apply content planning to learning:
- What topics to cover?
- What order makes sense?
- How to test understanding?
- When to review?`,
    example: `**Real scenario: Organizing a school Tech Club**

**Using content planning skills:**

**1. Vision & Topics:**
- What will the club cover?
- AI, coding, robotics, app development
- Guest speakers, projects, competitions

**2. Content Calendar:**
| Week | Activity | Promotion Needed |
|------|----------|------------------|
| 1 | Introduction session | Poster, WhatsApp |
| 2 | AI basics workshop | Reminder post |
| 3 | Coding challenge | Registration form |
| 4 | Project showcase | Invitation to teachers |

**3. Promotion Script (planned!):**
Hook: "Did you know ChatGPT wrote this poster's text... or did it?"
Message: Tech Club meets every Friday
CTA: "Join WhatsApp group: [link]"

**4. Session Outlines:**
Each session follows:
- Hook activity (5 min)
- Main content (30 min)
- Hands-on activity (20 min)
- Wrap-up (5 min)

**Result:** Professional, organized club that members love!`,
    activity: 'Choose something you\'re involved in (club, study group, hobby). Create a simple content/activity plan for the next month. What will you do each week? What materials do you need? How will you track progress?',
    quiz: {
      questions: [
        {
          id: 'syl-prac-1',
          type: 'mcq',
          question: 'Content planning skills are useful for:',
          options: [
            'Only YouTube creators',
            'Presentations, clubs, projects, and personal organization',
            'Only professional marketers',
            'Only adults'
          ],
          correctAnswer: 1,
          explanation: 'Planning skills apply to presentations, club activities, creative projects, studying, and much more!'
        },
        {
          id: 'syl-prac-2',
          type: 'true-false',
          question: 'A content calendar can help organize school club activities.',
          correctAnswer: true,
          explanation: 'Yes! Content calendars help plan and schedule activities, promotions, and events.'
        },
        {
          id: 'syl-prac-3',
          type: 'mcq',
          question: 'The planning skills from Syllaby can help with:',
          options: [
            'Only creating social media posts',
            'Organizing any project that involves content or activities',
            'Nothing outside of marketing',
            'Only video creation'
          ],
          correctAnswer: 1,
          explanation: 'Planning, organizing, and scheduling skills apply to any structured activity or project.'
        }
      ],
      passingScore: 70,
      hints: [
        'Skills transfer to many areas',
        'Organization helps everything',
        'Planning = less stress'
      ],
      safeFeedback: {
        pass: 'You can apply content planning to your life! These organizational skills will serve you well.',
        fail: 'Planning skills have broad applications. Review how to use them beyond just content creation!'
      }
    }
  }
];

// ============================================
// EXPORT CURRICULUM
// ============================================

export const journeys  = {
  chatgpt: chatgptJourney,
  claude: claudeJourney,
  gemini: geminiJourney,
  canva: canvaJourney,
  syllaby: syllabyJourney
};

export const curriculum  = {
  version: '2.0.0',
  lastUpdated: '2025-01-28',
  tools,
  journeys
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getToolById = (id) => {
  return tools.find(tool => tool.id === id);
};

export const getModuleById = (toolId, moduleId) => {
  const journey = journeys[toolId];
  return journey?.find(module => module.id === moduleId);
};

export const getTotalModules = () => {
  return Object.values(journeys).reduce((acc, modules) => acc + modules.length, 0);
};

export const getTotalXP = () => {
  return tools.reduce((acc, tool) => acc + tool.totalXP, 0);
};

export const getModuleXP = (toolId) => {
  const tool = getToolById(toolId);
  const journey = journeys[toolId];
  if (!tool || !journey) return 0;
  return Math.floor(tool.totalXP / journey.length);
};

export default curriculum;
