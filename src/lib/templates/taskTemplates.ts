/**
 * Task templates for creating structured educational tasks
 * Supports placeholder replacement: {topic}, {timeEstimate}
 */

export interface TaskTemplate {
  title: string
  instructions: string
  steps: string[]
  differentiation: {
    easier: string
    standard: string
    stretch: string
  }
  successCriteria: string[]
}

function replacePlaceholders(text: string, topic: string, timeEstimate: string): string {
  return text
    .replace(/{topic}/g, topic || 'the topic')
    .replace(/{timeEstimate}/g, timeEstimate || 'the estimated time')
}

export const taskTemplates: Record<string, TaskTemplate> = {
  'reading-comprehension': {
    title: 'Reading Comprehension: {topic}',
    instructions: 'Read the provided text about {topic} carefully. Your goal is to understand the main ideas, identify key details, and make connections to what you already know.',
    steps: [
      'Read through the text once to get an overview',
      'Identify the main idea and supporting details',
      'Note any unfamiliar words or concepts',
      'Answer the comprehension questions',
      'Reflect on how this connects to your prior knowledge'
    ],
    differentiation: {
      easier: 'Focus on identifying the main idea and 2-3 key details. Use simpler vocabulary in your responses.',
      standard: 'Identify main ideas, supporting details, and make at least one connection to prior knowledge.',
      stretch: 'Analyze the text structure, evaluate the author\'s purpose, and make multiple connections to broader themes.'
    },
    successCriteria: [
      'Accurately identify the main idea',
      'Extract relevant supporting details',
      'Demonstrate understanding through clear responses',
      'Make connections to prior knowledge or experiences'
    ]
  },
  'vocabulary-communication': {
    title: 'Vocabulary & Communication: {topic}',
    instructions: 'Explore vocabulary related to {topic} and practice using these words in meaningful communication. This task helps build your language skills for real-world situations.',
    steps: [
      'Review the vocabulary list provided',
      'Practice pronouncing and understanding each word',
      'Use each word in a sentence that shows you understand its meaning',
      'Create a short dialogue or paragraph using at least 5 vocabulary words',
      'Reflect on how you might use these words in everyday situations'
    ],
    differentiation: {
      easier: 'Focus on understanding and using 5-7 key words. Use simple sentence structures.',
      standard: 'Use 8-10 vocabulary words in varied sentence structures. Show understanding of word relationships.',
      stretch: 'Use all vocabulary words creatively, demonstrate nuanced understanding, and explore word relationships and etymology.'
    },
    successCriteria: [
      'Correctly use vocabulary words in context',
      'Demonstrate understanding of word meanings',
      'Create coherent sentences or dialogue',
      'Show ability to apply vocabulary in practical situations'
    ]
  },
  'functional-math': {
    title: 'Functional Math: {topic}',
    instructions: 'Apply mathematical concepts to solve real-world problems related to {topic}. This task focuses on practical numeracy skills you can use in daily life.',
    steps: [
      'Read the problem carefully and identify what information is given',
      'Determine what you need to find or calculate',
      'Choose an appropriate strategy or method',
      'Show your work step by step',
      'Check your answer for reasonableness',
      'Reflect on how this skill applies to real situations'
    ],
    differentiation: {
      easier: 'Work with simpler numbers and one-step problems. Use visual aids or manipulatives if helpful.',
      standard: 'Solve multi-step problems with clear reasoning. Show all work and explain your process.',
      stretch: 'Tackle complex problems, explore multiple solution methods, and explain why your approach works.'
    },
    successCriteria: [
      'Identify the problem correctly',
      'Use appropriate mathematical strategies',
      'Show clear, organized work',
      'Arrive at a correct answer',
      'Demonstrate understanding of the real-world application'
    ]
  },
  'creative-writing': {
    title: 'Creative Writing: {topic}',
    instructions: 'Express your thoughts and creativity through writing about {topic}. Use your imagination while also applying the writing skills we\'ve been practicing.',
    steps: [
      'Brainstorm ideas related to {topic}',
      'Plan your structure (beginning, middle, end)',
      'Write a first draft focusing on getting your ideas down',
      'Revise for clarity, detail, and engagement',
      'Edit for grammar, spelling, and punctuation',
      'Share or reflect on your completed piece'
    ],
    differentiation: {
      easier: 'Write a shorter piece (1-2 paragraphs) focusing on clear expression of ideas. Use simple sentence structures.',
      standard: 'Write a well-structured piece (3-4 paragraphs) with clear beginning, middle, and end. Include descriptive details.',
      stretch: 'Write a longer, more sophisticated piece with varied sentence structures, rich vocabulary, and creative techniques.'
    },
    successCriteria: [
      'Express ideas clearly and creatively',
      'Use appropriate structure and organization',
      'Include relevant details and descriptions',
      'Demonstrate basic writing conventions (grammar, spelling)',
      'Show personal voice and engagement with the topic'
    ]
  },
  'life-skills': {
    title: 'Life Skills: {topic}',
    instructions: 'Practice essential life skills related to {topic}. This task helps you develop practical abilities for independence and success in daily life.',
    steps: [
      'Review the skill or concept being taught',
      'Watch or read any provided examples or demonstrations',
      'Practice the skill yourself (or plan how you would practice it)',
      'Reflect on challenges you encountered',
      'Identify situations where you could use this skill',
      'Create a plan for continuing to develop this skill'
    ],
    differentiation: {
      easier: 'Focus on understanding the basic steps. Practice with guidance or simplified scenarios.',
      standard: 'Practice the skill independently and identify when and how to apply it in real situations.',
      stretch: 'Master the skill, adapt it to different contexts, and help others learn it.'
    },
    successCriteria: [
      'Understand the key steps or concepts',
      'Demonstrate or explain the skill',
      'Identify real-world applications',
      'Reflect on learning and challenges',
      'Show readiness to apply the skill independently'
    ]
  },
  'reflection-planning': {
    title: 'Reflection & Planning: {topic}',
    instructions: 'Take time to reflect on {topic} and create a plan for moving forward. This task helps you develop self-awareness and goal-setting skills.',
    steps: [
      'Reflect on your current situation or progress related to {topic}',
      'Identify what has gone well and what challenges you\'ve faced',
      'Consider what you\'ve learned about yourself',
      'Set specific, achievable goals for the future',
      'Break down your goals into actionable steps',
      'Identify resources or support you might need'
    ],
    differentiation: {
      easier: 'Focus on simple reflection questions. Set 1-2 basic goals with support.',
      standard: 'Engage in thoughtful reflection and set 2-3 specific goals with clear steps.',
      stretch: 'Deep reflection with self-awareness, set multiple goals with detailed action plans, and consider long-term implications.'
    },
    successCriteria: [
      'Demonstrate honest self-reflection',
      'Identify both strengths and areas for growth',
      'Set realistic, specific goals',
      'Create actionable steps toward goals',
      'Show awareness of resources and support needed'
    ]
  }
}

