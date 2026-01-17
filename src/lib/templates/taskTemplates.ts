export interface TaskTemplate {
  id: string
  name: string
  description: string
  subject: string
  title: string
  instructions: string
  steps: string[]
  differentiation: {
    easier: string
    standard: string
    stretch: string
  }
  successCriteria: string[]
  estimatedTime: string
  targetSkill?: 'digital_safety' | 'search_information' | 'communication' | 'productivity' | 'ai_literacy'
  targetLevel?: 'beginner' | 'developing' | 'confident'
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'research-project',
    name: 'Research Project',
    description: 'A structured research task with clear steps and differentiation',
    subject: 'Research Skills',
    title: 'Research Project: Exploring a Topic',
    instructions: 'Complete a research project on a topic of your choice. Follow the steps below to gather information, analyze sources, and present your findings.',
    steps: [
      'Choose a topic that interests you',
      'Identify 3-5 reliable sources (websites, books, articles)',
      'Take notes on key information from each source',
      'Organize your findings into main points',
      'Create a summary or presentation of your research',
      'Cite your sources properly'
    ],
    differentiation: {
      easier: 'Focus on 2-3 sources. Use simple note-taking format. Create a short paragraph summary.',
      standard: 'Use 3-5 sources. Take detailed notes. Create a structured summary with main points.',
      stretch: 'Use 5+ sources including academic sources. Create a detailed report with analysis and critical thinking.'
    },
    successCriteria: [
      'Selected appropriate and reliable sources',
      'Gathered relevant information',
      'Organized findings clearly',
      'Properly cited sources',
      'Demonstrated understanding of the topic'
    ],
    estimatedTime: '2-3 hours',
    targetSkill: 'search_information',
    targetLevel: 'developing'
  },
  {
    id: 'digital-presentation',
    name: 'Digital Presentation',
    description: 'Create a presentation using digital tools',
    subject: 'Digital Skills',
    title: 'Create a Digital Presentation',
    instructions: 'Create a presentation on a topic you\'ve learned about. Use digital tools to make it engaging and informative.',
    steps: [
      'Choose your presentation topic',
      'Plan your slides (title, content, conclusion)',
      'Create slides using presentation software',
      'Add images, charts, or diagrams',
      'Practice your presentation',
      'Present to your class or record a video'
    ],
    differentiation: {
      easier: 'Create 3-5 simple slides with text and images. Focus on clear communication.',
      standard: 'Create 5-8 slides with multimedia elements. Include transitions and design elements.',
      stretch: 'Create 8+ slides with advanced features, animations, and interactive elements.'
    },
    successCriteria: [
      'Clear and organized content',
      'Appropriate use of visuals',
      'Engaging presentation style',
      'Good time management',
      'Effective communication'
    ],
    estimatedTime: '1-2 hours',
    targetSkill: 'productivity',
    targetLevel: 'confident'
  },
  {
    id: 'online-safety-guide',
    name: 'Online Safety Guide',
    description: 'Create a guide about staying safe online',
    subject: 'Digital Safety',
    title: 'Online Safety Guide',
    instructions: 'Create a guide that helps others stay safe online. Include tips, examples, and best practices for digital safety.',
    steps: [
      'Research online safety topics (passwords, privacy, cyberbullying)',
      'Identify 5-7 key safety tips',
      'Create examples of safe and unsafe online behavior',
      'Design your guide (poster, document, or presentation)',
      'Include visual elements to make it engaging',
      'Share your guide with classmates'
    ],
    differentiation: {
      easier: 'Focus on 3-5 basic safety tips. Use simple language and clear examples.',
      standard: 'Include 5-7 safety tips with explanations. Add examples and visuals.',
      stretch: 'Create a comprehensive guide with advanced topics, real-world scenarios, and actionable advice.'
    },
    successCriteria: [
      'Accurate safety information',
      'Clear and understandable language',
      'Practical examples',
      'Engaging design',
      'Helpful for others'
    ],
    estimatedTime: '1-2 hours',
    targetSkill: 'digital_safety',
    targetLevel: 'beginner'
  },
  {
    id: 'email-communication',
    name: 'Professional Email',
    description: 'Practice writing professional emails',
    subject: 'Communication',
    title: 'Write a Professional Email',
    instructions: 'Practice writing professional emails by composing messages for different scenarios. Focus on clear communication and appropriate tone.',
    steps: [
      'Choose a scenario (requesting information, following up, introducing yourself)',
      'Plan your email structure (greeting, body, closing)',
      'Write a clear subject line',
      'Compose your email with appropriate tone',
      'Proofread for grammar and clarity',
      'Send or share your email draft'
    ],
    differentiation: {
      easier: 'Write 1-2 simple emails with basic structure. Focus on clear communication.',
      standard: 'Write 2-3 emails for different scenarios. Use appropriate tone and formatting.',
      stretch: 'Write 3+ emails for various professional scenarios. Demonstrate advanced communication skills.'
    },
    successCriteria: [
      'Clear subject line',
      'Appropriate greeting and closing',
      'Well-structured content',
      'Professional tone',
      'Correct grammar and spelling'
    ],
    estimatedTime: '30-45 minutes',
    targetSkill: 'communication',
    targetLevel: 'developing'
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    description: 'Analyze data and create visualizations',
    subject: 'Data Skills',
    title: 'Data Analysis Project',
    instructions: 'Collect or use provided data, analyze it, and create visualizations to show your findings. Practice using spreadsheets or data tools.',
    steps: [
      'Identify a question or topic to explore with data',
      'Collect or gather relevant data',
      'Organize data in a spreadsheet',
      'Analyze patterns and trends',
      'Create charts or graphs to visualize findings',
      'Write a summary of your analysis'
    ],
    differentiation: {
      easier: 'Use provided data. Create 1-2 simple charts. Write a brief summary.',
      standard: 'Collect or use data. Create 2-3 different visualizations. Write a detailed summary.',
      stretch: 'Collect your own data. Create multiple advanced visualizations. Write an in-depth analysis with insights.'
    },
    successCriteria: [
      'Relevant data collected',
      'Data organized clearly',
      'Appropriate visualizations',
      'Clear analysis',
      'Insightful conclusions'
    ],
    estimatedTime: '2-3 hours',
    targetSkill: 'productivity',
    targetLevel: 'confident'
  },
  {
    id: 'ai-tool-exploration',
    name: 'AI Tool Exploration',
    description: 'Explore and evaluate AI tools responsibly',
    subject: 'AI Literacy',
    title: 'Exploring AI Tools Responsibly',
    instructions: 'Explore an AI tool (like ChatGPT, image generators, or coding assistants). Learn how to use it effectively and ethically.',
    steps: [
      'Choose an AI tool to explore',
      'Research how the tool works and its capabilities',
      'Try using the tool for a specific task',
      'Evaluate the results (accuracy, usefulness, limitations)',
      'Reflect on ethical considerations',
      'Create a guide or summary of your findings'
    ],
    differentiation: {
      easier: 'Explore one AI tool. Try basic features. Write a simple summary.',
      standard: 'Explore an AI tool in depth. Try multiple features. Write a detailed evaluation.',
      stretch: 'Compare multiple AI tools. Analyze strengths and weaknesses. Create a comprehensive guide with ethical considerations.'
    },
    successCriteria: [
      'Understanding of how the tool works',
      'Effective use of tool features',
      'Critical evaluation of results',
      'Awareness of limitations',
      'Ethical considerations discussed'
    ],
    estimatedTime: '1-2 hours',
    targetSkill: 'ai_literacy',
    targetLevel: 'developing'
  },
  {
    id: 'collaborative-project',
    name: 'Collaborative Project',
    description: 'Work with others on a shared project',
    subject: 'Collaboration',
    title: 'Collaborative Project',
    instructions: 'Work with classmates on a shared project. Practice communication, task division, and collaboration using digital tools.',
    steps: [
      'Form a team and choose a project topic',
      'Plan the project and divide tasks',
      'Set up shared workspace (Google Docs, Trello, etc.)',
      'Complete individual tasks',
      'Review and combine team contributions',
      'Present or share the final project'
    ],
    differentiation: {
      easier: 'Work in pairs on a simple project. Use basic collaboration tools. Focus on clear communication.',
      standard: 'Work in a small team. Use multiple collaboration tools. Manage tasks and deadlines.',
      stretch: 'Lead or participate in a complex team project. Use advanced collaboration tools. Demonstrate leadership and coordination skills.'
    },
    successCriteria: [
      'Clear task division',
      'Effective communication',
      'Individual contributions',
      'Successful collaboration',
      'Quality final product'
    ],
    estimatedTime: '3-4 hours',
    targetSkill: 'communication',
    targetLevel: 'confident'
  },
  {
    id: 'reflection-journal',
    name: 'Reflection Journal',
    description: 'Reflect on learning and experiences',
    subject: 'Reflection',
    title: 'Learning Reflection Journal',
    instructions: 'Create a reflection journal documenting your learning journey. Reflect on what you\'ve learned, challenges faced, and growth achieved.',
    steps: [
      'Set up your journal (digital or paper)',
      'Reflect on recent learning experiences',
      'Write about what you learned',
      'Identify challenges and how you overcame them',
      'Set goals for future learning',
      'Review and update your journal regularly'
    ],
    differentiation: {
      easier: 'Write 2-3 short reflections. Focus on what you learned.',
      standard: 'Write 4-5 detailed reflections. Include challenges and goals.',
      stretch: 'Create a comprehensive journal with deep reflection, analysis, and long-term learning goals.'
    },
    successCriteria: [
      'Honest reflection',
      'Clear articulation of learning',
      'Identification of challenges',
      'Goal setting',
      'Regular updates'
    ],
    estimatedTime: '30 minutes per entry',
    targetSkill: 'communication',
    targetLevel: 'beginner'
  }
]

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesBySkill(skill?: string): TaskTemplate[] {
  if (!skill) return TASK_TEMPLATES
  return TASK_TEMPLATES.filter(t => t.targetSkill === skill)
}

/**
 * Get template by key (alias for getTemplateById for compatibility)
 * Optionally customize with subject and time estimate
 */
export function getTemplate(
  templateKey: string,
  subject?: string,
  timeEstimate?: string
): TaskTemplate | undefined {
  const template = getTemplateById(templateKey)
  if (!template) return undefined

  // Return template as-is, or create a customized copy if subject/time provided
  if (!subject && !timeEstimate) {
    return template
  }

  // Create a customized copy
  return {
    ...template,
    subject: subject || template.subject,
    estimatedTime: timeEstimate || template.estimatedTime,
    title: subject ? `${template.title} - ${subject}` : template.title,
  }
}

/**
 * Get all template keys (IDs)
 */
export function getTemplateKeys(): string[] {
  return TASK_TEMPLATES.map(t => t.id)
}

/**
 * Get display name for a template key
 */
export function getTemplateDisplayName(templateKey: string): string {
  const template = getTemplateById(templateKey)
  return template ? template.name : templateKey
}
