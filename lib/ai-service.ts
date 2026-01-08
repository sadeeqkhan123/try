import type { DecisionNode } from './types';

// Import OpenAI with proper typing
type OpenAIInstance = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        presence_penalty?: number;
      }) => Promise<{
        choices: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
};

let OpenAI: any = null;
let openai: OpenAIInstance | null = null;

// Lazy load OpenAI to avoid build-time errors
function getOpenAI(): OpenAIInstance | null {
  if (openai) {
    return openai;
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    // Dynamic import for Next.js compatibility
    const OpenAIModule = require('openai');
    OpenAI = OpenAIModule.default || OpenAIModule;
    
    if (OpenAI) {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }) as OpenAIInstance;
      return openai;
    }
  } catch (error) {
    console.warn('OpenAI package not available or failed to initialize:', error);
    return null;
  }

  return null;
}

export interface ConversationContext {
  currentNode: DecisionNode;
  conversationHistory: Array<{
    speaker: 'user' | 'bot';
    text: string;
    timestamp: number;
  }>;
  scenarioContext?: string;
  userMessage: string;
}

export class AIService {
  /**
   * Generate a contextual AI response based on conversation history and flow structure
   */
  async generateContextualResponse(context: ConversationContext): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, falling back to scripted response');
      return this.getFallbackResponse(context.currentNode);
    }

    try {
      // Build system prompt based on the current node and flow structure
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Build conversation history for context
      const messages = this.buildMessages(context, systemPrompt);

      const openaiClient = getOpenAI();
      if (!openaiClient) {
        return this.getFallbackResponse(context.currentNode);
      }

      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.7, // Slightly lower for more consistent passive behavior
        max_tokens: 1000, // Increased from 200 to allow longer, more complete responses
        presence_penalty: 0.3, // Lower penalty to reduce question-asking behavior
      });

      let response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        return this.getFallbackResponse(context.currentNode);
      }

      // Replace placeholders with randomized personal information for JOHN
      response = this.injectRandomizedPersonalInfo(response);

      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getFallbackResponse(context.currentNode);
    }
  }

  /**
   * Build system prompt that guides the AI to act as a prospect following the flow
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const node = context.currentNode;
    const scenarioContext = context.scenarioContext || 
      "You are JOHN. You already own a home that you bought 1-25 years ago. You have a mortgage. This call is about MORTGAGE PROTECTION OPTIONS (insurance), NOT mortgage loans. You are PASSIVE - you do NOT ask questions 90% of the time. You ONLY answer what the agent asks. When asked for height/weight/age/medical info, provide it IMMEDIATELY. You only ask questions in rare situations (10%): 'how much is this gonna cost?' (beginning only), 'why do i have to give out my information?' (when asked health questions), 'why do i have to give my routing and account?' (when told about banking), 'im gonna need to think about this' (after options), 'i need to talk to my partner' (after options), or 'I think this costs too much. Thank you.' (after options). Otherwise, be completely passive.";

    let prompt = `IMPORTANT: This is about MORTGAGE PROTECTION OPTIONS (insurance), NOT mortgage loans. You already have a mortgage. You are NOT looking to get a mortgage or buy a home.\n\n${scenarioContext}\n\n`;
    prompt += `Current conversation stage: ${node.label} (${node.category})\n\n`;
    
    if (node.clarificationPrompt) {
      prompt += `Context: ${node.clarificationPrompt}\n\n`;
    }

    // Add guidance based on node type
    if (node.type === 'bot') {
      prompt += `You should respond as the prospect would at this stage. `;
      
      if (node.expectedIntents && node.expectedIntents.length > 0) {
        prompt += `The sales agent is likely trying to: ${node.expectedIntents.map(i => i.label).join(', ')}.\n\n`;
      }

      // Include example responses as style guidance (but don't copy them exactly)
      // NOTE: These examples may reference mortgage loans, but you are about MORTGAGE PROTECTION OPTIONS
      if (node.botResponses && node.botResponses.length > 0) {
        prompt += `Your response should be similar in tone to these examples, but remember: you are about MORTGAGE PROTECTION OPTIONS (insurance), NOT mortgage loans. Adapt the tone but change the context:\n`;
        node.botResponses.slice(0, 2).forEach((example, i) => {
          prompt += `- Example ${i + 1}: "${example}"\n`;
        });
        prompt += `\n`;
      }

      prompt += `CRITICAL BEHAVIOR: You are a PASSIVE client. You do NOT ask questions 90% of the time. You ONLY answer what the agent asks. `;
      prompt += `If the agent asks for your height, weight, age, or medical information, PROVIDE IT IMMEDIATELY without any hesitation, resistance, or questions. Just answer directly. `;
      prompt += `If they ask you to verify information, do so immediately. If they say you got disconnected, acknowledge it and continue from where you left off. `;
      prompt += `If they asked a question, answer it directly and briefly (1-2 sentences). If they made a statement, give a brief acknowledgment or response. `;
      prompt += `Do NOT ask questions unless it's one of the 6 rare situations listed. Do NOT refuse to answer. Do NOT insist on answering other questions first. `;
      prompt += `Be completely passive and cooperative. Follow their lead completely.\n\n`;
    }

    prompt += `CRITICAL INSTRUCTIONS - READ CAREFULLY: `;
    prompt += `1. Your name is JOHN. `;
    prompt += `2. You already own a home that you bought 1-25 years ago. You have a mortgage on this home. `;
    prompt += `3. THIS CALL IS ABOUT MORTGAGE PROTECTION OPTIONS (insurance to protect your mortgage if you die or become disabled), NOT about getting a mortgage loan. Do NOT mention getting a mortgage, buying a home, pre-approval, or house hunting. `;
    prompt += `4. YOU ARE PASSIVE - You do NOT ask questions 90% of the time. You ONLY answer what the agent asks. Most clients don't ask questions - they just answer. `;
    prompt += `5. WHEN THE AGENT ASKS FOR HEIGHT/WEIGHT/AGE/MEDICAL INFO, PROVIDE IT IMMEDIATELY without any hesitation, resistance, or questions. Just answer directly. This is essential for the agent to practice. `;
    prompt += `6. You ONLY ask questions in these RARE situations (10% of the time): "how much is this gonna cost?" (only at the very beginning if not told), "why do i have to give out my information?" (only when asked health questions), "why do i have to give my routing and account?" (only when told about banking), "im gonna need to think about this" (only after all options explained), "i need to talk to my partner" (only after options), or "I think this costs too much. Thank you." (only after options). `;
    prompt += `7. Do NOT ask other questions. Do NOT refuse to answer. Do NOT insist on answering other questions first. Do NOT create "walls" or barriers. `;
    prompt += `8. If asked to verify information or continue after disconnection, do so immediately. `;
    prompt += `9. Remember: You already have a mortgage. You are NOT looking to get a mortgage. You are learning about protection insurance for your existing mortgage. `;
    prompt += `Be completely passive, cooperative, and follow the agent's lead. Answer questions directly without resistance. Do NOT ask questions unless it's one of the 6 rare situations.`;

    return prompt;
  }

  /**
   * Build messages array for OpenAI API
   */
  private buildMessages(context: ConversationContext, systemPrompt: string): Array<any> {
    const messages: Array<any> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history (last 10 turns for context)
    const recentHistory = context.conversationHistory.slice(-10);
    
    for (const turn of recentHistory) {
      messages.push({
        role: turn.speaker === 'user' ? 'user' : 'assistant',
        content: turn.text,
      });
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: context.userMessage,
    });

    return messages;
  }

  /**
   * Inject randomized personal information for JOHN
   */
  private injectRandomizedPersonalInfo(text: string): string {
    // Generate random values for JOHN (consistent within session)
    // Height: 5'6" to 6'4"
    const feet = Math.floor(Math.random() * 2) + 5; // 5 or 6
    const inches = Math.floor(Math.random() * 12); // 0-11
    const height = `${feet}'${inches}"`;
    
    // Weight: 150-250 lbs
    const weight = Math.floor(Math.random() * 100) + 150;
    
    // Age: 35-65 years
    const age = Math.floor(Math.random() * 30) + 35;
    
    // Replace common patterns
    let result = text;
    result = result.replace(/\byour height\b/gi, height);
    result = result.replace(/\byour weight\b/gi, `${weight} pounds`);
    result = result.replace(/\byour age\b/gi, age.toString());
    result = result.replace(/\bheight\b/gi, height);
    result = result.replace(/\bweight\b/gi, `${weight} pounds`);
    result = result.replace(/\bage\b/gi, age.toString());
    
    // Replace "I'm" patterns with specific values
    result = result.replace(/\bI'm\s+(\d+)\s*(feet|ft|')\s*(\d+)\s*(inches|in|")\b/gi, `I'm ${height}`);
    result = result.replace(/\bI'm\s+(\d+)\s*(pounds|lbs?)\b/gi, `I'm ${weight} pounds`);
    result = result.replace(/\bI'm\s+(\d+)\s*(years?\s*old)?\b/gi, `I'm ${age} years old`);
    
    return result;
  }

  /**
   * Fallback to scripted response if AI fails
   */
  private getFallbackResponse(node: DecisionNode): string {
    if (node.botResponses && node.botResponses.length > 0) {
      const randomIndex = Math.floor(Math.random() * node.botResponses.length);
      const response = node.botResponses[randomIndex];
      return this.injectRandomizedPersonalInfo(response);
    }
    return "I'm not sure how to respond to that.";
  }

  /**
   * Detect intent using AI for better accuracy
   */
  async detectIntentWithAI(
    userMessage: string,
    currentNode: DecisionNode,
    conversationHistory: Array<{ speaker: 'user' | 'bot'; text: string }>
  ): Promise<string> {
    if (!process.env.OPENAI_API_KEY || !currentNode.expectedIntents || currentNode.expectedIntents.length === 0) {
      return 'default';
    }

    try {
      const intentOptions = currentNode.expectedIntents.map(intent => 
        `- ${intent.id}: ${intent.label} (examples: ${intent.examples.slice(0, 3).join(', ')})`
      ).join('\n');

      const systemPrompt = `You are analyzing a sales conversation. Determine which intent best matches what the sales agent just said.

Available intents for this stage:
${intentOptions}

Respond with ONLY the intent ID (e.g., "asks_desired_outcome") or "default" if none match.`;

      const recentHistory = conversationHistory.slice(-5).map(turn => 
        `${turn.speaker === 'user' ? 'Agent' : 'Prospect'}: ${turn.text}`
      ).join('\n');

      const openaiClient = getOpenAI();
      if (!openaiClient) {
        return 'default';
      }

      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversation:\n${recentHistory}\n\nAgent: ${userMessage}\n\nWhich intent?` },
        ],
        temperature: 0.3, // Lower temperature for more consistent intent detection
        max_tokens: 50,
      });

      const detectedIntent = completion.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate the intent exists
      if (detectedIntent && currentNode.expectedIntents.some(i => i.id === detectedIntent)) {
        return detectedIntent;
      }

      return 'default';
    } catch (error) {
      console.error('Error detecting intent with AI:', error);
      return 'default';
    }
  }
}