/**
 * Get a template by key and replace placeholders
 */
export function getTemplate(
  templateKey: string,
  topic: string = '',
  timeEstimate: string = ''
): TaskTemplate | null {
  const template = taskTemplates[templateKey]
  if (!template) return null

  return {
    title: replacePlaceholders(template.title, topic, timeEstimate),
    instructions: replacePlaceholders(template.instructions, topic, timeEstimate),
    steps: template.steps.map(step => replacePlaceholders(step, topic, timeEstimate)),
    differentiation: {
      easier: replacePlaceholders(template.differentiation.easier, topic, timeEstimate),
      standard: replacePlaceholders(template.differentiation.standard, topic, timeEstimate),
      stretch: replacePlaceholders(template.differentiation.stretch, topic, timeEstimate),
    },
    successCriteria: template.successCriteria.map(criteria => replacePlaceholders(criteria, topic, timeEstimate)),
  }
}

/**
 * Get all available template keys
 */
export function getTemplateKeys(): string[] {
  return Object.keys(taskTemplates)
}

/**
 * Get template display name
 */
export function getTemplateDisplayName(key: string): string {
  const names: Record<string, string> = {
    'reading-comprehension': 'Reading Comprehension',
    'vocabulary-communication': 'Vocabulary & Communication',
    'functional-math': 'Functional Math / Numeracy',
    'creative-writing': 'Creative Writing / Expression',
    'life-skills': 'Life Skills / Real-World Task',
    'reflection-planning': 'Reflection & Planning',
  }
  return names[key] || key
}

